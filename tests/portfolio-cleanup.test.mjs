import assert from "node:assert/strict";
import { test } from "node:test";

test("cleanup only writes reviewed fields, refuses stale/hidden rows and is rerunnable", async () => {
  const { propertiesToApply } =
    await import("../ops/notion/cleanup/2026-11-18/apply-cleanup.mjs");
  const page = {
    id: "p",
    properties: {
      Hidden: { checkbox: false },
      "Code SLOC": { type: "number", number: null },
      Screenshots: { files: ["concurrent visual"] },
    },
  };
  const change = {
    id: "p",
    fields: { "Code SLOC": { type: "number", before: null, after: 12 } },
  };
  assert.deepEqual(propertiesToApply(page, change), {
    "Code SLOC": { number: 12 },
  });
  assert.deepEqual(page.properties.Screenshots.files, ["concurrent visual"]);
  page.properties["Code SLOC"].number = 5;
  assert.throws(() => propertiesToApply(page, change), /stale/i);
  page.properties["Code SLOC"].number = 12;
  assert.deepEqual(propertiesToApply(page, change), {});
  page.properties.Hidden.checkbox = true;
  assert.throws(() => propertiesToApply(page, change), /hidden/i);
  assert.throws(
    () =>
      propertiesToApply(
        { ...page, properties: { Hidden: {} } },
        {
          id: "p",
          fields: { Screenshots: { type: "files", before: [], after: [] } },
        },
      ),
    /unsupported/i,
  );
});

test("measurement policy excludes vendor/generated output and identifies diagnostic tests", async () => {
  const { sourceCategory, scopeContains } =
    await import("../ops/notion/cleanup/2026-11-18/measure-codebases.mjs");
  assert.equal(sourceCategory("src/app.ts"), "application");
  assert.equal(sourceCategory("test-login-debug.ts"), "tests");
  assert.equal(sourceCategory("tests/feature.test.ts"), "tests");
  for (const path of [
    "vendor/lib.php",
    "node_modules/lib/index.js",
    "dist/app.js",
    "src/generated/api.ts",
    "next-env.d.ts",
  ])
    assert.equal(sourceCategory(path), null);
  assert.equal(scopeContains("data/capture.html", ["."], ["data"]), false);
  assert.equal(
    scopeContains(
      "src/integrations/supabase/types.ts",
      ["."],
      ["src/integrations/supabase/types.ts"],
    ),
    false,
  );
});

test("cleanup accepts Notion's expanded date response on read-back and rerun", async () => {
  const { propertiesToApply } =
    await import("../ops/notion/cleanup/2026-11-18/apply-cleanup.mjs");
  const page = {
    id: "p",
    properties: {
      Hidden: { checkbox: false },
      "Code Measured At": {
        type: "date",
        date: { start: "2026-11-18", end: null, time_zone: null },
      },
    },
  };
  const change = {
    id: "p",
    fields: {
      "Code Measured At": {
        type: "date",
        before: null,
        after: { start: "2026-11-18" },
      },
    },
  };
  assert.deepEqual(propertiesToApply(page, change), {});
  page.properties["Code Measured At"].date.end = "2026-11-19";
  assert.throws(() => propertiesToApply(page, change), /stale/i);
});
