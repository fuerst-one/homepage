import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

const { outputText } = ts.transpileModule(
  readFileSync(
    new URL(
      "../src/components/PlasmaLanding/getRailScrollState.ts",
      import.meta.url,
    ),
    "utf8",
  ),
  { compilerOptions: { module: ts.ModuleKind.ESNext } },
);
const { getRailScrollState } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

test("rail controls only allow directions with remaining content", () => {
  assert.deepEqual(getRailScrollState(0, 600, 300), {
    back: false,
    forward: true,
  });
  assert.deepEqual(getRailScrollState(150, 600, 300), {
    back: true,
    forward: true,
  });
  assert.deepEqual(getRailScrollState(300, 600, 300), {
    back: true,
    forward: false,
  });
});

test("both directions are unavailable when all suggestions fit", () => {
  assert.deepEqual(getRailScrollState(0, 300, 300), {
    back: false,
    forward: false,
  });
  assert.deepEqual(getRailScrollState(0, 200, 300), {
    back: false,
    forward: false,
  });
});

test("fractional offsets and overscroll do not reveal unavailable controls", () => {
  assert.deepEqual(getRailScrollState(0.4, 600, 300), {
    back: false,
    forward: true,
  });
  assert.deepEqual(getRailScrollState(299.7, 600, 300), {
    back: true,
    forward: false,
  });
  assert.deepEqual(getRailScrollState(-20, 600, 300), {
    back: false,
    forward: true,
  });
  assert.deepEqual(getRailScrollState(320, 600, 300), {
    back: true,
    forward: false,
  });
});
