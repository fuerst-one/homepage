import assert from "node:assert/strict";
import { test } from "node:test";

const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";
const origin = "https://fuerst.one";
const get = (path) =>
  fetch(`${base}${path}`, {
    redirect: "manual",
    signal: AbortSignal.timeout(60000),
  });

test("every sitemap URL and language alternative resolves directly to indexable canonical HTML", async () => {
  const response = await get("/sitemap.xml");
  assert.equal(response.status, 200);
  const xml = await response.text();
  const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(
    ([, entry]) => ({
      url: entry.match(/<loc>(.*?)<\/loc>/)?.[1],
      languages: Object.fromEntries(
        [...entry.matchAll(/<xhtml:link\s+([^>]+)\/?\s*>/g)].map(
          ([, attributes]) => [
            attributes.match(/hreflang="([^"]+)"/)?.[1],
            attributes.match(/href="([^"]+)"/)?.[1],
          ],
        ),
      ),
    }),
  );
  assert.ok(entries.length > 0);
  const urls = new Set(entries.map((entry) => entry.url));
  assert.equal(urls.size, entries.length, "Duplicate sitemap URLs");
  const pages = new Map();
  for (const { url } of entries) {
    assert.ok(url?.startsWith(`${origin}/`));
    const path = new URL(url).pathname;
    assert.match(path, /^\/(en|de)(\/|$)/);
    const page = await get(path);
    assert.equal(page.status, 200, `${path} must not redirect or fail`);
    assert.doesNotMatch(page.headers.get("x-robots-tag") || "", /noindex/i);
    const html = await page.text();
    const tags = html.match(/<(?:link|meta)\b[^>]*>/g) || [];
    const canonical = tags.find((tag) => /rel="canonical"/.test(tag));
    assert.ok(canonical?.includes(`href="${url}"`), `${path} canonical`);
    assert.match(html, new RegExp(`<html[^>]*lang="${path.split("/")[1]}"`));
    assert.ok(
      !tags.some(
        (tag) =>
          /name="(?:robots|googlebot)"/.test(tag) && /noindex/i.test(tag),
      ),
      `${path} must be indexable`,
    );
    pages.set(url, tags);
  }
  for (const { url, languages } of entries) {
    assert.equal(languages["x-default"], languages.en, `${url} fallback`);
    for (const [locale, target] of Object.entries(languages)) {
      assert.ok(urls.has(target), `${url}: ${locale} target must be published`);
      for (const counterpart of new Set(Object.values(languages))) {
        assert.ok(
          pages
            .get(counterpart)
            .some(
              (tag) =>
                /rel="alternate"/.test(tag) &&
                tag.includes(`hrefLang="${locale}"`) &&
                tag.includes(`href="${target}"`),
            ),
          `${counterpart} must link back to ${locale} ${target}`,
        );
      }
    }
  }
});
