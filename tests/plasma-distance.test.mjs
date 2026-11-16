import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { getDistanceReaction } = loadTs(
  new URL(
    "../src/components/PlasmaLanding/getDistanceReaction.ts",
    import.meta.url,
  ),
);
const origin = { x: 50, y: 35 };
const bounds = { width: 100, height: 80 };
const reaction = (x, y = 35) =>
  getDistanceReaction({
    cursor: { x, y },
    origin,
    bounds,
    calmRadius: 12,
  });

test("brightness starts above the original level and stays steady in the center calm zone", () => {
  const center = reaction(50);
  assert.ok(center.brightness > 1 && center.brightness < 1.5);
  assert.deepEqual(reaction(61), center);
});

test("the plasma fades progressively to almost invisible as the cursor moves outward", () => {
  const center = reaction(50);
  const midway = reaction(80);
  const edge = reaction(100, 80);
  assert.ok(center.brightness > midway.brightness);
  assert.ok(midway.brightness > edge.brightness);
  assert.ok(edge.brightness > 0 && edge.brightness < 0.05);
  assert.deepEqual(reaction(10000, 10000), edge);
});

test("the approved glitch frequency still rises from the quiet center to the outer edge", () => {
  const center = reaction(50);
  const midway = reaction(80);
  const edge = reaction(100, 80);
  assert.equal(center.glitchFrequency, 5 / 12);
  assert.ok(midway.glitchFrequency > center.glitchFrequency);
  assert.ok(midway.glitchFrequency < edge.glitchFrequency);
  assert.equal(edge.glitchFrequency, 5 / 1.5);
});

test("leaving the landing returns to the brighter calm center", () => {
  assert.deepEqual(
    getDistanceReaction({
      cursor: null,
      origin,
      bounds,
      calmRadius: 12,
    }),
    reaction(50),
  );
});
