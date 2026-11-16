import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
test("visual preferences are never read or saved until requested; withdrawing removes the saved choices", () => {
  const {
    readPlaygroundPreference,
    writePlaygroundPreference,
    rememberPlaygroundPreferences,
  } = loadTs(
    new URL("../apps/web/src/lib/playgroundPreferences.ts", import.meta.url),
  );
  const values = new Map([["plasma:knobs", "legacy choice"]]);
  const reads = [];
  const storage = {
    getItem: (key) => {
      reads.push(key);
      return values.get(key) ?? null;
    },
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  assert.equal(readPlaygroundPreference(storage, "plasma:knobs"), null);
  assert.ok(!reads.includes("plasma:knobs"));
  writePlaygroundPreference(storage, "plasma:splash", "plasma");
  assert.equal(values.has("plasma:splash"), false);
  rememberPlaygroundPreferences(storage, true);
  writePlaygroundPreference(storage, "plasma:splash", "shapes");
  assert.equal(readPlaygroundPreference(storage, "plasma:splash"), "shapes");
  rememberPlaygroundPreferences(storage, false);
  assert.equal(values.size, 0);
});
