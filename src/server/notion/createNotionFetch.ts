/** Respect Notion's rate-limit backoff before the SDK treats the request as failed. */
export function createNotionFetch(
  fetchRequest: typeof fetch = fetch,
  wait: (ms: number) => Promise<void> = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms)),
): typeof fetch {
  return async (input, init) => {
    for (let attempt = 0; ; attempt++) {
      const response = await fetchRequest(input, init);
      if (response.status !== 429 || attempt >= 2) return response;
      const seconds = Number(response.headers.get("Retry-After") ?? 1);
      await response.body?.cancel();
      await wait(
        Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 1000,
      );
    }
  };
}
