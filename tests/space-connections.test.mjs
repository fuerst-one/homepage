import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { describeSpaceConnections, spaceHighlightIds } = loadTs(
  new URL(
    "../apps/web/src/components/ExperienceAtlas/spaceConnections.ts",
    import.meta.url,
  ),
);
const fixture = () => ({
  recipe: "product",
  ids: ["a", "b", "c", "d", "e", "f"],
  similarities: [
    [1, 0.99, 0.7, 0.8, 0.6, 0.6],
    [0.99, 1, 0.5, 0.5, 0.5, 0.5],
    [0.7, 0.5, 1, 0.9, 0.5, 0.5],
    [0.8, 0.5, 0.9, 1, 0.5, 0.5],
    [0.6, 0.5, 0.5, 0.5, 1, 0.9],
    [0.6, 0.5, 0.5, 0.5, 0.9, 1],
  ],
  // Medoids and screen coordinates must not determine bridge selection.
  groups: [
    { medoid: "a", ids: ["a", "b"], terms: [] },
    { medoid: "c", ids: ["c", "d"], terms: [] },
    { medoid: "f", ids: ["f", "e"], terms: [] },
  ],
  positions2d: [
    [0, 0],
    [1, 0],
    [0, 0],
    [100, 100],
    [1, 1],
    [0, 0],
  ],
  fieldTerms: {
    a: ["Apps", "Shared", "Shared"],
    b: ["Apps"],
    c: ["Hardware"],
    d: ["Hardware", "Shared"],
    e: [],
    f: [],
  },
});

test("one bridge per other cluster uses full-space similarity, with stable ties", () => {
  const model = describeSpaceConnections(fixture(), [], "a");
  assert.equal(model.selectedGroup, 0);
  assert.deepEqual(
    model.bridges.map(({ id, group }) => [id, group]),
    [
      ["d", 1],
      ["e", 2],
    ],
  );
  assert.deepEqual(
    model.nearest.map(({ id }) => id),
    ["b", "d", "c", "e", "f"],
  );
  assert.deepEqual(model.bridges[0].shared, ["Shared"]);
});

test("cluster comparisons count projects, not duplicate tags, and show both denominators", () => {
  const model = describeSpaceConnections(fixture(), [], "a");
  assert.deepEqual(model.groups[0].terms, [
    { term: "Apps", count: 2, total: 2 },
    { term: "Shared", count: 1, total: 2 },
  ]);
  assert.deepEqual(model.bridges[0].difference, {
    term: "Hardware",
    count: 2,
    total: 2,
    baselineCount: 0,
    baselineTotal: 2,
  });
  assert.equal(model.bridges[1].difference, undefined);
});

test("same-cluster highlights exclude bridges; comparison and preview modes are distinct", () => {
  const model = describeSpaceConnections(fixture(), [], "a");
  assert.deepEqual(
    model.members.map(({ id }) => id),
    ["b"],
  );
  assert.deepEqual(spaceHighlightIds(model, "members", null), ["a", "b"]);
  assert.deepEqual(spaceHighlightIds(model, "clusters", null), [
    "a",
    "b",
    "d",
    "e",
  ]);
  assert.deepEqual(spaceHighlightIds(model, "nearest", null), [
    "a",
    "b",
    "d",
    "c",
    "e",
    "f",
  ]);
  assert.deepEqual(spaceHighlightIds(model, "clusters", 1), ["a", "c", "d"]);
});

test("differences use proportions when group sizes differ and do not claim equal prevalence differs", () => {
  const space = fixture();
  space.groups = [
    { medoid: "a", ids: ["a", "b"], terms: [] },
    { medoid: "c", ids: ["c", "d", "e", "f"], terms: [] },
  ];
  space.fieldTerms = {
    a: ["Equal", "Common"],
    b: ["Common"],
    c: ["Equal", "Common", "Distinct"],
    d: ["Equal", "Common"],
    e: ["Common"],
    f: [],
  };
  const model = describeSpaceConnections(space, [], "a");
  assert.deepEqual(model.bridges[0].difference, {
    term: "Distinct",
    count: 1,
    total: 4,
    baselineCount: 0,
    baselineTotal: 2,
  });
});

test("unmapped projects do not acquire invented matches; an unpartitioned map has no bridges", () => {
  const space = fixture();
  const absent = describeSpaceConnections(space, [], "absent");
  assert.equal(absent.selectedGroup, -1);
  assert.deepEqual(absent.bridges, []);
  assert.deepEqual(absent.nearest, []);
  assert.deepEqual(absent.members, []);
  assert.deepEqual(spaceHighlightIds(absent, "clusters", null), []);
  space.groups = [{ medoid: "a", ids: space.ids, terms: [] }];
  const model = describeSpaceConnections(space, [], "a");
  assert.deepEqual(model.bridges, []);
  assert.equal(model.members.length, space.ids.length - 1);
  assert.ok(model.members.every(({ id }) => id !== "a"));
  assert.deepEqual(spaceHighlightIds(model, "clusters", null), space.ids);
});

test("same-cluster browsing includes all members beyond the five nearest matches", () => {
  const space = fixture();
  space.ids = ["a", "b", "c", "d", "e", "f", "g", "h"];
  space.similarities = space.ids.map((_, i) =>
    space.ids.map((_, j) => (i === j ? 1 : 0.5)),
  );
  space.groups = [{ medoid: "a", ids: space.ids, terms: [] }];
  const model = describeSpaceConnections(space, [], "a");
  assert.equal(model.nearest.length, 5);
  assert.deepEqual(
    model.members.map(({ id }) => id),
    space.ids.slice(1),
  );
  assert.deepEqual(spaceHighlightIds(model, "members", null), space.ids);
});

test("selected field terms are authoritative, including missing or empty categorical context", () => {
  const space = fixture();
  delete space.fieldTerms.d;
  const project = {
    id: "d",
    productTypes: ["Wrong default"],
    matching: { domains: [], buyerNeeds: [] },
  };
  const model = describeSpaceConnections(space, [project], "a");
  assert.deepEqual(model.bridges[0].shared, []);
  assert.ok(
    !model.groups[1].terms.some(({ term }) => term === "Wrong default"),
  );
  space.recipe = "scale";
  space.fieldTerms = {
    a: ["Smaller teams"],
    b: [],
    c: ["Larger teams"],
    d: ["Larger teams"],
  };
  assert.equal(
    describeSpaceConnections(space, [], "a").bridges[0].difference.term,
    "Larger teams",
  );
});

test("cross-industry evidence requires known disjoint sectors and meaningful shared recorded facts", () => {
  const projects = [
    {
      id: "a",
      industries: ["Retail"],
      matching: { buyerNeeds: ["Automate workflows"], domains: [] },
      capabilities: [],
    },
    {
      id: "b",
      industries: ["Retail"],
      matching: { buyerNeeds: ["Automate workflows"] },
    },
    {
      id: "c",
      industries: ["Health"],
      matching: { buyerNeeds: ["Automate workflows"] },
    },
    {
      id: "d",
      industries: [],
      matching: { buyerNeeds: ["Automate workflows"] },
    },
    { id: "e", industries: ["Education"], matching: { buyerNeeds: [] } },
  ];
  const model = describeSpaceConnections(fixture(), projects, "a");
  assert.equal(model.crossIndustry.id, "c");
  assert.deepEqual(model.crossIndustry.evidence, [
    { label: "Shared client need", values: ["Automate workflows"] },
  ]);
  assert.equal(
    describeSpaceConnections(fixture(), projects, "absent").crossIndustry,
    undefined,
  );
});

test("identical full-space profiles are discoverable without treating projected overlaps as identity", () => {
  const space = fixture();
  space.similarities[0][1] = space.similarities[1][0] = 1;
  const model = describeSpaceConnections(space, [], "a");
  assert.deepEqual(model.identicalIds, ["b"]);
  assert.ok(model.groups[0].label.includes("Apps"));
  assert.equal(model.groups[2].label, "Mixed recorded traits");
});

test("broad capabilities alone do not establish a cross-industry relevance claim", () => {
  const projects = [
    {
      id: "a",
      industries: ["Retail"],
      matching: {},
      capabilities: ["UI-Design"],
    },
    {
      id: "b",
      industries: ["Health"],
      matching: {},
      capabilities: ["UI-Design"],
    },
  ];
  assert.equal(
    describeSpaceConnections(fixture(), projects, "a").crossIndustry,
    undefined,
  );
});
