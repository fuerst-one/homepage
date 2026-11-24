import { INDEXNOW_KEY, INDEXNOW_KEY_PATH } from "@homepage/content/indexNow";

export const SITE_ORIGIN = "https://fuerst.one";
const ENDPOINT = "https://api.indexnow.org/indexnow";
const MAX_URLS_PER_REQUEST = 10_000;

export async function submitIndexNow(urls: string[], fetcher = fetch) {
  for (let start = 0; start < urls.length; start += MAX_URLS_PER_REQUEST) {
    const response = await fetcher(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: new URL(SITE_ORIGIN).host,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_ORIGIN}${INDEXNOW_KEY_PATH}`,
        urlList: urls.slice(start, start + MAX_URLS_PER_REQUEST),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`IndexNow rejected (${response.status})`);
  }
}
