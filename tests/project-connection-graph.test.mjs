import assert from "node:assert/strict";
import test from "node:test";
import {
  buildConnectionGraph,
  DEFAULT_CONNECTION_WEIGHTS,
  CONNECTION_WEIGHT_BUDGET,
  redistributeConnectionWeight,
} from "../apps/web/src/components/ExperienceAtlas/connectionGraph.ts";
import {
  syncConnectionPoints,
  stepConnectionSimulation,
} from "../apps/web/src/components/ExperienceAtlas/connectionSimulation.ts";
const project = (id, fields = {}) => ({
  id,
  label: id,
  matching: { buyerNeeds: [], domains: [], stages: [] },
  productTypes: [],
  industries: [],
  tools: [],
  capabilities: [],
  methods: [],
  languages: [],
  ...fields,
});
const projects = [
  project("a", {
    matching: { buyerNeeds: ["Make data actionable"] },
    tools: ["React"],
  }),
  project("b", {
    matching: { buyerNeeds: ["Make data actionable"] },
    tools: ["Vue"],
  }),
  project("c", {
    matching: { buyerNeeds: ["Improve conversion"] },
    tools: ["React"],
  }),
  project("d"),
];
const emptyWeights = Object.fromEntries(
  Object.keys(DEFAULT_CONNECTION_WEIGHTS).map((key) => [key, 0]),
);

test("a dragged point stays pinned, pulls neighbours, and resumes moving on release", () => {
  const held = { x: -40, y: 10, z: 5, vx: 0, vy: 0, vz: 0 };
  const neighbour = { x: 40, y: 10, z: 5, vx: 0, vy: 0, vz: 0 };
  const points = new Map([
    ["held", held],
    ["neighbour", neighbour],
  ]);
  const links = [{ source: "held", target: "neighbour", score: 1 }];
  for (let i = 0; i < 20; i++)
    stepConnectionSimulation(points, links, 2.75, held);
  assert.deepEqual(held, { x: -40, y: 10, z: 5, vx: 0, vy: 0, vz: 0 });
  assert.ok(neighbour.x < 40);
  held.x = -60;
  stepConnectionSimulation(points, links, 2.75, held);
  assert.equal(held.x, -60);
  stepConnectionSimulation(points, links, 2.75);
  assert.ok(held.x > -60);
  assert.ok(held.x < -55, "release should not accumulate force while pinned");
});

test("weights below the budget do not change other fields", () => {
  const original = { ...emptyWeights, needs: 20, tools: 10 };
  const next = redistributeConnectionWeight(original, "needs", 30);
  assert.deepEqual(next, { ...original, needs: 30 });
  assert.equal(original.needs, 20);
});
test("overflow preserves the edited weight and scales others proportionally", () => {
  const next = redistributeConnectionWeight(
    { ...emptyWeights, needs: 40, tools: 30, industry: 10 },
    "needs",
    80,
  );
  assert.equal(next.needs, 80);
  assert.equal(next.tools, 15);
  assert.equal(next.industry, 5);
  assert.equal(
    Object.values(next).reduce((a, b) => a + b, 0),
    CONNECTION_WEIGHT_BUDGET,
  );
  assert.equal(next.languages, 0);
});
test("one field can consume the budget and zeroed fields can be reactivated", () => {
  const full = redistributeConnectionWeight(
    DEFAULT_CONNECTION_WEIGHTS,
    "needs",
    100,
  );
  assert.deepEqual(full, { ...emptyWeights, needs: 100 });
  assert.deepEqual(redistributeConnectionWeight(full, "tools", 25), {
    ...emptyWeights,
    needs: 75,
    tools: 25,
  });
  const lower = redistributeConnectionWeight(full, "needs", 10);
  assert.deepEqual(lower, { ...emptyWeights, needs: 10 });
});
test("all positive overlaps connect, however small, with no neighbour limit", () => {
  const group = Array.from({ length: 12 }, (_, i) =>
    project(String(i), { tools: ["React"] }),
  );
  const graph = buildConnectionGraph(
    group,
    { ...emptyWeights, tools: 0.001 },
    new Set(),
  );
  assert.equal(graph.links.length, 66);
  assert.ok(graph.links.every((edge) => edge.score > 0));
  assert.equal(
    buildConnectionGraph(group, emptyWeights, new Set()).links.length,
    0,
  );
});
test("absolute field weights determine strength and unrelated weights cannot inflate it", () => {
  const a = buildConnectionGraph(
    projects,
    { ...emptyWeights, needs: 20, tools: 10 },
    new Set(),
  );
  const b = buildConnectionGraph(
    projects,
    { ...emptyWeights, needs: 10, tools: 0 },
    new Set(),
  );
  assert.equal(a.links.find((edge) => edge.id === "a|b").score, 0.2);
  assert.equal(b.links.find((edge) => edge.id === "a|b").score, 0.1);
  assert.ok(!b.links.some((edge) => edge.id === "a|c"));
  assert.equal(b.nodes.length, 4);
});
test("manual pair switches remove only that pair", () => {
  const all = buildConnectionGraph(
    projects,
    DEFAULT_CONNECTION_WEIGHTS,
    new Set(),
  );
  const hidden = buildConnectionGraph(
    projects,
    DEFAULT_CONNECTION_WEIGHTS,
    new Set(["a|b"]),
  );
  assert.equal(hidden.links.length, all.links.length - 1);
  assert.ok(hidden.candidates.some((edge) => edge.id === "a|b"));
});
test("reconciling fresh node arrays retains existing positions and velocity", () => {
  const points = new Map();
  syncConnectionPoints(points, [{ id: "a" }, { id: "b" }]);
  const a = points.get("a");
  Object.assign(a, { x: 77, y: 12, z: -9, vx: 0.6 });
  syncConnectionPoints(points, [{ id: "b" }, { id: "a" }, { id: "c" }]);
  assert.strictEqual(points.get("a"), a);
  assert.equal(a.x, 77);
  assert.equal(a.vx, 0.6);
});
test("stronger overlap produces stronger pull and link changes keep positions continuous", () => {
  const make = () =>
    new Map([
      ["a", { x: -40, y: 0, z: 0, vx: 0, vy: 0, vz: 0 }],
      ["b", { x: 40, y: 0, z: 0, vx: 0, vy: 0, vz: 0 }],
    ]);
  const weak = make(),
    strong = make();
  stepConnectionSimulation(weak, [{ source: "a", target: "b", score: 0.1 }]);
  stepConnectionSimulation(strong, [{ source: "a", target: "b", score: 0.8 }]);
  assert.ok(strong.get("a").x > weak.get("a").x);
  const before = strong.get("a").x;
  stepConnectionSimulation(strong, []);
  assert.ok(Math.abs(strong.get("a").x - before) < 5);
});

test("cluster contrast separates groups despite multiple weak bridges", () => {
  const nodes = Array.from({ length: 12 }, (_, i) => ({ id: String(i) }));
  const links = nodes.flatMap((a, i) =>
    nodes.slice(i + 1).map((b) => ({
      source: a.id,
      target: b.id,
      score:
        Math.floor(Number(a.id) / 6) === Math.floor(Number(b.id) / 6)
          ? 0.65
          : 0.08,
    })),
  );
  const separation = (contrast) => {
    const points = new Map();
    syncConnectionPoints(points, nodes);
    for (let step = 0; step < 420; step++)
      stepConnectionSimulation(points, links, contrast);
    let inside = 0,
      outside = 0;
    for (const edge of links) {
      const a = points.get(edge.source),
        b = points.get(edge.target);
      const distance = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
      assert.ok(Number.isFinite(distance));
      if (edge.score === 0.65) inside += distance / 30;
      else outside += distance / 36;
    }
    return outside / inside;
  };
  assert.ok(separation(2) > separation(1) * 1.3);
  assert.equal(links.length, 66);
});
