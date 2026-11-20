import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { chartTypeFor } = loadTs(
  new URL(
    "../apps/web/src/components/Cv/Projects/filterConfigs.ts",
    import.meta.url,
  ),
);

test("pies keep up to six values and treemaps up to ten, beyond that a list reads better", () => {
  assert.equal(chartTypeFor({ displayType: "pie" }, 6), "pie");
  assert.equal(chartTypeFor({ displayType: "pie" }, 7), "bar");
  assert.equal(chartTypeFor({ displayType: "treemap" }, 10), "treemap");
  assert.equal(chartTypeFor({ displayType: "treemap" }, 11), "bar");
  assert.equal(chartTypeFor({ displayType: "bar" }, 2), "bar");
});

test("a view can keep its chart whatever its size", () => {
  assert.equal(
    chartTypeFor({ displayType: "treemap", keepChart: true }, 12),
    "treemap",
  );
});
