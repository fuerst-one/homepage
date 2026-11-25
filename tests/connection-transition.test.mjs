import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const { blendConnectionLinks } = loadTs(
  new URL(
    "../apps/web/src/components/ExperienceAtlas/connectionTransitions.ts",
    import.meta.url,
  ),
);
const edge = (id, score) => ({
  id,
  source: id[0],
  target: id[1],
  score,
  shared: {},
});
test("preset changes fade existing, entering, and leaving forces together", () => {
  const from = [edge("ab", 0.8), edge("ac", 0.6)],
    to = [edge("ab", 0.2), edge("bc", 1)];
  assert.deepEqual(
    blendConnectionLinks(from, to, 0).map((e) => [e.id, e.score]),
    [
      ["ab", 0.8],
      ["ac", 0.6],
      ["bc", 0],
    ],
  );
  assert.deepEqual(
    blendConnectionLinks(from, to, 0.5).map((e) => [e.id, e.score]),
    [
      ["ab", 0.5],
      ["ac", 0.3],
      ["bc", 0.5],
    ],
  );
  assert.deepEqual(blendConnectionLinks(from, to, 1), to);
  assert.equal(from[0].score, 0.8);
});
test("an interrupted transition starts at the currently displayed strengths", () => {
  const midway = blendConnectionLinks([edge("ab", 1)], [edge("ac", 1)], 0.5);
  const next = blendConnectionLinks(midway, [edge("bc", 1)], 0);
  assert.deepEqual(
    next.map((e) => [e.id, e.score]),
    [
      ["ab", 0.5],
      ["ac", 0.5],
      ["bc", 0],
    ],
  );
});

const { createDepthTransition, applyDepthTransition } = loadTs(
  new URL(
    "../apps/web/src/components/ExperienceAtlas/connectionTransitions.ts",
    import.meta.url,
  ),
);
const point = (z) => ({ x: 8, y: 12, z, vx: 1, vy: 2, vz: 3 });
test("closing depth walls compress both sides without changing in-plane positions or identity", () => {
  const front = point(40),
    back = point(-20),
    middle = point(5);
  const points = new Map([
    ["front", front],
    ["back", back],
    ["middle", middle],
  ]);
  const transition = createDepthTransition(points, true, new Map());
  applyDepthTransition(points, transition, 0);
  assert.equal(front.z, 40);
  applyDepthTransition(points, transition, 0.5);
  assert.equal(front.z, 20);
  assert.equal(back.z, -20);
  assert.equal(middle.z, 5);
  assert.equal(front.vz, 0);
  applyDepthTransition(points, transition, 1);
  for (const p of points.values()) {
    assert.equal(p.z, 0);
    assert.equal(p.vz, 0);
    assert.deepEqual([p.x, p.y, p.vx, p.vy], [8, 12, 1, 2]);
  }
  assert.equal(points.get("front"), front);
});
test("reopening restores saved depth gradually and can reverse without a jump", () => {
  const points = new Map([
    ["a", point(0)],
    ["b", point(0)],
  ]);
  const saved = new Map([
    ["a", 40],
    ["b", -20],
  ]);
  const opening = createDepthTransition(points, false, saved);
  applyDepthTransition(points, opening, 0.5);
  assert.equal(points.get("a").z, 20);
  assert.equal(points.get("b").z, -10);
  const closing = createDepthTransition(points, true, saved);
  applyDepthTransition(points, closing, 0);
  assert.equal(points.get("a").z, 20);
  applyDepthTransition(points, closing, 1);
  const again = createDepthTransition(points, false, saved);
  applyDepthTransition(points, again, 1);
  assert.equal(points.get("a").z, 40);
  assert.equal(points.get("b").z, -20);
});
test("depth transitions handle empty data and skip a node being dragged", () => {
  const empty = new Map();
  applyDepthTransition(empty, createDepthTransition(empty, true, empty), 1);
  const held = point(30),
    points = new Map([["a", held]]);
  applyDepthTransition(
    points,
    createDepthTransition(points, true, empty),
    0.5,
    held,
  );
  assert.equal(held.z, 30);
});
