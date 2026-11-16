import assert from "node:assert/strict";
import { test } from "node:test";

const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";
const slug = "konfig-product-design-configurator";
const get = async (path) => {
  const response = await fetch(`${base}${path}`, {
    signal: AbortSignal.timeout(60000),
  });
  assert.equal(response.status, 200);
  return response.text();
};

for (const locale of ["en", "de"]) {
  const path = `/${locale}/projects/${slug}`;
  const label = locale === "de" ? "Fallstudie lesen" : "Read case study";

  test(`${locale} project cards expose a direct public case study link`, async () => {
    const html = await get(`/${locale}/projects`);
    const card = [...html.matchAll(/<li\b[^>]*>[\s\S]*?<\/li>/g)]
      .map(([article]) => article)
      .find((article) => article.includes(`href="${path}"`));
    assert.ok(card, "Published project must be discoverable");
    assert.ok(card.includes(`href="${path}/case-study"`));
    assert.ok(card.includes(label));
  });

  test(`${locale} interactive project cards expose a direct public case study link`, async () => {
    const html = await get(`/${locale}/cv`);
    const card = [...html.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/g)]
      .map(([article]) => article)
      .find((article) => article.includes(`href="${path}"`));
    assert.ok(card, "Published project must be discoverable");
    assert.ok(card.includes(`href="${path}/case-study"`));
    assert.ok(card.includes(label));
  });

  test(`${locale} project details offer the case study after the description`, async () => {
    const html = await get(path);
    const caseLink = html.indexOf(`href="${path}/case-study"`);
    const websiteLink = html.indexOf(">Website");
    assert.ok(caseLink > 0, "Published case study must be linked");
    assert.ok(websiteLink > 0, "Fixture must expose a project website");
    assert.ok(
      caseLink > websiteLink,
      "Case study action follows the project description",
    );
    const metadataDetails = html.indexOf("<details");
    assert.ok(
      metadataDetails > caseLink,
      "Case study action precedes the detailed project metadata",
    );
    assert.ok(html.includes(label));
  });
}
