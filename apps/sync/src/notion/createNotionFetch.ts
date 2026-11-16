import { postgresNotionGate, type NotionGate } from "./notionGate";

type Options = {
  gate?: NotionGate;
  now?: () => number;
  maxWaitMs?: number;
  jitter?: () => number;
};

/** Background reads can wait through a long cooldown without restarting the whole sync. */
export function createNotionReadFetch(fetchRequest: typeof fetch = fetch) {
  return createNotionFetch(fetchRequest, undefined, { maxWaitMs: 110_000 });
}

/** Bound request latency and coordinate admission/cooldowns across all instances. */
export function createNotionFetch(
  fetchRequest: typeof fetch = fetch,
  wait: (ms: number) => Promise<void> = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms)),
  options: Options = {},
): typeof fetch {
  const now = options.now ?? Date.now;
  const budget = options.maxWaitMs ?? 10_000;
  const jitter = options.jitter ?? (() => Math.random() * 250);
  return async (input, init) => {
    const gate = options.gate ?? postgresNotionGate();
    const deadline = now() + budget;
    for (let attempt = 0; ; attempt++) {
      for (;;) {
        init?.signal?.throwIfAborted();
        if (now() >= deadline)
          throw new Error("Notion backoff deadline exceeded");
        const delay = await gate.acquire();
        if (delay === 0) break;
        if (now() + delay >= deadline) throw new Error("Notion backoff active");
        await wait(delay);
      }
      const timeout = AbortSignal.timeout(
        Math.max(1, Math.min(10_000, Math.ceil(deadline - now()))),
      );
      const response = await fetchRequest(input, {
        ...init,
        signal: init?.signal
          ? AbortSignal.any([init.signal, timeout])
          : timeout,
      });
      if (![429, 529].includes(response.status)) return response;
      const body = await response
        .clone()
        .json()
        .catch(() => null);
      if (
        body?.additional_data?.rate_limit_reason ===
        "public_api_request_blocked"
      )
        return response;
      const seconds = Number(
        response.headers.get("Retry-After") ??
          body?.additional_data?.retry_after,
      );
      const delay =
        (Number.isFinite(seconds) && seconds > 0
          ? seconds * 1000
          : 1000 * 2 ** attempt) + jitter();
      await gate.defer(delay);
      console.warn("Notion cooldown", {
        status: response.status,
        retryAfterMs: Math.ceil(delay),
      });
      if (attempt >= 2 || now() + delay >= deadline) return response;
      await response.body?.cancel();
      await wait(delay);
    }
  };
}
