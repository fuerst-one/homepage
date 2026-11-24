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
