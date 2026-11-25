import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const { analyzeConnections } = loadTs(
  new URL(
    "../apps/web/src/components/ExperienceAtlas/connectionAnalysis.ts",
    import.meta.url,
  ),
);

const weights = {
  needs: 100,
  product: 0,
  industry: 0,
  capabilities: 0,
  tools: 0,
  methods: 0,
  languages: 0,
};
const edge = (source, target, score, trait = "Shared need") => ({
  id: [source, target].sort().join("|"),
  source,
  target,
  score,
  shared: {
    needs: [trait],
    product: [],
    industry: [],
    capabilities: [],
    tools: [],
    methods: [],
    languages: [],
  },
});
const fixture = () => {
  const ids = Array.from({ length: 8 }, (_, i) => String(i));
  return {
    ids,
    weights,
    contrast: 2,
    links: ids.flatMap((a, i) =>
      ids
        .slice(i + 1)
        .map((b) =>
          edge(
            a,
            b,
            Math.floor(Number(a) / 4) === Math.floor(Number(b) / 4)
              ? 0.8
              : 0.05,
          ),
        ),
    ),
  };
};

test("perspective traits describe the active comparison fields", () => {
  const link = edge("a", "b", 0.8);
  link.shared.ownership = ["Owner"];
  const result = analyzeConnections({
    ids: ["a", "b"],
    links: [link],
    weights,
    contrast: 2.75,
    traitWeights: { ownership: 100 },
  });
  assert.deepEqual(result.groups[0].traits, [
    { field: "ownership", value: "Owner", count: 2 },
  ]);
});

test("live analysis separates strong groups despite weak bridges", () => {
  const result = analyzeConnections(fixture());
  assert.deepEqual(
    result.groups.map((g) => g.ids),
    [
      ["0", "1", "2", "3"],
      ["4", "5", "6", "7"],
    ],
  );
  assert.equal(result.outliers.length, 0);
  assert.equal(result.groups[0].traits[0].value, "Shared need");
});
test("isolates and unusually weak links are distinguished without flagging a tight small group", () => {
  const input = fixture();
  input.ids.push("weak", "isolated", "pair-a", "pair-b");
  input.links.push(edge("weak", "0", 0.01), edge("pair-a", "pair-b", 0.8));
  const result = analyzeConnections(input);
  assert.equal(
    result.outliers.find((p) => p.id === "isolated").reason,
    "disconnected",
  );
  assert.equal(result.outliers.find((p) => p.id === "weak").reason, "weak");
  assert.ok(result.groups.some((g) => g.ids.join() === "pair-a,pair-b"));
});
test("disabled links and zero weights are reflected, and equal overlap is not forced into clusters", () => {
  const input = fixture();
  input.links = input.links.filter((e) => e.source !== "0" && e.target !== "0");
  assert.ok(
    analyzeConnections(input).outliers.some(
      (p) => p.id === "0" && p.reason === "disconnected",
    ),
  );
  const empty = analyzeConnections({ ...input, links: [] });
  assert.equal(empty.groups.length, 0);
  assert.equal(empty.outliers.length, input.ids.length);
  const uniform = analyzeConnections({
    ...fixture(),
    links: fixture().links.map((e) => ({ ...e, score: 0.4 })),
  });
  assert.equal(uniform.groups.length, 1);
  assert.equal(uniform.outliers.length, 0);
});
test("analysis is deterministic across input ordering and proportional weight changes", () => {
  const input = fixture();
  const original = structuredClone(input);
  const expected = analyzeConnections(input);
  assert.deepEqual(
    analyzeConnections({
      ...input,
      ids: [...input.ids].reverse(),
      links: [...input.links].reverse(),
    }),
    expected,
  );
  assert.deepEqual(
    analyzeConnections({
      ...input,
      links: input.links.map((e) => ({ ...e, score: e.score / 2 })),
    }).groups.map((g) => g.ids),
    expected.groups.map((g) => g.ids),
  );
  assert.deepEqual(input, original);
});

test("outlier strength follows cluster contrast and empty graphs remain valid", () => {
  const input = fixture();
  input.ids.push("peripheral");
  input.links.push(edge("peripheral", "0", 0.3));
  assert.ok(
    !analyzeConnections({ ...input, contrast: 1 }).outliers.some(
      (item) => item.id === "peripheral",
    ),
  );
  assert.ok(
    analyzeConnections({ ...input, contrast: 3 }).outliers.some(
      (item) => item.id === "peripheral" && item.reason === "weak",
    ),
  );
  assert.deepEqual(
    analyzeConnections({ ids: [], links: [], weights, contrast: 2 }),
    { groups: [], outliers: [], weakCutoff: 0 },
  );
});
