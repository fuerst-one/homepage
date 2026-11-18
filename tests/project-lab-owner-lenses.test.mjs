import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const source = new URL(
  "../apps/web/src/components/ProjectLab/ownerLenses.ts",
  import.meta.url,
);
const project = (id, assessment = {}, extra = {}) => ({
  id,
  name: id,
  projectType: "Hobby",
  tools: [],
  languages: [],
  workingPattern: "Evenings & weekends",
  caseStudyWords: 0,
  outcomeBasis: "No outcome recorded",
  matching: {
    ownership: "Solo delivery",
    maintenance: "",
    stages: [],
    buyerNeeds: [],
    domains: [],
    aiUsage: [],
    aiCapabilities: [],
    summary: "",
  },
  assessment: {
    wow: null,
    complexity: null,
    effortLow: null,
    effortHigh: null,
    effortClass: "",
    effortBasis: "",
    complexityBasis: "",
    teamLow: null,
    teamHigh: null,
    workplace: "",
    ...assessment,
  },
  ...extra,
});

test("score cells retain identities, deduplicate inputs and distinguish missing from zero", () => {
  const { appealCells } = loadTs(source);
  const rows = [
    project("a", { wow: 8, complexity: 3 }),
    project("b", { wow: 8, complexity: 3 }),
    project("c", { wow: 0, complexity: 7 }),
    project("a", { wow: 8, complexity: 3 }),
  ];
  const cells = appealCells(rows);
  assert.deepEqual(cells.find((c) => c.x === "3" && c.y === "8").ids, [
    "a",
    "b",
  ]);
  assert.deepEqual(
    cells.find((c) => c.x === "Unknown" && c.y === "Unscored").ids,
    ["c"],
  );
  assert.equal(
    cells.reduce((n, c) => n + c.ids.length, 0),
    3,
  );
  assert.deepEqual(appealCells([]), []);
});

test("evidence priorities preserve provenance categories and do not treat a missing case as no outcome", () => {
  const { evidencePriorities } = loadTs(source);
  const rows = [
    project("cap", { wow: 9 }, { outcomeBasis: "Capability only" }),
    project(
      "measured",
      { wow: 10 },
      { outcomeBasis: "Owner-reported measurement" },
    ),
    project("low", { wow: 4 }),
    project("unknown"),
  ];
  const result = evidencePriorities(rows, 8);
  assert.deepEqual(
    result.projects.map((p) => p.id),
    ["measured", "cap"],
  );
  assert.deepEqual(
    result.candidates.map((p) => p.id),
    ["cap"],
  );
  assert.equal(
    result.cells.reduce((n, c) => n + c.ids.length, 0),
    2,
  );
  assert.equal(result.unscored, 1);
});

test("peer comparisons use only scoped semantic neighbours and retain independent context", () => {
  const { comparableProjects } = loadTs(source);
  const a = project("a", { wow: 8 }, { productTypes: ["CRO Consulting"] });
  const b = project("b", { wow: 9 }, { productTypes: ["CRO Consulting"] });
  const pairs = [
    { a: "b", b: "a", cosine: 0.7, technologyOverlap: 0, sharedTechnology: [] },
    {
      a: "a",
      b: "hidden",
      cosine: 0.99,
      technologyOverlap: 1,
      sharedTechnology: [],
    },
  ];
  const result = comparableProjects([a, b], pairs, "a");
  assert.equal(result.length, 1);
  assert.equal(result[0].project.id, "b");
  assert.equal(result[0].cosine, 0.7);
  assert.deepEqual(result[0].sharedProducts, ["CRO Consulting"]);
  assert.equal(result[0].technologyOverlap, 0);
  assert.deepEqual(comparableProjects([b], pairs, "a"), []);
});

test("team intervals keep partial unknowns out of the plot and context cells reconcile distinct projects", () => {
  const { teamIntervals, contextCells } = loadTs(source);
  const rows = [
    project("a", { teamLow: 0, teamHigh: 0, workplace: "Remote" }),
    project("b", { teamLow: 2, teamHigh: 7 }),
    project("c", { teamLow: 1, teamHigh: null }),
    project("bad", { teamLow: 8, teamHigh: 2 }),
  ];
  const result = teamIntervals(rows);
  assert.deepEqual(
    result.rows.map((p) => [p.id, p.low, p.high]),
    [
      ["b", 2, 7],
      ["a", 0, 0],
    ],
  );
  assert.equal(result.unknown, 2);
  assert.equal(
    contextCells(rows, "workplace").reduce((n, c) => n + c.ids.length, 0),
    4,
  );
  assert.deepEqual(
    contextCells(rows, "workplace").find((c) => c.x === "Unknown").ids,
    ["b", "c", "bad"],
  );
});

test("lifecycle cells preserve overlapping milestones without inferring retirement from engagement", () => {
  const { lifecycleCells } = loadTs(source);
  const rows = [
    project(
      "a",
      {},
      {
        matching: {
          stages: ["Production", "Production", "Retired"],
          maintenance: "Engagement ended",
        },
      },
    ),
    project(
      "b",
      {},
      {
        matching: {
          stages: ["Production (restricted access)"],
          maintenance: "Active development",
        },
      },
    ),
    project("c"),
  ];
  const cells = lifecycleCells(rows);
  assert.deepEqual(cells.find((c) => c.x === "Retired").ids, ["a"]);
  assert.deepEqual(cells.find((c) => c.x === "Production").ids, ["a"]);
  assert.deepEqual(cells.find((c) => c.x === "Not recorded").ids, ["c"]);
  assert.equal(
    cells.reduce((n, c) => n + c.ids.length, 0),
    4,
  );
});
