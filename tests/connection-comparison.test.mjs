import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const base = new URL(
  "../apps/web/src/components/ExperienceAtlas/",
  import.meta.url,
);
const { buildOverlapPerspective, calibratePerspectiveGraph } = loadTs(
  new URL("connectionComparison.ts", base),
);
const { buildConnectionGraph, CONNECTION_FIELDS } = loadTs(
  new URL("connectionGraph.ts", base),
);
const project = (id, overrides = {}) => ({
  id,
  label: id,
  matching: { buyerNeeds: [], domains: [] },
  productTypes: [],
  industries: [],
  tools: [],
  languages: [],
  capabilities: [],
  methods: [],
  ownership: "",
  projectType: "",
  scale: {},
  ...overrides,
});
const zero = Object.fromEntries(CONNECTION_FIELDS.map((f) => [f.id, 0]));
test("Engineering overlap is exactly Manual with the same field weights", () => {
  const projects = [
    project("a", { tools: ["React", "Vue"], languages: ["TypeScript"] }),
    project("b", { tools: ["react"], languages: ["TypeScript"] }),
    project("c", { tools: ["PHP"], languages: ["PHP"] }),
  ];
  const manual = buildConnectionGraph(
    projects,
    { ...zero, tools: 50, languages: 50 },
    new Set(),
  );
  const preset = buildOverlapPerspective(
    projects,
    projects.map((p) => p.id),
    "engineering",
    [],
    new Set(),
  );
  assert.deepEqual(preset.links, manual.links);
  assert.equal(preset.links[0].score, 0.75);
});
test("Product overlap uses shared use cases and formats without semantic background links", () => {
  const projects = [
    project("a", {
      matching: { buyerNeeds: [], domains: ["Travel"] },
      productTypes: ["App"],
    }),
    project("b", {
      matching: { buyerNeeds: [], domains: ["Travel", "Planning"] },
      productTypes: ["App"],
    }),
    project("c", { productTypes: ["Device"] }),
  ];
  const graph = buildOverlapPerspective(
    projects,
    ["a", "b", "c"],
    "product",
    [],
    new Set(),
  );
  assert.deepEqual(
    graph.links.map((e) => [e.id, e.score]),
    [["a|b", 0.75]],
  );
});
test("Contribution counts recorded category matches and overlapping team ranges", () => {
  const projects = [
    project("a", { ownership: "Owner", scale: { teamLow: 1, teamHigh: 3 } }),
    project("b", { ownership: "Owner", scale: { teamLow: 3, teamHigh: 5 } }),
    project("c"),
  ];
  const graph = buildOverlapPerspective(
    projects,
    ["a", "b", "c"],
    "practice",
    [],
    new Set(),
  );
  assert.equal(graph.links.length, 1);
  assert.ok(Math.abs(graph.links[0].score - 0.3) < 1e-10);
  assert.ok(graph.links[0].shared.team.length);
});
test("Scale does not count missing values as matching zeros or compare historical effort", () => {
  const projects = [
    project("a", {
      scale: {
        teamLow: 1,
        teamHigh: 3,
        effortLow: 2,
        effortHigh: 5,
        effortBasis: "rebuild-estimate",
      },
    }),
    project("b", {
      scale: {
        teamLow: 4,
        teamHigh: 5,
        effortLow: 2,
        effortHigh: 5,
        effortBasis: "historical-personal-effort",
      },
    }),
    project("c"),
  ];
  assert.deepEqual(
    buildOverlapPerspective(
      projects,
      ["a", "b", "c"],
      "scale",
      ["team", "effort"],
      new Set(),
    ).links,
    [],
  );
});
test("Scale uses relative code size, exact complexity, and respects comparable IDs and disabled edges", () => {
  const projects = [
    project("a", { scale: { codeSloc: 100, complexity: 2 } }),
    project("b", { scale: { codeSloc: 200, complexity: 2 } }),
    project("c", { scale: { codeSloc: 100, complexity: 2 } }),
  ];
  const graph = buildOverlapPerspective(
    projects,
    ["a", "b"],
    "scale",
    ["code", "complexity"],
    new Set(["a|b"]),
  );
  assert.deepEqual(graph.ids, ["a", "b"]);
  assert.equal(graph.candidates[0].score, 0.75);
  assert.equal(graph.links.length, 0);
  assert.deepEqual(
    buildOverlapPerspective(projects, ["a", "b"], "scale", [], new Set()).links,
    [],
  );
});
const edge = (id, score) => ({
  id,
  source: id[0],
  target: id[1],
  score,
  shared: {},
});
const pull = (edges) => edges.reduce((sum, e) => sum + e.score ** 2.75, 0);
test("Similarity calibration retains rank and positive connections while matching the reference pull", () => {
  const candidates = [edge("ab", 0.9), edge("ac", 0.7), edge("bc", 0.5)];
  const graph = { ids: ["a", "b", "c"], candidates, links: candidates };
  const reference = [edge("ab", 0.3), edge("ac", 0.1)];
  const calibrated = calibratePerspectiveGraph(graph, reference);
  assert.deepEqual(
    calibrated.links.map((e) => e.id),
    candidates.map((e) => e.id),
  );
  assert.ok(calibrated.links.every((e) => e.score > 0));
  assert.ok(Math.abs(pull(calibrated.links) - pull(reference)) < 1e-10);
  assert.ok(calibrated.links[0].score / calibrated.links[1].score > 0.9 / 0.7);
  assert.equal(calibrated.links[0].comparisonScore, 0.9);
  assert.equal(candidates[0].score, 0.9);
});
test("Disabling a calibrated connection does not strengthen remaining links", () => {
  const candidates = [edge("ab", 0.9), edge("ac", 0.7), edge("bc", 0.5)];
  const reference = [edge("ab", 0.3)];
  const full = calibratePerspectiveGraph(
    { ids: ["a", "b", "c"], candidates, links: candidates },
    reference,
  );
  const disabled = calibratePerspectiveGraph(
    { ids: ["a", "b", "c"], candidates, links: candidates.slice(1) },
    reference,
  );
  assert.deepEqual(disabled.links, full.links.slice(1));
});
test("Calibration stays finite for empty and all-identical models", () => {
  assert.deepEqual(
    calibratePerspectiveGraph({ ids: [], candidates: [], links: [] }, []).links,
    [],
  );
  const edges = [edge("ab", 1)];
  const graph = calibratePerspectiveGraph(
    { ids: ["a", "b"], candidates: edges, links: edges },
    [],
  );
  assert.ok(graph.links[0].score > 0 && graph.links[0].score <= 1);
});
