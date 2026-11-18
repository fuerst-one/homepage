import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const { interpolateSpaceNodes } = loadTs(
  new URL(
    "../apps/web/src/components/ExperienceAtlas/spaceMotion.ts",
    import.meta.url,
  ),
);
const node = (id, point, color = "#000000") => ({
  id,
  point,
  color,
  opacity: 1,
});

test("a lens change follows project identity even when ordering changes", () => {
  const from = [node("a", [0, 0, 0]), node("b", [10, 0, 0])];
  const to = [node("b", [20, 10, 0]), node("a", [2, 4, 6], "#ffffff")];
  const frame = interpolateSpaceNodes(from, to, 0.5);
  assert.deepEqual(frame.find((n) => n.id === "a").point, [1, 2, 3]);
  assert.deepEqual(frame.find((n) => n.id === "b").point, [15, 5, 0]);
  assert.equal(frame.find((n) => n.id === "a").color, "#808080");
  assert.deepEqual(from[0].point, [0, 0, 0]);
});

test("filtered projects fade out and new projects fade in without inventing positions", () => {
  const from = [node("gone", [1, 2, 3])],
    to = [node("new", [4, 5, 6])];
  const half = interpolateSpaceNodes(from, to, 0.5);
  assert.equal(half.find((n) => n.id === "gone").opacity, 0.5);
  assert.equal(half.find((n) => n.id === "new").opacity, 0.5);
  assert.deepEqual(half.find((n) => n.id === "new").point, [4, 5, 6]);
  assert.deepEqual(interpolateSpaceNodes(from, to, 1), to);
});

test("interrupting a transition starts from its displayed frame", () => {
  const first = interpolateSpaceNodes(
    [node("a", [0, 0, 0])],
    [node("a", [8, 0, 0])],
    0.25,
  );
  const next = [node("a", [-6, 0, 0])];
  assert.deepEqual(interpolateSpaceNodes(first, next, 0)[0].point, [2, 0, 0]);
  assert.deepEqual(
    interpolateSpaceNodes(first, next, 0.5)[0].point,
    [-2, 0, 0],
  );
});
