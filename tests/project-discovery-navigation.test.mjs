import assert from "node:assert/strict";
import { test } from "node:test";
const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";

for (const locale of ["en", "de"]) {
  const explorePath = `/${locale}/explorer`;
  for (const path of [
    "lab",
    "lab/projects",
    "lab/experience",
    "explorer/connections-next",
    "explorer/connections",
  ]) {
    test(`${locale} removed preview /${path} returns 404`, async () => {
      const response = await fetch(`${base}/${locale}/${path}`, {
        redirect: "manual",
        signal: AbortSignal.timeout(60000),
      });
      assert.equal(response.status, 404);
      assert.equal(response.headers.get("location"), null);
    });
  }
  test(`${locale} existing project page explains related work and keeps the case study`, async () => {
    const response = await fetch(
      `${base}/${locale}/projects/konfig-product-design-configurator`,
      { signal: AbortSignal.timeout(60000) },
    );
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(
      html.includes(
        `href="${explorePath}?project=15b86514-f736-803e-b9b7-e47ebc2406d1"`,
      ),
    );
    assert.ok(!html.includes('href="/en/lab/projects"'));
    assert.ok(html.includes('id="related-experience-title"'));
    assert.ok(html.includes('id="project-work-title"'));
    assert.ok(
      html.includes(
        `href="/${locale}/projects/playlist-canvas-spotify-album-art-collage-creator-web-app"`,
      ),
    );
    assert.ok(
      html.includes(
        `href="/${locale}/projects/konfig-product-design-configurator/case-study"`,
      ),
    );
    assert.ok(
      html.includes(
        locale === "de" ? "Was sich unterscheidet" : "What differs",
      ),
    );
    assert.ok(!html.includes("63% similar"));
  });
}

test("Seabo's published related-project link resolves to ORA", async () => {
  const response = await fetch(
    `${base}/en/projects/seabo-maritime-chartering-logistics-web-app`,
    { signal: AbortSignal.timeout(60000) },
  );
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes('aria-label="Explore project: ORA'));
  assert.ok(!html.includes('aria-label="Explore project: ROLLT'));
});
