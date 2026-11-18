import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const { runEmbeddingExperiment } = loadTs(
  new URL(
    "../apps/web/src/components/ExperienceAtlas/embeddingExperiments.ts",
    import.meta.url,
  ),
);
const { fieldsInput, DEFAULT_FIELDS, fieldAvailability, selectionCoverage } =
  loadTs(
    new URL(
      "../apps/web/src/components/ExperienceAtlas/embeddingFields.ts",
      import.meta.url,
    ),
  );
const { embeddingInput } = loadTs(
  new URL(
    "../apps/web/src/components/ExperienceAtlas/embeddingInputs.ts",
    import.meta.url,
  ),
);
const project = (id, tools = ["React"]) => ({
  id,
  name: id,
  shortDescription: "Editor",
  tools,
  languages: ["TypeScript"],
  capabilities: ["UX"],
  methods: [],
  productTypes: ["Web app"],
  industries: ["Software"],
  matching: {
    summary: "Design a product",
    buyerNeeds: ["Improve interface"],
    domains: ["Editing"],
    ownership: "Solo",
    stages: ["Production"],
  },
});
const setup = () => {
  const calls = [];
  return {
    calls,
    options: {
      model: "test",
      dimensions: 3,
      cache: new Map(),
      embed: async (texts) => {
        calls.push(texts);
        return texts.map((t) =>
          t.includes("Vue")
            ? [0, 1, 0]
            : t.includes("Languages") || t.includes("Programming")
              ? [0, 0, 1]
              : [1, 0.2, 0.1],
        );
      },
    },
  };
};
test("default field selections reproduce existing joint recipe texts", () => {
  for (const recipe of Object.keys(DEFAULT_FIELDS))
    assert.equal(
      fieldsInput(project("a"), DEFAULT_FIELDS[recipe]),
      embeddingInput(project("a"), recipe),
    );
});
test("joint and blend use the same complete projects, cache canonical inputs and reuse filters", async () => {
  const { calls, options } = setup(),
    projects = [project("a"), project("b", ["Vue"]), project("missing", [])];
  const request = { recipe: "engineering", fields: ["tools", "languages"] };
  const a = await runEmbeddingExperiment(projects, request, options);
  assert.equal(a.included, 2);
  assert.deepEqual(a.joint.space.ids, a.blend.space.ids);
  assert.ok(
    a.joint.space.similarities[0][1] !== a.blend.space.similarities[0][1],
  );
  const requests = calls.length;
  const b = await runEmbeddingExperiment(
    projects,
    { ...request, fields: ["languages", "tools"] },
    options,
  );
  assert.equal(calls.length, requests);
  assert.equal(b.newVectors, 0);
  const filtered = await runEmbeddingExperiment(
    projects,
    { ...request, projectIds: ["a"] },
    options,
  );
  assert.deepEqual(filtered.joint.space.ids, ["a"]);
  assert.equal(calls.length, requests);
});
test("changed content regenerates only affected field and joint vectors", async () => {
  const { calls, options } = setup(),
    request = { recipe: "engineering", fields: ["tools", "languages"] };
  await runEmbeddingExperiment([project("a")], request, options);
  calls.length = 0;
  const result = await runEmbeddingExperiment(
    [project("a", ["Vue"])],
    request,
    options,
  );
  assert.equal(result.newVectors, 2);
  assert.equal(calls.flat().length, 2);
});
test("unknown fields, unknown project IDs, and zero vectors cannot enter a comparison", async () => {
  const { options } = setup();
  await assert.rejects(
    runEmbeddingExperiment(
      [project("a")],
      { recipe: "product", fields: ["evidenceGaps"] },
      options,
    ),
  );
  await assert.rejects(
    runEmbeddingExperiment(
      [project("a")],
      { recipe: "product", fields: ["tools"], projectIds: ["private"] },
      options,
    ),
  );
  await assert.rejects(
    runEmbeddingExperiment(
      [project("a")],
      { recipe: "product", fields: ["tools"] },
      { ...options, embed: async (texts) => texts.map(() => [0, 0, 0]) },
    ),
  );
});

test("coverage previews count incomplete projects once and follow the selected subset", () => {
  const projects = [
    project("complete"),
    { ...project("both-missing", []), languages: ["  "] },
    { ...project("language-missing"), languages: [] },
  ];
  const available = fieldAvailability(projects);
  const all = selectionCoverage(
    projects.map((p) => p.id),
    ["tools", "languages"],
    available,
  );
  assert.deepEqual(all.readyIds, ["complete"]);
  assert.deepEqual(all.incompleteIds, ["both-missing", "language-missing"]);
  assert.deepEqual(all.missingByField.tools, ["both-missing"]);
  assert.deepEqual(all.missingByField.languages, [
    "both-missing",
    "language-missing",
  ]);
  const filtered = selectionCoverage(
    ["complete", "language-missing"],
    ["tools"],
    available,
  );
  assert.equal(filtered.readyIds.length, 2);
  assert.equal(filtered.missingByField.tools.length, 0);
  assert.equal(filtered.missingByField.languages.length, 1);
  assert.equal(
    selectionCoverage(["complete"], [], available).readyIds.length,
    0,
  );
  assert.deepEqual(
    selectionCoverage([], ["tools"], available).incompleteIds,
    [],
  );
});

test("additional public fields support numbers and missing values without exposing research notes", () => {
  const p = {
    ...project("a"),
    projectType: "Startup",
    status: "Active",
    startDate: "2025-01-01",
    endDate: null,
    deliveryEvidence: "Released product",
    outcomeEvidence: "Measured outcome",
    contributionBasis: "Owner confirmed",
    caseStudyWords: 0,
    assessment: { wow: 8, effortBasis: "PRIVATE_NOTES" },
    matching: { ...project("a").matching, maintenance: "Active development" },
  };
  const text = fieldsInput(p, [
    "name",
    "projectType",
    "status",
    "startDate",
    "endDate",
    "maintenance",
    "deliveryEvidence",
    "outcomeEvidence",
    "contributionBasis",
    "caseStudyWords",
    "wowFactor",
  ]);
  assert.ok(text.includes("Wow factor: 8"));
  assert.ok(text.includes("Case study length (words): 0"));
  assert.ok(text.includes("Maintenance: Active development"));
  assert.ok(text.includes("Delivery: Released product"));
  assert.ok(!text.includes("End date:"));
  assert.ok(!text.includes("PRIVATE_NOTES"));
  assert.throws(() => fieldsInput(p, ["effortBasis"]));
  const available = fieldAvailability([p]);
  assert.deepEqual(available.find((f) => f.id === "wowFactor").projectIds, [
    "a",
  ]);
  assert.deepEqual(available.find((f) => f.id === "endDate").projectIds, []);
});

test("public scale fields preserve units, ranges, zero and provenance without research notes", () => {
  const p = {
    ...project("scale"),
    scale: {
      complexity: 4,
      complexityBasis: "assessment",
      teamLow: 2,
      teamHigh: 6,
      effortLow: 20,
      effortHigh: 40,
      effortBasis: "rebuild-estimate",
      codeSloc: 12000,
      testSloc: 0,
      sourceFiles: 150,
      workingPattern: "Async",
      privateNotes: "/private/repository",
    },
  };
  const input = fieldsInput(p, [
    "complexity",
    "teamSize",
    "effort",
    "codeSloc",
    "testSloc",
    "sourceFiles",
    "workingPattern",
  ]);
  assert.match(input, /Complexity: 4\/5 \(assessment\)/);
  assert.match(input, /Team size: 2–6 people/);
  assert.match(input, /Effort: 20–40 person-days \(rebuild estimate\)/);
  assert.match(input, /Test code: 0 source lines/);
  assert.doesNotMatch(input, /private|repository/);
  const availability = fieldAvailability([
    p,
    { ...project("missing"), scale: {} },
  ]);
  const coverage = selectionCoverage(
    ["scale", "missing"],
    ["testSloc"],
    availability,
  );
  assert.deepEqual(coverage.readyIds, ["scale"]);
  assert.equal(
    fieldsInput({ ...p, scale: { teamLow: 2 } }, ["teamSize"]),
    "Team size: at least 2 people (upper bound unrecorded)",
  );
});
