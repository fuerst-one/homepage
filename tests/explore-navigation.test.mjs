import assert from "node:assert/strict";
import { test } from "node:test";
const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";
const query =
  "?project=15b86514-f736-803e-b9b7-e47ebc2406d1&lens=practice&view=2d";
for (const [locale, slug, title, author] of [
  ["en", "explorer", "Explorer", "Alexander Fuerst"],
  ["de", "explorer", "Explorer", "Alexander Fürst"],
]) {
  test(`${locale} Explorer is canonical, localized and linked to its selected project`, async () => {
    const response = await fetch(`${base}/${locale}/${slug}${query}`, {
      signal: AbortSignal.timeout(60000),
    });
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(
      html.includes(`<title>${title} — ${author} | FUERST.ONE</title>`),
    );
    assert.ok(html.includes(`href="https://fuerst.one/${locale}/${slug}"`));
    assert.ok(
      html.includes(
        `href="/${locale}/projects/konfig-product-design-configurator"`,
      ),
    );
    assert.ok(!html.includes('class="lab-site-navigation"'));
    assert.match(
      html,
      new RegExp(
        `<section[^>]+id="vs-inspector"[\\s\\S]*?<h2><a href="/${locale}/projects/konfig-product-design-configurator">Konfig`,
      ),
    );
    assert.ok(!html.includes('id="atlas-project-detail"'));
    assert.ok(!html.includes('id="atlas-related-title"'));
  });
  test(`${locale} project detail contains the three connected projects previously below Explorer`, async () => {
    const response = await fetch(
      `${base}/${locale}/projects/konfig-product-design-configurator`,
      {
        signal: AbortSignal.timeout(60000),
      },
    );
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes('id="explorer-connections-title"'));
    const prefix =
      locale === "de"
        ? "Verbundenes Projekt ansehen"
        : "View connected project";
    assert.equal(
      (html.match(new RegExp(`aria-label="${prefix}:`, "g")) ?? []).length,
      3,
    );
    for (const name of ["Conversion Y", "Bags’n Boxes Chatbot", "RoadTrippin"])
      assert.ok(html.includes(`aria-label="${prefix}: ${name}`));
  });
  for (const path of ["entdecken", "explore"]) {
    test(`${locale}/${path} keeps selections when redirecting to Explorer`, async () => {
      const response = await fetch(`${base}/${locale}/${path}${query}`, {
        redirect: "manual",
        signal: AbortSignal.timeout(60000),
      });
      const target = `/${locale}/${slug}${query}`;
      if (response.status === 307)
        assert.equal(response.headers.get("location"), target);
      else {
        assert.equal(response.status, 200);
        assert.ok(
          (await response.text()).includes(
            `content="1;url=${target.replaceAll("&", "&amp;")}"`,
          ),
        );
      }
    });
  }
}
