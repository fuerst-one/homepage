import assert from "node:assert/strict";
import { test } from "node:test";

const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";
const get = async (path) => {
  const response = await fetch(`${base}${path}`, {
    signal: AbortSignal.timeout(60000),
  });
  assert.equal(response.status, 200, path);
  return response.text();
};
const gallery = async (id) =>
  (await (await fetch(`${base}/api/projects/${id}`)).json()).screenshots.map(
    (url) => {
      const parsed = new URL(url, base);
      return parsed.pathname + parsed.search;
    },
  );
const sources = (html, id) =>
  [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)]
    .map((m) => m[1].replaceAll("&amp;", "&"))
    .filter((src) => src.startsWith(`/api/image/${id}/Screenshots`));
const konfig = "15b86514-f736-803e-b9b7-e47ebc2406d1";
const seabo = "153f6668-f4d6-490a-8345-0b999b35305a";
const road = "35486514-f736-803d-ae01-dc666a99d11c";
const hub = "41786514-f736-8074-8dcb-dd79f906d12a";

for (const locale of ["en", "de"]) {
  test(`${locale} AI products shows the trip-generation flow and labelled localized illustrations`, async () => {
    const html = await get(`/${locale}/services/ai-products`);
    const roadImages = await gallery(road);
    assert.deepEqual(sources(html, road).slice(0, 2), [
      roadImages[1],
      roadImages[0],
    ]);
    const block =
      locale === "en"
        ? "41c86514-f736-801d-bdcb-c2d2c59fb1ab"
        : "41c86514-f736-8071-95f7-d3df9bf5f34e";
    assert.ok(html.includes(`/case-study/images/${block}?locale=${locale}`));
    assert.match(
      html,
      locale === "en" ? /Conceptual illustration/ : /Konzeptillustration/,
    );
    assert.match(
      html,
      locale === "en"
        ? /Synthetic artwork and prompts/
        : /Synthetische Motive und Prompts/,
    );
    assert.match(html, locale === "en" ? /Next image/ : /Nächstes Bild/);
  });

  test(`${locale} interface cases add focused galleries after the unchanged hero`, async () => {
    const html = await get(`/${locale}/services/product-interfaces`);
    const k = await gallery(konfig);
    const s = await gallery(seabo);
    assert.deepEqual(sources(html, konfig), [k[0], k[1], k[2], k[3]]);
    assert.deepEqual(sources(html, seabo), [s[2], s[3]]);
    const offer = await get(`/${locale}/services/product-interfaces/review`);
    assert.deepEqual(sources(offer, konfig), [k[1]]);
    assert.deepEqual(sources(offer, seabo), [s[2]]);
    assert.doesNotMatch(offer, /aria-label="(?:Next image|Nächstes Bild)"/);
  });

  test(`${locale} automation leads with the connected workspace and keeps its offer compact`, async () => {
    const images = await gallery(hub);
    const html = await get(`/${locale}/services/ai-automation`);
    assert.deepEqual(sources(html, hub), [images[1], images[0]]);
    assert.match(html, locale === "en" ? /demo data/ : /Demo-Daten/);
    const offer = await get(`/${locale}/services/ai-automation/assessment`);
    assert.deepEqual(sources(offer, hub), [images[1]]);
  });
}
