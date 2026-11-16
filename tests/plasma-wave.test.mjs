import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
const { outputText } = ts.transpileModule(
  readFileSync(
    new URL(
      "../apps/web/src/components/Plasma/buildMirroredPlasmaRamp.ts",
      import.meta.url,
    ),
    "utf8",
  ),
  { compilerOptions: { module: ts.ModuleKind.ESNext } },
);
const { buildMirroredPlasmaRamp } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

test("the plasma brightness reverses instead of jumping at either end", () => {
  const ramp = buildMirroredPlasmaRamp(64);
  assert.equal(ramp.length, 128);
  for (let i = 0; i < ramp.length; i++) {
    assert.ok(ramp[i] >= 0 && ramp[i] <= 1);
    assert.equal(ramp[i], ramp[ramp.length - 1 - i]);
    assert.ok(Math.abs(ramp[i] - ramp[(i + 1) % ramp.length]) <= 1 / 64);
  }
  assert.ok(ramp[0] > ramp[1]);
  assert.ok(ramp[63] < ramp[62]);
  assert.equal(ramp[63], ramp[64]);
  assert.equal(ramp[127], ramp[0]);
});
