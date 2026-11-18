import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const { buildScaleSpace } = loadTs(
  new URL(
    "../apps/web/src/components/ExperienceAtlas/scaleSpace.ts",
    import.meta.url,
  ),
);
const p = (id, scale) => ({ id, name: id, scale });
test("selected numeric fields preserve zero and exclude missing values with a specific reason", () => {
  const rows = [
    p("a", { complexity: 1, codeSloc: 0 }),
    p("b", { complexity: 3, codeSloc: 10 }),
    p("c", { complexity: 5 }),
  ];
  const code = buildScaleSpace(rows, ["complexity", "code"]);
  assert.deepEqual(code.space.ids, ["a", "b"]);
  assert.match(code.space.excluded[0].reason, /Codebase size/);
  const all = buildScaleSpace(rows, ["complexity"]);
  assert.deepEqual(all.space.ids, ["a", "b", "c"]);
  assert.equal(all.space.similarities[0][2], 0);
});
test("team bounds form one equally weighted feature and constant fields do not dilute distances", () => {
  const rows = [
    p("a", { complexity: 1, teamLow: 1, teamHigh: 1, codeSloc: 10 }),
    p("b", { complexity: 5, teamLow: 10, teamHigh: 10, codeSloc: 10 }),
  ];
  const a = buildScaleSpace(rows, ["complexity", "team"]);
  const b = buildScaleSpace(rows, ["complexity", "team", "code"]);
  assert.deepEqual(a.space.similarities, b.space.similarities);
  assert.deepEqual(b.constantFields, ["code"]);
  assert.equal(a.space.similarities[0][1], 0);
  assert.ok(a.space.positions3d.flat().every(Number.isFinite));
});
test("the active subset is refitted deterministically and unknown effort provenance is not treated as comparable", () => {
  const rows = [
    p("a", { codeSloc: 1 }),
    p("b", { codeSloc: 10 }),
    p("c", { codeSloc: 10000 }),
  ];
  const full = buildScaleSpace(rows, ["code"]);
  const subset = buildScaleSpace(rows.slice(0, 2), ["code"]);
  assert.notEqual(
    full.space.similarities[0][1],
    subset.space.similarities[0][1],
  );
  assert.deepEqual(
    buildScaleSpace([...rows].reverse(), ["code"]).space,
    full.space,
  );
  const efforts = buildScaleSpace(
    [
      p("x", { effortLow: 1, effortHigh: 5, effortBasis: "unspecified" }),
      p("y", { effortLow: 2, effortHigh: 10, effortBasis: "rebuild-estimate" }),
    ],
    ["effort"],
  );
  assert.deepEqual(efforts.space.ids, ["y"]);
  assert.match(efforts.space.excluded[0].reason, /Rebuild effort/);
  assert.ok(efforts.space.positions3d.flat().every(Number.isFinite));
});

test("tied medians do not label minimum-size teams as larger teams", () => {
  const result = buildScaleSpace(
    [1, 1, 1, 1, 8].map((size, i) => ({
      id: String(i),
      scale: { teamLow: size, teamHigh: size },
    })),
    ["team"],
  );
  assert.deepEqual(result.space.fieldTerms["0"], []);
  assert.deepEqual(result.space.fieldTerms["4"], ["Larger teams"]);
});
