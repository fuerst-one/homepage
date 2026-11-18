import assert from "node:assert/strict";
import { test } from "node:test";
const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";
const query =
  "?project=15b86514-f736-803e-b9b7-e47ebc2406d1&lens=practice&view=2d";
for (const [locale, slug, title] of [
  ["en", "explore", "Explore"],
  ["de", "entdecken", "Entdecken"],
]) {
  test(`${locale} Explore is canonical, localized and linked to its selected project`, async () => {
    const response = await fetch(`${base}/${locale}/${slug}${query}`, {
      signal: AbortSignal.timeout(60000),
    });
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(
      html.includes(`<title>${title} — Alexander Fuerst | Fuerst.one</title>`),
    );
    assert.ok(html.includes(`href="https://fuerst.one/${locale}/${slug}"`));
    assert.ok(
      html.includes(
        `href="/${locale}/projects/konfig-product-design-configurator"`,
      ),
    );
    assert.ok(
      html.includes(locale === "de" ? "Zurück zur Gruppe" : "Back to cluster"),
    );
    assert.ok(!html.includes('class="lab-site-navigation"'));
  });
  for (const path of [
    "lab",
    "lab/experience",
    "lab/projects",
    locale === "en" ? "entdecken" : "explore",
  ]) {
    test(`${locale}/${path} keeps selections when redirecting to Explore`, async () => {
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
