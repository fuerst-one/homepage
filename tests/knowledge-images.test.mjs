import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

test("image generation returns validated detailed and concise variants together", () => {
  const { parseImageDescriptionVariants } = loadTs(
    new URL("../packages/knowledge/src/imagePolicy.ts", import.meta.url),
  );
  assert.equal(
    typeof parseImageDescriptionVariants,
    "function",
    "paired descriptions must be parsed and validated before caching",
  );
  const variants = {
    description: "An application screenshot showing a map and route controls.",
    altText: "Map with route controls",
  };
  assert.deepEqual(
    parseImageDescriptionVariants(JSON.stringify(variants)),
    variants,
  );
  for (const invalid of [
    "not json",
    JSON.stringify({ description: "A map" }),
    JSON.stringify({ ...variants, altText: " " }),
    JSON.stringify({ ...variants, description: "x".repeat(4001) }),
  ])
    assert.throws(
      () => parseImageDescriptionVariants(invalid),
      /Invalid image description/,
    );
});

test("an overlong generated alt is shortened automatically without changing the detailed description", () => {
  const { parseImageDescriptionVariants } = loadTs(
    new URL("../packages/knowledge/src/imagePolicy.ts", import.meta.url),
  );
  const description = "A detailed observation of a route planning interface.";
  for (const altText of [
    "Map with route controls, destination markers, a route summary panel, navigation controls, and additional information about the selected destination and the surrounding area.",
    "A B C D E F G H I J K L M N O P Q R S T U V W X Y Z",
  ]) {
    const result = parseImageDescriptionVariants(
      JSON.stringify({ description, altText }),
    );
    assert.equal(result.description, description);
    assert.ok(result.altText.length <= 160);
    assert.ok(result.altText.split(" ").length <= 25);
    assert.ok(result.altText.endsWith("…"));
    assert.ok(
      altText.startsWith(result.altText.slice(0, -1)),
      "shortening must retain complete leading words",
    );
  }
});
const { publishedKnowledgeDocuments } = loadTs(
  new URL("../apps/sync/src/knowledge/publicationSource.ts", import.meta.url),
);
const project = {
  id: "public",
  name: "A public project",
  availableLocales: ["en"],
  description: { rich_text: [{ plain_text: "Confirmed project facts" }] },
  tools: [],
  capabilities: [],
  industries: [],
  languages: [],
  clients: [],
  caseStudyIds: { en: "case", de: null },
  screenshots: ["/api/image/public/Screenshots?i=2"],
};
const publication = () => ({
  version: 3,
  locales: {
    en: {
      projects: [structuredClone(project)],
      studies: {
        case: [
          {
            id: "block",
            type: "image",
            imageUrl: "/api/projects/public/case-study/images/block?locale=en",
            richText: [],
            caption: [],
            children: [],
          },
        ],
      },
    },
    de: { projects: [], studies: {} },
  },
  assets: {
    "property:public:Screenshots:2": "asset-v1",
    "case:case:block": "case-v1",
    "property:hidden:Screenshots:0": "hidden",
  },
});
test("only published screenshot and linked case images become separate observation documents", () => {
  const docs = publishedKnowledgeDocuments(publication());
  const images = docs.filter((d) => d.image);
  assert.equal(images.length, 2);
  assert.equal(docs.filter((d) => !d.image).length, 1);
  assert.deepEqual(images.map((d) => d.image.assetId).sort(), [
    "asset-v1",
    "case-v1",
  ]);
  assert.ok(images.every((d) => d.locale === "en" && d.projectId === "public"));
  assert.ok(images.every((d) => !d.text.includes("Confirmed project facts")));
});
test("image version changes invalidate its document and removed images withdraw immediately", () => {
  const p = publication();
  const before = publishedKnowledgeDocuments(p).find(
    (d) => d.image?.assetId === "asset-v1",
  );
  assert.ok(before, "a published image must have its own document");
  p.assets["property:public:Screenshots:2"] = "asset-v2";
  const after = publishedKnowledgeDocuments(p).find(
    (d) => d.image?.assetId === "asset-v2",
  );
  assert.equal(after.id, before.id);
  assert.notEqual(after.hash, before.hash);
  p.locales.en.projects[0].screenshots = [];
  assert.ok(!publishedKnowledgeDocuments(p).some((d) => d.id === before.id));
});
test("unpublished paths, missing manifests and unavailable locales produce no image evidence", () => {
  const p = publication();
  p.locales.en.projects[0].screenshots.push(
    "https://private.invalid/image.png",
    "/api/image/hidden/Screenshots?i=0",
  );
  delete p.assets["property:public:Screenshots:2"];
  p.locales.de = {
    projects: [{ ...project, contentLocale: "en" }],
    studies: {},
  };
  assert.equal(publishedKnowledgeDocuments(p).filter((d) => d.image).length, 1);
});
const { validateKnowledgeAnswer } = loadTs(
  new URL("../packages/content/src/knowledge.ts", import.meta.url),
);
test("image citations keep observation provenance without turning it into project facts", () => {
  const source = {
    id: "s1",
    projectId: "public",
    title: "A public project — Image observation",
    href: "/en/projects/public",
    content: "A map is visible.",
    sourceKind: "image",
    imageHref: "/api/image/public/Screenshots?i=2",
  };
  const answer = validateKnowledgeAnswer(
    { answer: "The image shows a map.", sourceIds: ["s1"], actions: [] },
    [source],
    "en",
  );
  assert.equal(answer.sources[0].sourceKind, "image");
  assert.equal(answer.sources[0].imageHref, source.imageHref);
});

test("the first published screenshot uses the route's default index when no query is present", () => {
  const p = publication();
  p.locales.en.projects[0].screenshots.unshift("/api/image/public/Screenshots");
  p.assets["property:public:Screenshots:0"] = "first-asset";
  const image = publishedKnowledgeDocuments(p).find(
    (d) => d.image?.assetId === "first-asset",
  );
  assert.ok(image, "default-index screenshot must be indexed");
  assert.equal(image.image.href, "/api/image/public/Screenshots");
});
