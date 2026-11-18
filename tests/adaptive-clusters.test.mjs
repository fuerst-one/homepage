import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const { adaptiveClusters } = loadTs(
  new URL(
    "../apps/web/src/components/ExperienceAtlas/adaptiveClusters.ts",
    import.meta.url,
  ),
);
const clustered = (count) => {
  const ids = Array.from(
    { length: count * 4 },
    (_, i) => `p${String(i).padStart(2, "0")}`,
  );
  return {
    ids,
    excluded: [],
    terms: new Map(),
    distances: ids.map((_, i) =>
      ids.map((_, j) =>
        i === j
          ? 0
          : Math.floor(i / 4) === Math.floor(j / 4)
            ? 0.03 + Math.abs(i - j) * 0.001
            : 1,
      ),
    ),
  };
};
test("cluster count adapts to the data and a filtered subset", () => {
  assert.equal(adaptiveClusters(clustered(3)).groups.length, 3);
  assert.equal(adaptiveClusters(clustered(2)).groups.length, 2);
});
test("unseparated and tiny datasets stay unpartitioned", () => {
  const s = clustered(2);
  s.distances = s.ids.map((_, i) => s.ids.map((_, j) => (i === j ? 0 : 1)));
  assert.equal(adaptiveClusters(s).groups.length, 1);
  assert.equal(
    adaptiveClusters({ ids: [], distances: [], terms: new Map(), excluded: [] })
      .groups.length,
    0,
  );
});
test("reordering the same projects preserves groups and diagnostics", () => {
  const a = clustered(3),
    ix = a.ids.map((_, i) => i).reverse();
  const b = {
    ...a,
    ids: ix.map((i) => a.ids[i]),
    distances: ix.map((i) => ix.map((j) => a.distances[i][j])),
  };
  const normalize = (result) =>
    result.groups
      .map((g) => [...g.ids].sort())
      .sort((a, b) => a[0].localeCompare(b[0]));
  assert.deepEqual(
    normalize(adaptiveClusters(a)),
    normalize(adaptiveClusters(b)),
  );
  const d = adaptiveClusters(a).diagnostics;
  assert.ok(d.silhouette > 0.8);
  assert.ok(Number.isFinite(d.stability));
});
