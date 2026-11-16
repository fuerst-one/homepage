import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

test("WebGL capability probes reuse the result and release their temporary context", () => {
  const { isWebGL2Supported } = loadTs(
    new URL(
      "../apps/web/src/components/Plasma/GL/isWebGL2Supported.ts",
      import.meta.url,
    ),
  );
  const previous = globalThis.document;
  let created = 0;
  let released = 0;
  globalThis.document = {
    createElement: () => ({
      getContext: () => {
        created++;
        return {
          getExtension: () => ({
            loseContext: () => {
              released++;
            },
          }),
        };
      },
    }),
  };
  try {
    assert.equal(isWebGL2Supported(), true);
    assert.equal(isWebGL2Supported(), true);
    assert.equal(created, 1);
    assert.equal(released, 1);
  } finally {
    globalThis.document = previous;
  }
});
