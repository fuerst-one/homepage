import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const { embeddingInput, embeddingKey } = loadTs(
  new URL(
    "../apps/web/src/components/ExperienceAtlas/embeddingInputs.ts",
    import.meta.url,
  ),
);
const { buildSemanticSpace, rankSpaceNeighbours, prepareSemanticSpaces } =
  loadTs(
    new URL(
      "../apps/web/src/components/ExperienceAtlas/semanticSpaces.ts",
      import.meta.url,
    ),
  );
const { projectDistances } = loadTs(
  new URL(
    "../apps/web/src/components/ProjectLab/clustering.ts",
    import.meta.url,
  ),
);
const p = (id, extra = {}) => ({
  id,
  name: id,
  shortDescription: "Design editor",
  tools: ["React", "Three.js"],
  languages: ["TypeScript"],
  capabilities: ["UX-Design"],
  methods: [],
  productTypes: ["Web app"],
  matching: {
    summary: "Edit designs and preview the result",
    buyerNeeds: ["Improve a complex interface"],
    ownership: "Product engineering owner",
    stages: ["Production"],
  },
  ...extra,
});

test("embedding recipes combine only their declared fields and never names or audit material", () => {
  const project = p("private-name", {
    name: "SECRET_TITLE",
    assessment: { effortBasis: "SECRET_ESTIMATE" },
    evidenceGaps: "SECRET_GAPS",
    contribution: "SECRET_NOTES",
  });
  const product = embeddingInput(project, "product");
  assert.ok(product.includes("Web app") && !product.includes("Design editor"));
  assert.ok(!product.includes("React"));
  const technical = embeddingInput(project, "engineering");
  assert.ok(
    technical.includes("React") &&
      technical.includes("TypeScript") &&
      !technical.includes("UX-Design"),
  );
  for (const recipe of ["product", "engineering", "practice"])
    assert.ok(!embeddingInput(project, recipe).includes("SECRET"));
  assert.equal(
    embeddingInput(
      p("empty", { tools: [], languages: [], capabilities: [] }),
      "engineering",
    ),
    "",
  );
});

test("cache keys change with relevant content and model, not title or tag ordering", () => {
  const a = p("a");
  const key = embeddingKey(a, "engineering", "model-a");
  assert.equal(
    key,
    embeddingKey(
      { ...a, name: "renamed", tools: ["Three.js", "React", "React"] },
      "engineering",
      "model-a",
    ),
  );
  assert.notEqual(
    key,
    embeddingKey({ ...a, tools: ["Vue"] }, "engineering", "model-a"),
  );
  assert.notEqual(key, embeddingKey(a, "engineering", "model-b"));
});

test("3D projection recovers a tetrahedron that cannot fit in two dimensions", () => {
  const distances = Array.from({ length: 4 }, (_, i) =>
    Array.from({ length: 4 }, (_, j) => (i === j ? 0 : 1)),
  );
  const three = projectDistances(distances, 3);
  const two = projectDistances(distances);
  assert.ok(three.points.every((row) => row.length === 3));
  assert.ok(three.stress < 1e-8);
  assert.ok(two.stress > 0.1);
  assert.ok(Math.abs(three.retainedVariance - 1) < 1e-8);
  assert.ok(Math.abs(two.retainedVariance - 2 / 3) < 1e-8);
});

test("space keeps duplicate coordinates as distinct projects and ranks in full vector space", () => {
  const projects = [p("a"), p("b"), p("c"), p("d")];
  const result = buildSemanticSpace(projects, "product", [
    [1, 0, 0],
    [5, 0, 0],
    [0.8, 0.6, 0],
    [0, 0, 1],
  ]);
  assert.deepEqual(result.ids, ["a", "b", "c", "d"]);
  assert.deepEqual(
    rankSpaceNeighbours(result, "a").map((row) => row.id),
    ["b", "c", "d"],
  );
  assert.equal(rankSpaceNeighbours(result, "a")[0].similarity, 1);
  assert.ok(result.positions3d.every((row) => row.every(Number.isFinite)));
  assert.deepEqual(rankSpaceNeighbours(result, "missing"), []);
});

test("missing, stale and invalid vectors are excluded with reasons, never invented", () => {
  const projects = [p("a"), p("b"), p("c"), p("d")];
  const records = [
    {
      id: "a",
      recipe: "engineering",
      hash: embeddingKey(projects[0], "engineering", "model"),
      embedding: [1, 0],
    },
    { id: "b", recipe: "engineering", hash: "stale", embedding: [0, 1] },
    {
      id: "c",
      recipe: "engineering",
      hash: embeddingKey(projects[2], "engineering", "model"),
      embedding: [0, 0],
    },
  ];
  const result = prepareSemanticSpaces(projects, {
    version: 1,
    model: "model",
    dimensions: 2,
    generatedAt: "2026-11-17",
    records,
  });
  assert.deepEqual(result.spaces.engineering.ids, ["a"]);
  assert.deepEqual(
    result.spaces.engineering.excluded.map((row) => row.id).sort(),
    ["b", "c", "d"],
  );
  assert.equal(result.spaces.product.ids.length, 0);
});

test("industry reclassification preserves vectors; product-format edits invalidate only the product lens", () => {
  const original = p("a", { industries: ["Software"], targetMarket: ["B2B"] });
  const reclassified = {
    ...original,
    industries: ["Automotive"],
    targetMarket: ["B2C"],
    usageContext: ["Personal"],
    deliveryModel: "SaaS",
  };
  for (const recipe of ["product", "engineering", "practice"]) {
    assert.equal(
      embeddingKey(original, recipe, "model-a"),
      embeddingKey(reclassified, recipe, "model-a"),
    );
    const formatChanged = {
      ...reclassified,
      productTypes: ["Hardware / embedded"],
    };
    const changed =
      embeddingKey(original, recipe, "model-a") !==
      embeddingKey(formatChanged, recipe, "model-a");
    assert.equal(changed, recipe === "product");
  }
});

test("cleaned use cases shape product vectors independently of sector", () => {
  const original = p("a");
  const project = {
    ...original,
    industries: ["Automotive"],
    matching: { ...original.matching, domains: ["Product configuration"] },
  };
  assert.ok(
    embeddingInput(project, "product").includes(
      "Use cases: Product configuration",
    ),
  );
  assert.ok(!embeddingInput(project, "product").includes("Automotive"));
  assert.notEqual(
    embeddingKey(original, "product", "model"),
    embeddingKey(project, "product", "model"),
  );
  assert.equal(
    embeddingKey(original, "engineering", "model"),
    embeddingKey(project, "engineering", "model"),
  );
});

test("wow-factor changes do not invalidate or influence semantic vectors", () => {
  const original = p("a", { assessment: { wow: 2 } });
  const edited = { ...original, assessment: { wow: 10 } };
  for (const recipe of ["product", "engineering", "practice"]) {
    assert.equal(
      embeddingKey(original, recipe, "model"),
      embeddingKey(edited, recipe, "model"),
    );
  }
});
