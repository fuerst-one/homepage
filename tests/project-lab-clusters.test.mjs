import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const {
  lensSpace,
  medoidClusters,
  projectDistances,
  neighbourEdges,
  clusterCrossings,
  networkCoverage,
} = loadTs(
  new URL(
    "../apps/web/src/components/ProjectLab/clustering.ts",
    import.meta.url,
  ),
);
const p = (id, tools = [], needs = [], summary = "") => ({
  id,
  name: id,
  tools,
  matching: { buyerNeeds: needs, summary },
});

test("single-field lenses ignore unrelated fields, deduplicate tags, and retain missingness", () => {
  const rows = [
    p("a", ["React", "React"], ["UX"]),
    p("b", ["React", "Vue"], ["AI"]),
    p("c"),
  ];
  const tools = lensSpace(rows, "tools");
  assert.deepEqual(tools.ids, ["a", "b"]);
  assert.deepEqual(tools.excluded, ["c"]);
  assert.equal(tools.distances[0][1], 0.5);
  assert.equal(lensSpace(rows, "needs").distances[0][1], 1);
  assert.deepEqual(
    lensSpace(
      rows.map((r) => ({ ...r, matching: { buyerNeeds: ["changed"] } })),
      "tools",
    ).distances,
    tools.distances,
  );
  assert.equal(lensSpace([], "tools").ids.length, 0);
});

test("case context uses only summary words with corpus TF-IDF, and has no vectors for empty prose", () => {
  const rows = [
    p("a", [], [], "Maritime shipping scheduling"),
    p("b", [], [], "Maritime shipping scheduling"),
    p("c", [], [], "Music audio playlists"),
    p("d", [], [], "the and with"),
  ];
  const space = lensSpace(rows, "context");
  assert.deepEqual(space.excluded, ["d"]);
  assert.ok(Math.abs(space.distances[0][1]) < 1e-10);
  assert.equal(space.distances[0][2], 1);
});

test("medoid clusters are deterministic, conserve identities, and use actual project exemplars", () => {
  const space = lensSpace(
    [p("a", ["X"]), p("b", ["X"]), p("c", ["Y"]), p("d", ["Y"])],
    "tools",
  );
  const groups = medoidClusters(space, 2);
  assert.deepEqual(
    groups.map((g) => g.ids),
    [
      ["a", "b"],
      ["c", "d"],
    ],
  );
  assert.ok(groups.every((g) => g.ids.includes(g.medoid)));
  assert.deepEqual(medoidClusters(space, 2), groups);
  assert.equal(medoidClusters(space, 99).length, 4);
  assert.deepEqual(medoidClusters(lensSpace([], "tools"), 3), []);
});

test("MDS recovers Euclidean distances in two dimensions and reports zero stress for degenerate input", () => {
  const d = [
    [0, 1, Math.sqrt(2)],
    [1, 0, 1],
    [Math.sqrt(2), 1, 0],
  ];
  const result = projectDistances(d);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      assert.ok(
        Math.abs(
          Math.hypot(
            result.points[i][0] - result.points[j][0],
            result.points[i][1] - result.points[j][1],
          ) - d[i][j],
        ) < 1e-8,
      );
    }
  assert.ok(result.stress < 1e-8);
  assert.equal(
    projectDistances([
      [0, 0],
      [0, 0],
    ]).stress,
    0,
  );
  assert.deepEqual(projectDistances([]).points, []);
});

test("sparse neighbours include positive ties only, union choices without duplicate links, and report isolates", () => {
  const space = lensSpace(
    [p("a", ["X"]), p("b", ["X", "Y"]), p("c", ["Z"])],
    "tools",
  );
  const edges = neighbourEdges(
    space.ids,
    [
      { a: "a", b: "b", value: 0.5 },
      { a: "a", b: "c", value: 0 },
    ],
    1,
    0,
  );
  assert.deepEqual(edges, [{ a: "a", b: "b", value: 0.5 }]);
  assert.deepEqual(neighbourEdges(space.ids, edges, 2, 0.6), []);
});

test("crossings conserve every scoped project once, including unknown lens assignments", () => {
  const left = [{ medoid: "a", ids: ["a", "b"], terms: ["X"] }];
  const right = [{ medoid: "b", ids: ["b", "c"], terms: ["UX"] }];
  const flow = clusterCrossings(["a", "b", "c", "d"], left, right);
  assert.equal(
    flow.links.reduce((n, e) => n + e.ids.length, 0),
    4,
  );
  assert.deepEqual(flow.links.flatMap((e) => e.ids).sort(), [
    "a",
    "b",
    "c",
    "d",
  ]);
  assert.equal(flow.nodes.filter((n) => n.unknown).length, 2);
});

test("network coverage keeps unavailable comparisons separate from measured isolates", () => {
  const result = networkCoverage(
    ["a", "b", "c", "d"],
    [
      { a: "a", b: "b", value: 0.8 },
      { a: "b", b: "c", value: 0.1 },
    ],
    [{ a: "a", b: "b", value: 0.8 }],
  );
  assert.deepEqual(result.isolates, ["c"]);
  assert.deepEqual(result.unavailable, ["d"]);
  assert.deepEqual(networkCoverage(["a"], [], []).unavailable, ["a"]);
});
