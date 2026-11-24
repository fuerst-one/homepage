import { INDEXNOW_KEY, INDEXNOW_KEY_PATH } from "@homepage/content/indexNow";
import { sitemapEntries, type SitemapEntry } from "./sitemapEntries";
import { SITE_ORIGIN, submitIndexNow } from "./submitIndexNow";

export type IndexNowStore = {
  submitted(): Promise<Map<string, string | null>>;
  record(entries: SitemapEntry[]): Promise<void>;
};

/** The live sitemap is the only URL source, so content publishes and deploys are both covered. */
export async function syncIndexNow(store: IndexNowStore, fetcher = fetch) {
  const response = await fetcher(`${SITE_ORIGIN}/sitemap.xml`, {
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`sitemap unavailable (${response.status})`);
  const entries = sitemapEntries(await response.text());
  if (!entries.length) throw new Error("sitemap has no URLs");

  // Engines cache a failed key check, so a submission racing the web deploy
  // would get every later submission rejected.
  const key = await fetcher(`${SITE_ORIGIN}${INDEXNOW_KEY_PATH}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!key.ok || (await key.text()).trim() !== INDEXNOW_KEY)
    throw new Error("IndexNow key not served yet");

  const submitted = await store.submitted();
  const pending = entries.filter(
    ({ url, lastmod }) => !submitted.has(url) || submitted.get(url) !== lastmod,
  );
  if (!pending.length) return { submitted: 0 };

  await submitIndexNow(
    pending.map(({ url }) => url),
    fetcher,
  );
  await store.record(pending);
  return { submitted: pending.length };
}
