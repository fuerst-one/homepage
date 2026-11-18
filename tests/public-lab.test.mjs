import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { publicLabSnapshot } = loadTs(
  new URL(
    "../apps/web/src/components/ProjectLab/publicSnapshot.ts",
    import.meta.url,
  ),
);

test("preview data excludes unpublished projects and internal research at every level", () => {
  const project = (id) => ({
    id,
    name: id,
    projectType: "Freelance",
    startDate: "2024-01-01",
    endDate: null,
    tools: ["React"],
    languages: ["TypeScript"],
    experiences: [],
    industries: ["Technology"],
    productTypes: ["Web app"],
    targetMarket: [],
    usageContexts: [],
    deliveryModels: [],
    matching: {
      summary: "A public case",
      buyerNeeds: [],
      domains: [],
      stages: [],
      aiUsage: [],
      aiCapabilities: [],
      ownership: "Solo delivery",
      maintenance: "",
      secret: "PRIVATE_MATCHING",
    },
    assessment: { wow: 8, effortBasis: "PRIVATE_EFFORT", teamLow: 12 },
    contribution: "Built the interface",
    evidenceGaps: "PRIVATE_GAPS",
    sourceEditedAt: "PRIVATE_SOURCE",
    internal: "PRIVATE_EXTRA",
  });
  const source = {
    projects: [project("public"), project("removed")],
    similarities: [{ a: "public", b: "removed", cosine: 0.9 }],
    findings: [{ paths: ["PRIVATE_PATH"] }],
    metadata: {
      exportedAt: "2026-11-17T00:00:00.000Z",
      source: "PRIVATE_SOURCE",
      auditCoverage: { notes: ["PRIVATE_AUDIT"] },
    },
  };
  const result = publicLabSnapshot(source, [{ id: "public", wowFactor: 6 }]);
  assert.deepEqual(
    result.projects.map((p) => p.id),
    ["public"],
  );
  assert.equal(result.projects[0].assessment.wow, 6);
  assert.equal(result.projects[0].contribution, "Built the interface");
  assert.deepEqual(result.similarities, []);
  assert.deepEqual(result.findings, []);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_/);
  assert.equal(source.projects.length, 2);
  assert.equal(source.projects[0].assessment.wow, 8);
});

test("public ratings are bounded and unknown remains unscored", () => {
  const source = {
    metadata: {},
    similarities: [],
    findings: [],
    projects: [
      { id: "a", matching: {} },
      { id: "b", matching: {} },
      { id: "c", matching: {} },
    ],
  };
  const result = publicLabSnapshot(source, [
    { id: "a", wowFactor: 11 },
    { id: "b", wowFactor: null },
    { id: "c", wowFactor: 3 },
  ]);
  assert.deepEqual(
    result.projects.map((p) => p.assessment.wow),
    [null, null, 3],
  );
});
