import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { getScopedFilterOptionCounts } = loadTs(
  new URL(
    "../apps/web/src/components/Cv/Projects/Filter/utils.ts",
    import.meta.url,
  ),
);

const projects = [
  {
    id: "one",
    industries: ["Energy"],
    capabilities: ["Design"],
    featured: true,
  },
  {
    id: "two",
    industries: ["Energy"],
    capabilities: ["Code"],
    featured: false,
  },
  {
    id: "three",
    industries: ["Health"],
    capabilities: ["Code"],
    featured: false,
  },
];

test("option counts follow other filters and the current search scope", () => {
  const counts = getScopedFilterOptionCounts?.(
    projects,
    projects.slice(0, 2),
    { industries: ["Energy"] },
    "capabilities",
  );
  assert.deepEqual(counts, [
    { itemKey: "Code", count: 1 },
    { itemKey: "Design", count: 1 },
  ]);
});

test("zero-result values stay visible and filters within one category are alternatives", () => {
  const counts = getScopedFilterOptionCounts?.(
    projects,
    projects,
    { industries: ["Energy"], capabilities: ["Design"] },
    "capabilities",
  );
  assert.deepEqual(counts, [
    { itemKey: "Code", count: 1 },
    { itemKey: "Design", count: 1 },
  ]);
  const narrowed = getScopedFilterOptionCounts?.(
    projects,
    projects,
    { industries: ["Health"] },
    "capabilities",
  );
  assert.deepEqual(narrowed, [
    { itemKey: "Code", count: 1 },
    { itemKey: "Design", count: 0 },
  ]);
});

test("the featured default does not hide choices that open the full portfolio", () => {
  const counts = getScopedFilterOptionCounts?.(
    projects,
    projects,
    { featured: ["true"] },
    "capabilities",
  );
  assert.deepEqual(counts, [
    { itemKey: "Code", count: 2 },
    { itemKey: "Design", count: 1 },
  ]);
});
