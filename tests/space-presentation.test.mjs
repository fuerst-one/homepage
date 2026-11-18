import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { loadTs } from "./helpers/load-ts.mjs";

const { convexHull2d, paddedHull2d, paddedPoints3d } = loadTs(
  new URL(
    "../apps/web/src/components/ExperienceAtlas/clusterHulls.ts",
    import.meta.url,
  ),
);
const { describeSpaceAxes, spaceProjectTerms } = loadTs(
  new URL(
    "../apps/web/src/components/ExperienceAtlas/spaceAxes.ts",
    import.meta.url,
  ),
);

test("the hull encloses a cluster without interior or duplicate vertices", () => {
  const points = [
    [0, 0],
    [2, 0],
    [2, 2],
    [0, 2],
    [1, 1],
    [0, 0],
  ];
  const before = structuredClone(points);
  assert.deepEqual(convexHull2d(points), [
    [0, 0],
    [2, 0],
    [2, 2],
    [0, 2],
  ]);
  assert.deepEqual(points, before);
});

test("padding keeps markers inside visible 2D envelopes, including tiny clusters", () => {
  for (const points of [
    [[0, 0]],
    [
      [0, 0],
      [2, 0],
    ],
    [
      [0, 0],
      [1, 0],
      [2, 0],
    ],
  ]) {
    const hull = paddedHull2d(points, 0.2);
    assert.ok(hull.length >= 4);
    for (const [x, y] of points) {
      for (let k = 0; k < 32; k++) {
        const q = [
          x + 0.2 * Math.cos((k * Math.PI) / 16),
          y + 0.2 * Math.sin((k * Math.PI) / 16),
        ];
        assert.ok(
          hull.every((a, i) => {
            const b = hull[(i + 1) % hull.length];
            return (
              (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]) >=
              -1e-9
            );
          }),
        );
      }
    }
  }
  assert.deepEqual(paddedHull2d([], 1), []);
});

test("3D envelopes remain finite and enclose flat, collinear and singleton clusters", async () => {
  const require = createRequire(
    new URL("../apps/web/package.json", import.meta.url),
  );
  const { ConvexHull } = await import(
    require.resolve("three/addons/math/ConvexHull.js")
  );
  const { Vector3 } = await import(require.resolve("three"));
  for (const points of [
    [[0, 0, 0]],
    [
      [0, 0, 0],
      [1, 0, 0],
    ],
    [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
    ],
    [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
  ]) {
    const expanded = paddedPoints3d(points, 0.2);
    assert.ok(expanded.flat().every(Number.isFinite));
    const hull = new ConvexHull().setFromPoints(
      expanded.map((p) => new Vector3(...p)),
    );
    for (const point of points)
      assert.ok(hull.containsPoint(new Vector3(...point)));
    assert.ok(hull.faces.length >= 4);
  }
  assert.deepEqual(paddedPoints3d([], 1), []);
});

const project = (id, tag) => ({
  id,
  tools: [tag, "Shared"],
  languages: [],
  capabilities: [],
  methods: [],
  productTypes: [],
  matching: { buyerNeeds: [], domains: [], stages: [] },
  ownership: "",
});
const projects = [
  project("a", "Commerce"),
  project("b", "Commerce"),
  project("c", "Interactive tools"),
  project("d", "Interactive tools"),
];
const space = {
  recipe: "engineering",
  ids: ["a", "b", "c", "d"],
  positions2d: [
    [-2, 0],
    [-1, 0],
    [1, 0],
    [2, 0],
  ],
  positions3d: [
    [-2, 0, 0],
    [-1, 0, 0],
    [1, 0, 0],
    [2, 0, 0],
  ],
};

test("projection axes do not imply opposing skills; explicit numeric labels remain intact", () => {
  const axes = describeSpaceAxes(projects, space, 2);
  assert.deepEqual(axes, [
    { negative: null, positive: null, label: "Direction 1" },
    { negative: null, positive: null, label: "Direction 2" },
  ]);
  const reversed = {
    ...space,
    positions2d: space.positions2d.map(([x, y]) => [-x, y]),
  };
  assert.deepEqual(describeSpaceAxes(projects, reversed, 2), axes);
  const numeric = {
    ...space,
    axisLabels: [{ negative: "Smaller teams", positive: "Larger teams" }],
  };
  assert.deepEqual(describeSpaceAxes(projects, numeric, 2), numeric.axisLabels);
});

test("descriptive terms come from the selected lens, not client names or unrelated fields", () => {
  const p = {
    ...project("id", "React"),
    name: "SECRET",
    productTypes: ["Web app"],
    capabilities: ["UX design"],
    methods: [],
    ownership: "Product owner",
    matching: {
      buyerNeeds: ["Make data actionable"],
      domains: ["Analytics"],
      stages: ["Production"],
    },
  };
  assert.deepEqual(spaceProjectTerms(p, "engineering"), ["React", "Shared"]);
  assert.ok(spaceProjectTerms(p, "practice").includes("Product owner"));
  assert.ok(!spaceProjectTerms(p, "product").includes("React"));
  assert.ok(!spaceProjectTerms(p, "product").includes("SECRET"));
});
