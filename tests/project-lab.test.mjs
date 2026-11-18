import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const {
  crossTab,
  needTimeline,
  projectSimilarities,
  labSummary,
  projectIdentityLabels,
} = loadTs(
  new URL("../apps/web/src/components/ProjectLab/analysis.ts", import.meta.url),
);
test("duplicate short names remain distinct using their separate descriptions", () => {
  const rows = [
    { id: "a", name: "Public Searoutes", shortDescription: "Navigation app" },
    { id: "b", name: "Public Searoutes", shortDescription: "Excel plugin" },
  ];
  const labels = projectIdentityLabels(rows);
  assert.equal(labels.get("a"), "Public Searoutes · Navigation app");
  assert.equal(labels.get("b"), "Public Searoutes · Excel plugin");
  assert.equal(projectIdentityLabels([rows[0]]).get("a"), "Public Searoutes");
  assert.notEqual(
    projectIdentityLabels(
      rows.map((r) => ({ ...r, shortDescription: "" })),
    ).get("a"),
    projectIdentityLabels(
      rows.map((r) => ({ ...r, shortDescription: "" })),
    ).get("b"),
  );
});
const project = (id, overrides = {}) => ({
  id,
  name: id,
  tools: [],
  languages: [],
  capabilities: [],
  methods: [],
  startDate: "2024-01-01",
  projectType: "Hobby",
  matching: {
    buyerNeeds: [],
    domains: [],
    stages: [],
    aiUsage: [],
    aiCapabilities: [],
    ownership: "",
    maintenance: "",
    summary: "",
  },
  caseStudyWords: 0,
  outcomeBasis: "No outcome recorded",
  contributionBasis: "",
  ...overrides,
});

test("cross-tabs count each project once per cell and retain drill-through identities", () => {
  const rows = [
    project("a", {
      matching: {
        buyerNeeds: ["Build", "Build"],
        domains: ["Travel", "Travel"],
      },
    }),
    project("b", {
      matching: { buyerNeeds: ["Build"], domains: ["Travel", "Tools"] },
    }),
  ];
  const result = crossTab(rows, "buyerNeeds", "domains");
  assert.deepEqual(
    result.find((c) => c.row === "Build" && c.column === "Travel").ids,
    ["a", "b"],
  );
  assert.equal(result.find((c) => c.column === "Tools").ids.length, 1);
  assert.equal(
    crossTab(rows.slice(0, 1), "buyerNeeds", "domains")[0].ids.length,
    1,
  );
});

test("timeline uses start year once per need and omits invalid dates", () => {
  const rows = [
    project("a", {
      endDate: "2026-01-01",
      matching: { buyerNeeds: ["Build", "Build"] },
    }),
    project("b", { startDate: "unknown", matching: { buyerNeeds: ["Build"] } }),
  ];
  assert.deepEqual(needTimeline(rows), [
    { year: 2024, need: "Build", ids: ["a"] },
  ]);
});

test("semantic pairs use normalized chunk centroids and deduplicated technology overlap", () => {
  const rows = [
    project("a", { tools: ["React", "React"], languages: ["TS"] }),
    project("b", { tools: ["React"], languages: ["PHP"] }),
    project("c"),
  ];
  const docs = [
    {
      projectId: "a",
      embeddingModel: "model",
      chunks: [{ embedding: [2, 0] }, { embedding: [0, 2] }],
    },
    {
      projectId: "b",
      embeddingModel: "model",
      chunks: [{ embedding: [1, 1] }],
    },
    {
      projectId: "c",
      embeddingModel: "other",
      chunks: [{ embedding: [1, 1] }],
    },
  ];
  const pairs = projectSimilarities(rows, docs);
  assert.equal(pairs.length, 1);
  assert.ok(Math.abs(pairs[0].cosine - 1) < 1e-12);
  assert.equal(pairs[0].technologyOverlap, 1 / 3);
  assert.deepEqual(pairs[0].sharedTechnology, ["React"]);
});

test("missing, invalid, stale and incompatible vectors do not become zero-similarity observations", () => {
  const rows = [project("a"), project("b"), project("c"), project("d")];
  const docs = [
    { projectId: "a", embeddingModel: "m", chunks: [{ embedding: [1, 0] }] },
    { projectId: "b", embeddingModel: "m", chunks: [{ embedding: [0, 0] }] },
    { projectId: "c", embeddingModel: "m", chunks: [{ embedding: [1, 0, 0] }] },
    {
      projectId: "d",
      embeddingModel: "m",
      matchesCurrentPublication: false,
      chunks: [{ embedding: [1, 0] }],
    },
  ];
  assert.deepEqual(projectSimilarities(rows, docs), []);
});

test("summary separates missing outcomes from estimates and counts published case bodies", () => {
  const rows = [
    project("a", { outcomeBasis: "Owner estimate", caseStudyWords: 100 }),
    project("b", {
      outcomeBasis: "Owner-reported measurement",
      contributionBasis: "Owner confirmation",
    }),
    project("c"),
  ];
  assert.deepEqual(labSummary(rows), {
    projects: 3,
    caseStudies: 1,
    ownerConfirmed: 1,
    measuredOutcomes: 1,
    missingOutcomes: 1,
    missingStages: 3,
  });
});

test("technology comparisons remain available without any embeddings", () => {
  const { technologyPairs, outcomeCategories } = loadTs(
    new URL(
      "../apps/web/src/components/ProjectLab/analysis.ts",
      import.meta.url,
    ),
  );
  const rows = [
    project("a", { tools: ["React", "React"], languages: ["TS"] }),
    project("b", { tools: ["React"], languages: ["PHP"] }),
    project("c"),
  ];
  const pair = technologyPairs(rows).find((p) => p.a === "a" && p.b === "b");
  assert.equal(pair.technologyOverlap, 1 / 3);
  assert.deepEqual(pair.sharedTechnology, ["React"]);
  assert.ok(
    outcomeCategories([
      project("d", { outcomeBasis: "Source-verified measurement" }),
      project("e", { outcomeBasis: "Future source label" }),
    ]).includes("Source-verified measurement"),
  );
  assert.ok(
    outcomeCategories([
      project("e", { outcomeBasis: "Future source label" }),
    ]).includes("Future source label"),
  );
});
