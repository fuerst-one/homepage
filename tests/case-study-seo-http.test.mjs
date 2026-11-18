import assert from "node:assert/strict";
import { test } from "node:test";

const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";
const origin = "https://fuerst.one";
const slug = "konfig-product-design-configurator";

for (const locale of ["en", "de"]) {
  test(`${locale} case study exposes article, author and breadcrumbs in the initial HTML`, async () => {
    const path = `/${locale}/projects/${slug}/case-study`;
    const response = await fetch(`${base}${path}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(60000),
    });
    assert.equal(response.status, 200);
    const html = await response.text();
    const graph = [
      ...html.matchAll(
        /<script type="application\/ld\+json">(.*?)<\/script>/gs,
      ),
    ].flatMap(([, data]) => JSON.parse(data)["@graph"] || []);
    const article = graph.find((node) => node["@type"] === "Article");
    const author = graph.find((node) => node["@type"] === "Person");
    const project = graph.find((node) => node["@type"] === "CreativeWork");
    const crumbs = graph.find((node) => node["@type"] === "BreadcrumbList");
    assert.ok(article, "Case study must identify the published article");
    assert.equal(article.url, `${origin}${path}`);
    assert.equal(article.mainEntityOfPage["@id"], `${origin}${path}`);
    assert.equal(article.inLanguage, locale);
    assert.equal(article.author["@id"], author["@id"]);
    assert.equal(article.about["@id"], project["@id"]);
    assert.equal(crumbs.itemListElement.at(-1).item, article.url);
    assert.deepEqual(
      crumbs.itemListElement.map((item) => item.position),
      [1, 2, 3, 4],
    );
    assert.match(html, /rel="author"/);
    assert.match(html, /property="og:type" content="article"/);
    assert.equal(article.datePublished, undefined);
    if (article.dateModified) {
      assert.ok(html.includes(`<time dateTime="${article.dateModified}">`));
      assert.ok(
        html.includes(
          `property="article:modified_time" content="${article.dateModified}"`,
        ),
      );
      const sitemap = await fetch(`${base}/sitemap.xml`).then((r) => r.text());
      const entry = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)]
        .map(([, entry]) => entry)
        .find((entry) => entry.includes(`<loc>${origin}${path}</loc>`));
      assert.ok(entry?.includes(`<lastmod>${article.dateModified}</lastmod>`));
    }
  });
}
