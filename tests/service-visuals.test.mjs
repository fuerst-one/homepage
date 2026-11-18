import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { selectServiceEvidence } = loadTs(
  new URL(
    "../apps/web/src/components/Services/serviceEvidence.ts",
    import.meta.url,
  ),
);
const konfig = "15b86514-f736-803e-b9b7-e47ebc2406d1";
const seabo = "153f6668-f4d6-490a-8345-0b999b35305a";
const road = "35486514-f736-803d-ae01-dc666a99d11c";
const flow = "35686514-f736-8019-921c-e5d8d77e7f23";
const hub = "41786514-f736-8074-8dcb-dd79f906d12a";
const make = (id, count = 6) => ({
  id,
  name: id,
  screenshots: Array.from(
    { length: count },
    (_, i) => `/images/${id}/${i + 1}`,
  ),
  tools: [],
  clients: [],
  projectType: "Hobby",
  kpis: { rich_text: [] },
  caseStudyIds: { en: "english-study", de: "german-study" },
  availableLocales: ["en", "de"],
});
const select = (projects, slug, options = {}) =>
  selectServiceEvidence(projects, slug, (p) => `/en/projects/${p.id}`, options);
const sources = (visuals) => visuals.map((v) => v.src);

test("interface cases show task-specific images while the hero keeps its overview", () => {
  const [k, s] = select([make(konfig), make(seabo)], "product-interfaces");
  assert.deepEqual(
    sources(k.visuals),
    [2, 3, 4].map((i) => `/images/${konfig}/${i}`),
  );
  assert.deepEqual(sources(k.heroVisuals), [`/images/${konfig}/1`]);
  assert.deepEqual(
    sources(s.visuals),
    [3, 4].map((i) => `/images/${seabo}/${i}`),
  );
});

test("trip generation precedes the editable map in the AI-products hero", () => {
  const [p] = select([make(road, 2)], "ai-products");
  assert.deepEqual(
    sources(p.heroVisuals),
    [2, 1].map((i) => `/images/${road}/${i}`),
  );
});

test("automation shows flow definitions and connected project work first", () => {
  const [f, h] = select([make(flow, 3), make(hub, 3)], "ai-automation");
  assert.deepEqual(
    sources(f.visuals),
    [3, 2].map((i) => `/images/${flow}/${i}`),
  );
  assert.deepEqual(
    sources(h.visuals),
    [2, 1].map((i) => `/images/${hub}/${i}`),
  );
});

test("starting offers use a single focused image per project", () => {
  const [k, s] = select([make(konfig), make(seabo)], "product-interfaces", {
    placement: "offer",
  });
  assert.deepEqual(sources(k.visuals), [`/images/${konfig}/2`]);
  assert.deepEqual(sources(s.visuals), [`/images/${seabo}/3`]);
  const [h] = select([make(hub, 3)], "ai-automation", { placement: "offer" });
  assert.deepEqual(sources(h.visuals), [`/images/${hub}/2`]);
});

test("unavailable preferred screenshots fall back without duplicates or invented URLs", () => {
  const [p] = select(
    [{ ...make(konfig), screenshots: ["/only", "", null] }],
    "product-interfaces",
  );
  assert.deepEqual(sources(p.visuals), ["/only"]);
  const [empty] = select(
    [{ ...make(konfig), screenshots: null }],
    "product-interfaces",
  );
  assert.deepEqual(empty.visuals, []);
  assert.deepEqual(select([], "ai-products"), []);
});

test("AI illustration is selected only from the linked localized public study", () => {
  const id = "41c86514-f736-8071-95f7-d3df9bf5f34e";
  const image = {
    id,
    type: "image",
    imageUrl: "/published",
    caption: [{ plain_text: "Synthetische Motive; keine echte Unterhaltung." }],
    children: [],
    privateField: "secret",
  };
  const [p] = select([make(konfig)], "ai-products", {
    locale: "de",
    studies: { "german-study": [{ children: [image] }] },
  });
  assert.equal(
    p.visuals[0].src,
    `/api/projects/${konfig}/case-study/images/${id}?locale=de`,
  );
  assert.equal(p.visuals[0].kind, "illustration");
  assert.match(p.visuals[0].caption, /Synthetische Motive/);
  assert.equal(p.visuals[1].src, `/images/${konfig}/6`);
  assert.ok(!JSON.stringify(p).includes("secret"));
  const [other] = select([make(konfig)], "ai-products", {
    locale: "de",
    studies: { "unrelated-study": [image] },
  });
  assert.equal(other.visuals[0].kind, "screenshot");
});

test("missing translated illustrations fall back to actual screenshots", () => {
  const en = {
    id: "41c86514-f736-801d-bdcb-c2d2c59fb1ab",
    type: "image",
    imageUrl: "/en-image",
    caption: [],
    children: [],
  };
  const [p] = select([make(konfig)], "ai-products", {
    locale: "de",
    studies: { "english-study": [en] },
  });
  assert.deepEqual(sources(p.visuals), [`/images/${konfig}/6`]);
});

test("an English-only project never emits an inaccessible German case-image URL", () => {
  const image = {
    id: "41c86514-f736-8071-95f7-d3df9bf5f34e",
    type: "image",
    imageUrl: "/de-image",
    caption: [],
    children: [],
  };
  const [p] = select(
    [{ ...make(konfig), availableLocales: ["en"] }],
    "ai-products",
    {
      locale: "de",
      studies: { "german-study": [image] },
    },
  );
  assert.ok(p.visuals.every((visual) => visual.kind === "screenshot"));
});
