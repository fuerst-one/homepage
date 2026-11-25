import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const base = new URL(
  "../apps/web/src/components/ExperienceAtlas/",
  import.meta.url,
);
const { calibratePerspectiveGraph } = loadTs(
  new URL("connectionComparison.ts", base),
);
const { syncConnectionPoints, stepConnectionSimulation } = loadTs(
  new URL("connectionSimulation.ts", base),
);
const { blendConnectionLinks } = loadTs(
  new URL("connectionTransitions.ts", base),
);
const edge = (a, b, score = 1) => ({
  id: `${a}|${b}`,
  source: a,
  target: b,
  score,
  shared: {},
});
const calibrate = (ids, edges, disabled = []) =>
  calibratePerspectiveGraph(
    {
      ids,
      candidates: edges,
      links: edges.filter((e) => !disabled.includes(e.id)),
    },
    [],
  );

test("dense similarity neighborhoods share a bounded per-project spring budget", () => {
  const ids = Array.from({ length: 40 }, (_, i) => String(i));
  const edges = ids.flatMap((id, i) =>
    ids.slice(i + 1).map((other) => edge(id, other)),
  );
  const graph = calibrate(ids, edges);
  const pull = graph.links
    .filter((e) => e.source === "0" || e.target === "0")
    .reduce((sum, e) => sum + e.springStrength, 0);
  const pair = calibrate(["a", "b"], [edge("a", "b")]);
  assert.ok(Number.isFinite(pull) && pull > 0);
  assert.ok(Math.abs(pull - pair.links[0].springStrength) < 1e-10);
});

test("disabled springs do not redistribute their budget to remaining connections", () => {
  const ids = ["a", "b", "c"],
    edges = [edge("a", "b"), edge("a", "c", 0.5)];
  const full = calibrate(ids, edges);
  const disabled = calibrate(ids, edges, ["a|b"]);
  assert.ok(full.links.every((e) => e.springStrength > 0));
  assert.deepEqual(disabled.links, full.links.slice(1));
});

test("adaptive spring forces fade continuously when switching to and from Manual", () => {
  const manual = [edge("a", "b", 0.8)];
  const adaptive = [{ ...manual[0], springStrength: 0.018 }];
  const start = blendConnectionLinks(manual, adaptive, 0)[0];
  const middle = blendConnectionLinks(manual, adaptive, 0.5)[0];
  assert.equal(start.springStrength, 0.048 * 0.8 ** 2.75);
  assert.ok(
    Math.abs(middle.springStrength - (start.springStrength + 0.018) / 2) <
      1e-12,
  );
  assert.equal(
    blendConnectionLinks(adaptive, [], 0.5)[0].springStrength,
    0.009,
  );
  assert.equal(
    blendConnectionLinks([middle], manual, 0)[0].springStrength,
    middle.springStrength,
  );
});

test("soft containment keeps disconnected projects nearby without inventing links", () => {
  const points = new Map();
  syncConnectionPoints(
    points,
    Array.from({ length: 49 }, (_, i) => ({ id: String(i) })),
  );
  const outlier = points.get("0");
  outlier.x = 300;
  outlier.y = outlier.z = 0;
  const links = [];
  for (let i = 0; i < 420; i++)
    stepConnectionSimulation(points, links, 2.75, null, 1);
  assert.equal(points.get("0"), outlier);
  assert.equal(links.length, 0);
  assert.ok(
    Math.max(...[...points.values()].map((p) => Math.hypot(p.x, p.y, p.z))) <
      90,
  );
});

test("containment respects a dragged project and recovers after release", () => {
  const point = { x: 300, y: 0, z: 0, vx: 2, vy: 0, vz: 0 };
  const points = new Map([["a", point]]);
  stepConnectionSimulation(points, [], 2.75, point, 1);
  assert.equal(point.x, 300);
  assert.equal(point.vx, 0);
  for (let i = 0; i < 420; i++)
    stepConnectionSimulation(points, [], 2.75, null, 1);
  assert.ok(Math.abs(point.x) < 90);
});
