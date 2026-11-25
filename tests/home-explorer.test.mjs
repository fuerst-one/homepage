import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const subject = loadTs(
  new URL(
    "../apps/web/src/components/ExperienceAtlas/projectPresentation.ts",
    import.meta.url,
  ),
);
const atlas = (id) => ({
  id,
  name: id,
  label: id,
  subtitle: "Snapshot copy",
  summary: "Snapshot summary",
  scale: { teamLow: 2, teamHigh: 5, internalNotes: "source-only" },
  screenshots: ["/old-image"],
  caseHref: "/old-case",
  related: [],
});
const published = (id, locale = "en") => ({
  id,
  name: id,
  contentLocale: locale,
  availableLocales: ["en", "de"],
  description: {
    rich_text: [
      {
        plain_text:
          locale === "de" ? "Aktuelle Beschreibung" : "Current description",
      },
    ],
  },
  screenshots: ["/current-image"],
  caseStudyIds: { en: null, de: null },
});
const space = (recipe) => ({
  recipe,
  ids: ["a", "unpublished", "b"],
  positions2d: [
    [1, 2],
    [3, 4],
    [5, 6],
  ],
  positions3d: [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
  ],
  similarities: [
    [1, 0.2, 0.3],
    [0.2, 1, 0.4],
    [0.3, 0.4, 1],
  ],
  groups: [
    {
      medoid: "unpublished",
      ids: ["a", "unpublished", "b"],
      terms: ["Old cluster"],
    },
  ],
  fieldTerms: {
    a: ["Public A"],
    unpublished: ["Removed term"],
    b: ["Public B"],
  },
  edges: [
    { a: "a", b: "unpublished", value: 0.2 },
    { a: "a", b: "b", value: 0.3 },
  ],
  excluded: [{ id: "unpublished", reason: "Missing field" }],
});
const snapshot = () => ({
  atlas: [atlas("a"), atlas("unpublished"), atlas("b")],
  semantic: {
    model: "cached-model",
    dimensions: 3,
    generatedAt: "2026-11-18",
    spaces: Object.fromEntries(
      ["product", "engineering", "practice"].map((recipe) => [
        recipe,
        space(recipe),
      ]),
    ),
  },
});

test("embedded and standalone Explorer use currently published projects and localized destinations", () => {
  assert.equal(typeof subject.publishedExplorerData, "function");
  const result = subject.publishedExplorerData(
    snapshot(),
    [published("b", "de"), published("a", "de")],
    "de",
  );
  assert.deepEqual(
    result.projects.map((p) => p.id),
    ["a", "b"],
  );
  assert.equal(
    result.projects[0].presentation.description,
    "Aktuelle Beschreibung",
  );
  assert.match(
    result.projects[0].presentation.projectHref,
    /^\/de\/projects\//,
  );
  assert.deepEqual(result.projects[0].screenshots, ["/current-image"]);
  assert.equal(result.projects[0].presentation.caseHref, null);
  assert.doesNotMatch(
    JSON.stringify(result),
    /unpublished|Removed term|source-only|old-image|old-case/,
  );
});

test("removing a published project keeps the cached positions and similarity matrix aligned", () => {
  assert.equal(typeof subject.publishedExplorerData, "function");
  const source = snapshot();
  const before = structuredClone(source);
  const { semanticData } = subject.publishedExplorerData(
    source,
    [published("a"), published("b")],
    "en",
  );
  for (const view of Object.values(semanticData.spaces)) {
    assert.deepEqual(view.ids, ["a", "b"]);
    assert.deepEqual(view.positions2d, [
      [1, 2],
      [5, 6],
    ]);
    assert.deepEqual(view.similarities, [
      [1, 0.3],
      [0.3, 1],
    ]);
    assert.deepEqual(view.edges, [{ a: "a", b: "b", value: 0.3 }]);
    assert.deepEqual(view.groups[0].ids, ["a", "b"]);
    assert.equal(view.groups[0].medoid, "a");
  }
  assert.deepEqual(source, before);
});

test("an empty publication produces an empty Explorer rather than a stale preview", () => {
  assert.equal(typeof subject.publishedExplorerData, "function");
  const result = subject.publishedExplorerData(snapshot(), [], "en");
  assert.deepEqual(result.projects, []);
  for (const view of Object.values(result.semanticData.spaces)) {
    assert.deepEqual(view.ids, []);
    assert.deepEqual(view.groups, []);
    assert.deepEqual(view.similarities, []);
  }
});

test("Explorer uses current published accent colors and clears stale snapshot colors", () => {
  const source = snapshot();
  source.atlas[0].presentation = { accentColor: "#FF0000" };
  source.atlas[2].presentation = { accentColor: "#00FF00" };
  const { projects } = subject.publishedExplorerData(
    source,
    [
      { ...published("a"), accentColor: "#2A9D8F" },
      { ...published("b"), accentColor: null },
    ],
    "en",
  );
  assert.equal(projects[0].presentation.accentColor, "#2A9D8F");
  assert.equal(projects[1].presentation.accentColor, null);
});
