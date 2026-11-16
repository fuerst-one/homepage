import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const { createGlitchClock } = loadTs(
  new URL("../src/components/Plasma/GL/getGlitchState.ts", import.meta.url),
);

function bursts(frequency) {
  const clock = createGlitchClock();
  const durations = [];
  let start = null;
  for (let frame = 0; frame < 60000; frame++) {
    const time = frame / 1000;
    const active = clock.sample(time, frequency).burst > 0;
    if (active && start === null) start = time;
    if (!active && start !== null) {
      durations.push(time - start);
      start = null;
    }
  }
  return durations;
}

test("frequency increases burst count while preserving short burst duration", () => {
  const center = bursts(5 / 12);
  const original = bursts(1);
  const edge = bursts(5 / 1.5);
  assert.ok(center.length < original.length);
  assert.ok(edge.length > original.length * 2);
  for (const duration of [...center, ...original, ...edge]) {
    assert.ok(Math.abs(duration - 0.3) < 0.003, `duration ${duration}`);
  }
});

test("changing frequency does not jump or truncate an active burst", () => {
  const clock = createGlitchClock();
  assert.ok(clock.sample(0, 1).burst > 0);
  assert.ok(clock.sample(0.1, 5 / 1.5).burst > 0);
  assert.ok(clock.sample(0.299, 5 / 12).burst > 0);
  assert.equal(clock.sample(0.301, 5 / 12).burst, 0);
});

test("repeated sampling at the same time preserves the shared canvas/label state", () => {
  const clock = createGlitchClock();
  const first = clock.sample(0.1, 1);
  assert.deepEqual(clock.sample(0.1, 3), first);
});
