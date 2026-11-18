import assert from "node:assert/strict";
import { test } from "node:test";
const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";
for (const locale of ["en", "de"]) {
  test(`${locale} cards separate name and purpose and reserve the modal trigger for images`, async () => {
    const response = await fetch(`${base}/${locale}/projects`, {
      signal: AbortSignal.timeout(60000),
    });
    assert.equal(response.status, 200);
    const html = await response.text();
    const path = `/${locale}/projects/roadtrippin`;
    const card = [...html.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/g)]
      .map(([x]) => x)
      .find((x) => x.includes(`href="${path}"`));
    assert.ok(card, "RoadTrippin is published in the featured list");
    const heading = card
      .match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/)?.[1]
      .replace(/<[^>]+>/g, "");
    assert.equal(heading, "RoadTrippin");
    assert.ok(card.includes("Collaborative Road Trip Planner"));
    const buttons = [
      ...card.matchAll(/<button\b[^>]*aria-label="([^"]+)"/g),
    ].map((x) => x[1]);
    assert.deepEqual(buttons, [
      locale === "de"
        ? "Bilder von RoadTrippin – Collaborative Road Trip Planner ansehen"
        : "View images for RoadTrippin – Collaborative Road Trip Planner",
    ]);
    assert.ok(
      card.includes(
        `aria-label="${locale === "de" ? "Projekt ansehen: RoadTrippin – Collaborative Road Trip Planner" : "View project: RoadTrippin – Collaborative Road Trip Planner"}"`,
      ),
    );
    assert.ok(card.includes(`href="${path}/case-study"`));
  });
}

for (const locale of ["en", "de"]) {
  test(`${locale} full project facts are a static section, not an outer disclosure`, async () => {
    const response = await fetch(
      `${base}/${locale}/projects/konfig-product-design-configurator`,
      { signal: AbortSignal.timeout(60000) },
    );
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /<section[^>]*aria-labelledby="project-facts-title"/);
    assert.match(html, /<h2[^>]*id="project-facts-title"/);
    assert.doesNotMatch(html, /<summary[^>]*>\s*(Project facts|Projektdaten)/);
  });
}
