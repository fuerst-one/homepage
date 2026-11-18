import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const {
  applicationKind,
  fingerprint,
  compareFingerprints,
  combinedSpace,
  overlapSignatures,
  BLOCKS,
  PRESETS,
} = loadTs(
  new URL(
    "../apps/web/src/components/ProjectLab/vectorSpaces.ts",
    import.meta.url,
  ),
);
const project = (id, tools = [], summary = "") => ({
  id,
  name: id,
  tools,
  languages: [],
  capabilities: [],
  methods: [],
  productTypes: [],
  targetMarket: [],
  workingPattern: "",
  matching: {
    buyerNeeds: [],
    domains: [],
    summary,
    aiUsage: [],
    aiCapabilities: [],
    stages: [],
    ownership: "",
    maintenance: "",
  },
});
const only = (block) =>
  Object.fromEntries(BLOCKS.map((b) => [b.id, b.id === block ? 1 : 0]));

test("canonical roles deduplicate aliases and give frameworks more budget than helpers", () => {
  const a = fingerprint(
    project("a", ["Next.js", "React.js", "GSAP", "Tailwind"]),
  );
  const b = fingerprint(
    project("b", ["Next", "React", "React.js", "Tailwind CSS"]),
  );
  const c = fingerprint(project("c", ["Laravel", "GSAP", "Tailwind"]));
  const architecture = compareFingerprints(a, b, only("architecture"));
  assert.equal(architecture.score, 1);
  assert.ok(
    compareFingerprints(a, b, PRESETS.technical).score >
      compareFingerprints(a, c, PRESETS.technical).score,
  );
  assert.equal(
    a.blocks.implementation.find((t) => t.label === "GSAP").amplitude,
    0.2,
  );
});

test("factual functions unify synonymous descriptions without reading names or marketing prose", () => {
  const a = fingerprint({
    ...project("a", [], "Spotify artwork editor with album-art export."),
    name: "unrelated name",
  });
  const b = fingerprint(
    project("b", [], "Spotify API integration visualizing playlist artists."),
  );
  assert.ok(compareFingerprints(a, b, only("functions")).score > 0.3);
  const c = fingerprint({
    ...project("c"),
    name: "Spotify playlist editor",
    description: "Spotify playlist editor",
  });
  assert.equal(c.blocks.functions.length, 0);
  assert.ok(a.blocks.functions.every((t) => t.source.includes("Summary")));
});

test("fixed budgets preserve unknowns, symmetry, bounds, zero-weight exclusion and filtering stability", () => {
  const a = fingerprint(project("a", ["Laravel"]));
  const b = fingerprint(project("b", ["Laravel"]));
  const missing = fingerprint(project("c"));
  const weights = { ...only("architecture"), languages: 1 };
  const ab = compareFingerprints(a, b, weights);
  assert.equal(ab.score, 0.5);
  assert.equal(ab.coverage, 0.5);
  assert.equal(compareFingerprints(b, a, weights).score, ab.score);
  assert.equal(compareFingerprints(a, missing, weights).score, null);
  assert.equal(compareFingerprints(a, b, only("functions")).score, null);
  const full = combinedSpace(
    [
      project("b", ["Laravel"]),
      project("c", ["React"]),
      project("a", ["Laravel"]),
    ],
    weights,
  );
  const small = combinedSpace(
    [project("a", ["Laravel"]), project("b", ["Laravel"])],
    weights,
  );
  assert.deepEqual(small.ids, ["a", "b"]);
  assert.equal(full.distances[0][1], small.distances[0][1]);
  assert.deepEqual(combinedSpace([project("a")], weights).excluded, ["a"]);
  assert.deepEqual(
    combinedSpace([project("a", ["Laravel"])], only("functions")).ids,
    [],
  );
  assert.equal(
    compareFingerprints(a, b, Object.fromEntries(BLOCKS.map((b) => [b.id, 0])))
      .score,
    null,
  );
  assert.ok(ab.parts.every((p) => p.contribution >= 0 && p.contribution <= 1));
});

test("overlap signatures form a disjoint partition, distinguish unknown and known disagreement", () => {
  const rows = [
    project("a", ["Laravel"]),
    project("b", ["Laravel"]),
    project("c", ["React"]),
    project("d"),
  ].map(fingerprint);
  const groups = overlapSignatures(rows, "a", ["architecture", "functions"]);
  assert.deepEqual(groups.flatMap((g) => g.ids).sort(), ["b", "c", "d"]);
  assert.equal(groups.find((g) => g.ids.includes("b")).states.join(""), "1?");
  assert.equal(groups.find((g) => g.ids.includes("c")).states.join(""), "0?");
  assert.equal(groups.find((g) => g.ids.includes("d")).states.join(""), "??");
});

test("current example pair becomes closer through general features, with additive receipts", () => {
  // Representative source facts, independent of the ignored private lab snapshot.
  const playlist = compareFingerprints(
    fingerprint(
      project(
        "analytics",
        ["Next.js", "React.js", "Tailwind", "Zustand", "Docker", "ECharts"],
        "Spotify API integration visualizing playlist artists, release dates and other metadata.",
      ),
    ),
    fingerprint(
      project(
        "editor",
        ["Next.js", "React.js", "Tailwind", "Zustand", "Docker", "Konva"],
        "Spotify artwork editor allowing drag, rotation, arrangement and export of album-art collages.",
      ),
    ),
    PRESETS.balanced,
  );
  const other = compareFingerprints(
    fingerprint(
      project(
        "game",
        ["Next.js", "React.js", "Tailwind", "Zustand", "PostgreSQL"],
        "German word puzzle built around a mandatory letter and six optional letters.",
      ),
    ),
    fingerprint(
      project(
        "planner",
        [
          "Next.js",
          "React.js",
          "Laravel",
          "Tailwind",
          "Zustand",
          "PostgreSQL",
          "DeckGL",
          "Mapbox",
          "Docker",
          "Yjs",
        ],
        "Collaborative map-based trip planner with generated trip ideas, day trips and editable itineraries.",
      ),
    ),
    PRESETS.balanced,
  );
  assert.ok(playlist.score > other.score);
  assert.ok(
    Math.abs(
      playlist.parts.reduce((sum, p) => sum + p.contribution, 0) -
        playlist.score,
    ) < 1e-10,
  );
  assert.ok(
    playlist.parts
      .find((p) => p.id === "functions")
      .shared.some((t) => t.label === "Spotify integration"),
  );
});

test("recorded app kind takes precedence over drafts, and blank labels fall back to factual summary", () => {
  const row = project(
    "a",
    [],
    "German word puzzle built around a mandatory letter.",
  );
  assert.equal(applicationKind(row).label, "Word puzzle");
  assert.equal(applicationKind(row).inferred, true);
  assert.equal(
    applicationKind({ ...row, shortDescription: "  Letter game  " }).label,
    "Letter game",
  );
  assert.equal(
    applicationKind({ ...row, shortDescription: "Letter game" }).inferred,
    false,
  );
  assert.equal(
    applicationKind({ ...row, shortDescription: "  " }).label,
    "Word puzzle",
  );
  assert.equal(applicationKind(project("unknown")).label, "Unclassified");
});

test("kind families connect distinct applications without erasing their specific subtype", () => {
  const a = fingerprint({
    ...project("a"),
    shortDescription: "Playlist analytics",
  });
  const b = fingerprint({
    ...project("b"),
    shortDescription: "Album-art collage editor",
  });
  const c = fingerprint({ ...project("c"), shortDescription: "Word puzzle" });
  assert.ok(compareFingerprints(a, b, only("kind")).score > 0);
  assert.equal(compareFingerprints(a, c, only("kind")).score, 0);
  assert.ok(
    compareFingerprints(a, a, only("kind")).score >
      compareFingerprints(a, b, only("kind")).score,
  );
});

test("programming languages preserve identity-bearing punctuation", () => {
  const a = fingerprint({ ...project("a"), languages: ["C++"] });
  const b = fingerprint({ ...project("b"), languages: ["C#"] });
  assert.equal(compareFingerprints(a, b, only("languages")).score, 0);
  assert.equal(
    fingerprint({ ...project("c"), languages: ["C", "C++", "C#"] }).blocks
      .languages.length,
    3,
  );
});

test("cluster coverage gate keeps sparse records out of forced technical groups", () => {
  const full = {
    ...project("framework", ["Laravel"], "Browser agent test automation"),
    capabilities: ["Frontend-Development"],
    methods: [],
  };
  const sparse = {
    ...project("methods"),
    capabilities: ["Frontend-Development"],
    methods: [],
  };
  assert.deepEqual(combinedSpace([full, sparse], PRESETS.technical, 0.5).ids, [
    "framework",
  ]);
  assert.deepEqual(
    combinedSpace([full, sparse], PRESETS.technical, 0.5).excluded,
    ["methods"],
  );
  assert.deepEqual(combinedSpace([full, sparse], PRESETS.technical, 0).ids, [
    "framework",
    "methods",
  ]);
});

test("owner short descriptions drive kind and functions independently of names", () => {
  const row = {
    ...project("a", [], "A word puzzle."),
    shortDescription: "Spotify Playlist Metadata Charts Web-App",
  };
  const fp = fingerprint(row);
  assert.equal(fp.kind.label, row.shortDescription);
  assert.equal(fp.kind.inferred, false);
  assert.equal(fp.kind.basis, "Notion Short Description");
  assert.ok(
    fp.blocks.functions.some(
      (f) =>
        f.label === "Spotify integration" &&
        f.source.includes("Short Description"),
    ),
  );
  assert.ok(fp.blocks.kind.some((f) => f.label === "Music applications"));
});
