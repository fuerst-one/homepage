import assert from "node:assert/strict";
import { test } from "node:test";

const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";
const get = (path) =>
  fetch(`${base}${path}`, { signal: AbortSignal.timeout(60000) });
const ids = [
  "35486514-f736-803d-ae01-dc666a99d11c",
  "15b86514-f736-803e-b9b7-e47ebc2406d1",
  "11d86514-f736-80ed-935c-e6fe30b59d42",
  "35486514-f736-8020-bde8-e0f741a1a77a",
];

for (const locale of ["en", "de"]) {
  test(`${locale} AI-products page presents the four cases and carries its context to contact`, async () => {
    const path = `/${locale}/services/ai-products`;
    const response = await get(path);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, new RegExp(`<html[^>]*lang="${locale}"`));
    assert.ok(
      html.includes(`rel="canonical" href="https://fuerst.one${path}"`),
    );
    for (const lang of ["en", "de", "x-default"]) {
      assert.ok(
        html.includes(
          `hrefLang="${lang}" href="https://fuerst.one/${lang === "x-default" ? "en" : lang}/services/ai-products"`,
        ),
      );
    }
    assert.deepEqual(
      [...html.matchAll(/<article[^>]*id="case-([a-f0-9-]+)"/g)].map(
        (m) => m[1],
      ),
      ids,
    );
    for (const feature of [
      "RoadTrippin",
      "Konfig",
      "Conversion Y",
      "build-manager",
      "SVG",
      "mem0.one",
      "MVP",
    ])
      assert.ok(html.includes(feature), feature);
    assert.match(
      html,
      locale === "en" ? /duration suggestions/ : /Dauervorschläge/,
    );
    assert.match(
      html,
      locale === "en" ? /internal daily use/ : /täglich intern genutzt/,
    );
    assert.ok(
      html.includes(
        `/${locale}/contact?source=service&amp;service=ai-products&amp;intent=explore`,
      ),
    );
    assert.match(html, /href="mailto:alexander@fuerst\.one\?subject=/);
    assert.doesNotMatch(html, /50%|12 agents|10,000|10\.000/);
    const schemas = [
      ...html.matchAll(
        /<script type="application\/ld\+json">(.*?)<\/script>/gs,
      ),
    ].map((m) => JSON.parse(m[1]));
    const service = schemas.find((schema) => schema["@type"] === "Service");
    assert.equal(service?.url, `https://fuerst.one${path}`);
    assert.equal(service?.inLanguage, locale);
    for (const href of new Set(
      [...html.matchAll(/href="([^"?]*\/projects\/[^"?]+)"/g)].map((m) => m[1]),
    )) {
      assert.equal((await get(href)).status, 200, href);
    }
    const contact = await get(
      `/${locale}/contact?source=service&service=ai-products&intent=explore`,
    );
    assert.equal(contact.status, 200);
    assert.ok((await contact.text()).includes('id="enquiry-flow"'));
  });
}

test("AI products is discoverable without creating unsupported starting-offer URLs", async () => {
  for (const locale of ["en", "de"]) {
    const href = `/${locale}/services/ai-products`;
    const hire = await (await get(`/${locale}/hire`)).text();
    assert.ok(hire.includes(`href="${href}"`));
    const sitemap = await (await get("/sitemap.xml")).text();
    assert.ok(sitemap.includes(`<loc>https://fuerst.one${href}</loc>`));
    const llms = await (await get("/llms.txt")).text();
    assert.ok(llms.includes(`https://fuerst.one${href}`));
    assert.ok(!sitemap.includes(`${href}/assessment`));
    for (const product of ["assessment", "review", "unknown"])
      assert.equal((await get(`${href}/${product}`)).status, 404);
  }
});
