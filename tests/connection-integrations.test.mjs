import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const base = new URL(
  "../apps/web/src/components/ExperienceAtlas/",
  import.meta.url,
);
const { readConnectionNavigation, writeConnectionNavigation } = loadTs(
  new URL("connectionExplorerState.ts", base),
);
const comparison = loadTs(new URL("connectionComparison.ts", base));
const { buildPerspectiveGraph } = loadTs(
  new URL("connectionExplorerState.ts", base),
);
const { buildConnectionGraph, DEFAULT_CONNECTION_WEIGHTS } = loadTs(
  new URL("connectionGraph.ts", base),
);
const projects = ["a", "b"].map((id) => ({
  id,
  label: id,
  matching: { buyerNeeds: [], domains: ["Planning"] },
  productTypes: ["App"],
  industries: [],
  tools: ["React"],
  languages: [],
  capabilities: [],
  methods: [],
  ownership: "",
  projectType: "",
}));
const space = {
  ids: ["a", "b"],
  similarities: [
    [1, 0.8],
    [0.8, 1],
  ],
};
test("presets always use calibrated similarity, including old overlap links", () => {
  for (const lens of ["product", "engineering", "practice", "scale"]) {
    for (const model of ["", "overlap", "similarity", "invalid"]) {
      const state = readConnectionNavigation(
        new URLSearchParams({ lens, model, project: "b" }),
        projects,
      );
      assert.equal(state.model, "similarity");
      assert.equal(state.lens, lens);
      assert.equal(state.project, "b");
    }
  }
});
test("Manual always uses slider overlap and shared links drop obsolete model overrides", () => {
  const state = readConnectionNavigation(
    new URLSearchParams(
      "lens=manual&model=similarity&weights=10,10,10,10,10,10,10",
    ),
    projects,
  );
  assert.equal(state.model, "overlap");
  assert.ok(Object.values(state.weights).every((weight) => weight === 10));
  const url = new URL(
    writeConnectionNavigation(
      new URL("https://example.org/en/explorer?model=overlap&keep=1"),
      state,
    ),
    "https://example.org",
  );
  assert.equal(url.searchParams.has("model"), false);
  assert.equal(url.searchParams.get("keep"), "1");
  assert.deepEqual(readConnectionNavigation(url.searchParams, projects), state);
  const preset = { ...state, lens: "engineering" };
  const next = new URL(writeConnectionNavigation(url, preset), url);
  assert.equal(
    readConnectionNavigation(next.searchParams, projects).model,
    "similarity",
  );
});
test("legacy network links open the flat force graph and preserve project selection", () => {
  const state = readConnectionNavigation(
    new URLSearchParams("project=a&lens=practice&view=network"),
    projects,
  );
  assert.equal(state.view, "2d");
  assert.equal(state.project, "a");
  assert.equal(state.lens, "practice");
});
test("full and compact integrations share exactly the calibrated graph, including disabled links", () => {
  assert.equal(typeof comparison.buildExplorerGraph, "function");
  const disabled = new Set(["a|b"]);
  const expected = comparison.calibratePerspectiveGraph(
    buildPerspectiveGraph(projects, space, disabled, "product"),
    buildConnectionGraph(projects, DEFAULT_CONNECTION_WEIGHTS, new Set()).links,
  );
  const actual = comparison.buildExplorerGraph(
    projects,
    space,
    "product",
    "similarity",
    DEFAULT_CONNECTION_WEIGHTS,
    [],
    disabled,
  );
  assert.deepEqual(actual, expected);
  assert.equal(actual.links.length, 0);
  assert.equal(actual.candidates.length, 1);
});
test("shared graph builder preserves Manual and handles a pending scale comparison", () => {
  assert.equal(typeof comparison.buildExplorerGraph, "function");
  assert.deepEqual(
    comparison.buildExplorerGraph(
      projects,
      undefined,
      "scale",
      "similarity",
      DEFAULT_CONNECTION_WEIGHTS,
      [],
      new Set(),
    ),
    { ids: [], links: [], candidates: [] },
  );
  const manual = comparison.buildExplorerGraph(
    projects,
    undefined,
    "manual",
    "similarity",
    DEFAULT_CONNECTION_WEIGHTS,
    [],
    new Set(),
  );
  assert.deepEqual(
    manual.links,
    buildConnectionGraph(projects, DEFAULT_CONNECTION_WEIGHTS, new Set()).links,
  );
  assert.deepEqual(manual.ids, ["a", "b"]);
});
