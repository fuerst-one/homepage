import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const {
  readConnectionNavigation,
  writeConnectionNavigation,
  buildPerspectiveGraph,
  connectionFocus,
} = loadTs(
  new URL(
    "../apps/web/src/components/ExperienceAtlas/connectionExplorerState.ts",
    import.meta.url,
  ),
);
const { DEFAULT_CONNECTION_WEIGHTS } = loadTs(
  new URL(
    "../apps/web/src/components/ExperienceAtlas/connectionGraph.ts",
    import.meta.url,
  ),
);
const project = (id, ownership = "Owner") => ({
  id,
  label: id,
  matching: { buyerNeeds: [], domains: ["Automation"] },
  productTypes: ["Web app"],
  industries: [],
  tools: [],
  languages: [],
  capabilities: [],
  methods: [],
  ownership,
  projectType: "Independent",
  scale: { workingPattern: "Solo" },
});
const projects = [project("a"), project("b"), project("c", "Contributor")];
const space = {
  ids: ["a", "b", "c"],
  similarities: [
    [1, 0.8, 0.3],
    [0.8, 1, 0.2],
    [0.3, 0.2, 1],
  ],
  positions3d: [
    [0, 0, 0],
    [100, 0, 0],
    [1, 0, 0],
  ],
  excluded: [],
};
test("perspectives use full comparison scores, never positions, and retain disable controls", () => {
  const graph = buildPerspectiveGraph(
    projects,
    space,
    new Set(["a|c"]),
    "practice",
  );
  assert.deepEqual(
    graph.links.map((e) => [e.id, e.score]),
    [
      ["a|b", 0.8],
      ["b|c", 0.2],
    ],
  );
  assert.equal(graph.candidates.length, 3);
  assert.deepEqual(graph.links[0].shared.ownership, ["Owner"]);
  assert.equal(graph.links[1].shared.ownership.length, 0);
});
test("unmapped projects do not become disconnected outliers in a lens", () => {
  const graph = buildPerspectiveGraph(
    projects,
    {
      ...space,
      ids: ["a", "b"],
      similarities: [
        [1, 0.8],
        [0.8, 1],
      ],
    },
    new Set(),
    "product",
  );
  assert.deepEqual(graph.ids, ["a", "b"]);
  assert.ok(graph.links.every((e) => e.source !== "c" && e.target !== "c"));
});
test("shareable state round-trips manual weights, disabled links, lens and view", () => {
  const state = readConnectionNavigation(new URLSearchParams(), projects);
  Object.assign(state, {
    lens: "manual",
    model: "overlap",
    project: "b",
    mode: "bridges",
    view: "2d",
    labels: true,
    sector: "Software",
    fields: ["team"],
    disabled: ["a|b"],
    weights: { ...DEFAULT_CONNECTION_WEIGHTS, needs: 11.25 },
  });
  const url = writeConnectionNavigation(
    new URL("https://example.org/en/explorer?keep=1"),
    state,
  );
  assert.deepEqual(
    readConnectionNavigation(
      new URL(url, "https://example.org").searchParams,
      projects,
    ),
    state,
  );
  assert.equal(
    new URL(url, "https://example.org").searchParams.get("keep"),
    "1",
  );
});
test("invalid URL values cannot introduce unknown projects or oversized budgets", () => {
  const state = readConnectionNavigation(
    new URLSearchParams(
      "lens=oops&project=unknown&weights=900,-1,NaN&fields=nope&disabled=unknown%7Ca",
    ),
    projects,
  );
  assert.equal(state.lens, "product");
  assert.equal(state.project, "");
  assert.deepEqual(state.weights, DEFAULT_CONNECTION_WEIGHTS);
  assert.deepEqual(state.disabled, []);
});
test("focus picks actual active neighbours and one strongest bridge per other cluster", () => {
  const graph = buildPerspectiveGraph(projects, space, new Set(), "product");
  const groups = [
    { id: "ab", ids: ["a", "b"] },
    { id: "c", ids: ["c"] },
  ];
  assert.deepEqual(
    connectionFocus("a", "members", graph.links, groups).neighbours,
    ["b"],
  );
  assert.deepEqual(
    connectionFocus("a", "bridges", graph.links, groups).neighbours,
    ["c"],
  );
  assert.deepEqual(
    connectionFocus("a", "nearest", graph.links, groups).neighbours,
    ["b", "c"],
  );
  assert.deepEqual(connectionFocus("a", "nearest", [], groups).neighbours, []);
});
