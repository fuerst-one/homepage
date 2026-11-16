export type ServiceAvailability = {
  available: boolean;
  verified: boolean;
  retryAt: number;
};

async function bounded<T>(
  work: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error("Knowledge service deadline exceeded");
      controller.abort(error);
      reject(error);
    }, timeoutMs);
  });
  try {
    return await Promise.race([work(controller.signal), timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

/** This process can fail over even when the database used for quotas is down. */
export function createServiceCircuit({
  now = Date.now,
  requestTimeoutMs = 8000,
  probeTimeoutMs = 10_000,
  cooldownMs = 30_000,
  maxCooldownMs = 300_000,
  shouldTripProbe = () => true,
}: {
  now?: () => number;
  requestTimeoutMs?: number;
  probeTimeoutMs?: number;
  cooldownMs?: number;
  maxCooldownMs?: number;
  shouldTripProbe?: (error: unknown) => boolean;
} = {}) {
  let available = true;
  let verified = false;
  let retryAt = 0;
  let failures = 0;
  let generation = 0;
  let probing: Promise<void> | null = null;
  const trip = () => {
    available = false;
    verified = false;
    generation++;
    retryAt =
      now() +
      Math.min(maxCooldownMs, cooldownMs * 2 ** Math.min(failures++, 10));
  };
  return {
    status: (): ServiceAvailability => ({ available, verified, retryAt }),
    async run<T>(
      work: (signal: AbortSignal) => Promise<T>,
      fallback: () => T,
      shouldTrip: (error: unknown) => boolean = () => true,
    ): Promise<T> {
      if (!available) return fallback();
      const version = generation;
      try {
        const result = await bounded(work, requestTimeoutMs);
        if (version === generation) verified = true;
        return result;
      } catch (error) {
        if (shouldTrip(error)) trip();
        return fallback();
      }
    },
    async probe(
      check: (signal: AbortSignal) => Promise<unknown>,
      checkUnknown = false,
    ): Promise<void> {
      if (probing) return probing;
      if ((available && (verified || !checkUnknown)) || now() < retryAt) return;
      const version = generation;
      probing = (async () => {
        try {
          await bounded(check, probeTimeoutMs);
          if (version !== generation) return;
          available = true;
          verified = true;
          retryAt = 0;
          failures = 0;
        } catch (error) {
          if (shouldTripProbe(error)) trip();
          else retryAt = now() + cooldownMs;
        } finally {
          probing = null;
        }
      })();
      return probing;
    },
  };
}
