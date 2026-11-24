import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const {
  atlasMemberships,
  atlasGroups,
  atlasRelated,
  projectAtlasData,
  atlasSearch,
  atlasLayout,
  atlasMapHeight,
} = loadTs(
  new URL(
    "../apps/web/src/components/ExperienceAtlas/model.ts",
    import.meta.url,
  ),
);
const project = (id, overrides = {}) => ({
  id,
  name: id,
  shortDescription: "",
  projectType: "Freelance",
  startDate: "2024-01-01",
  endDate: null,
  tools: [],
  languages: [],
  capabilities: [],
  methods: [],
  productTypes: [],
  targetMarket: [],
  matching: {
    buyerNeeds: [],
    domains: [],
    stages: [],
    summary: "",
    ownership: "",
    maintenance: "",
    aiUsage: [],
    aiCapabilities: [],
  },
  ...overrides,
});

test("primary maps conserve project identities and retain unknowns and overlapping memberships", () => {
  const a = project("a", {
    matching: {
      buyerNeeds: [
        "Launch a new product",
        "Make data actionable",
        "Launch a new product",
      ],
    },
  });
  const b = project("b", { name: "Same name" });
  const c = project("c", {
    name: "Same name",
    matching: { buyerNeeds: ["Future taxonomy value"] },
  });
  const groups = atlasGroups([a, b, c], "challenge");
  assert.deepEqual(groups.flatMap((g) => g.projects.map((p) => p.id)).sort(), [
    "a",
    "b",
    "c",
  ]);
  assert.equal(groups.find((g) => g.id === "unmapped").projects.length, 2);
  assert.deepEqual(atlasMemberships(a, "challenge"), ["launch", "data"]);
  assert.deepEqual(atlasGroups([a, b, c], "challenge"), groups);
});

test("specific product tags place a game ahead of its generic web-app infrastructure", () => {
  assert.equal(
    atlasMemberships(
      project("a", { productTypes: ["Web app", "Game"] }),
      "product",
    )[0],
    "interactive",
  );
});

test("generic client needs only decide the primary group when nothing more specific is recorded", () => {
  const needs = (buyerNeeds) =>
    project("a", { matching: { ...project("a").matching, buyerNeeds } });
  assert.deepEqual(
    atlasMemberships(
      needs(["Work in a team", "Improve conversion", "Make data actionable"]),
      "challenge",
    ),
    ["growth", "data", "systems"],
  );
  assert.deepEqual(
    atlasMemberships(
      needs(["Maintain and evolve a product", "Work in a team"]),
      "challenge",
    ),
    ["systems"],
  );
});

test("API and MCP Server only decide the product group when no other format is recorded", () => {
  assert.deepEqual(
    atlasMemberships(
      project("a", { productTypes: ["Web app", "MCP Server", "API"] }),
      "product",
    ),
    ["apps", "integrations"],
  );
  assert.equal(
    atlasMemberships(project("b", { productTypes: ["API"] }), "product")[0],
    "integrations",
  );
  assert.equal(
    atlasMemberships(
      project("c", { productTypes: ["Web app", "API", "Developer tool"] }),
      "product",
    )[0],
    "integrations",
  );
});

test("cross-field neighbours require distinct known domains and explain real shared work", () => {
  const match = {
    buyerNeeds: ["Improve a complex interface"],
    stages: [],
    aiUsage: [],
    aiCapabilities: [],
    summary: "",
  };
  const rows = [
    project("a", {
      matching: { ...match, domains: ["E-commerce"] },
      capabilities: ["UX-Design", "User Testing"],
      methods: [],
    }),
    project("b", {
      matching: { ...match, domains: ["Logistics and maritime"] },
      capabilities: ["UX-Design", "User Testing"],
      methods: [],
    }),
    project("c", {
      matching: { ...match, domains: ["E-commerce"] },
      capabilities: ["UX-Design"],
      methods: [],
    }),
    project("d", {
      matching: { ...match, domains: [] },
      capabilities: ["UX-Design"],
      methods: [],
    }),
  ];
  const result = atlasRelated(rows, "a");
  assert.deepEqual(
    result.map((r) => r.id),
    ["b"],
  );
  assert.ok(result[0].reasons.includes("Improve a complex interface"));
  assert.ok(result[0].reasons.includes("UX-Design"));
  assert.deepEqual(atlasRelated(rows, "unknown"), []);
});

test("client projection excludes private audit fields and attaches media by identity", () => {
  const p = project("a", {
    assessment: { effortLow: 200 },
    evidenceGaps: "private",
    contribution: "Frontend implementation",
    outcomeEvidence: "Owner-reported outcome",
  });
  const [result] = projectAtlasData(
    [p],
    [
      {
        id: "a",
        name: "Old name",
        screenshots: ["/image.png"],
        caseStudyIds: { en: null },
      },
    ],
  );
  assert.equal(result.contribution, "Frontend implementation");
  assert.deepEqual(result.screenshots, ["/image.png"]);
  assert.equal("assessment" in result, false);
  assert.equal("evidenceGaps" in result, false);
});

test("atlas exposes the recorded wow rating, without inventing missing or invalid scores", () => {
  const rows = projectAtlasData(
    [
      project("rated", { assessment: { wow: 8, effortLow: 200 } }),
      project("missing"),
      project("zero", { assessment: { wow: 0 } }),
      project("invalid", { assessment: { wow: 11 } }),
    ],
    [],
  );
  assert.deepEqual(
    rows.map((p) => p.wowFactor),
    [8, null, null, null],
  );
  assert.ok(rows.every((p) => !("assessment" in p)));
});

test("skill search finds practices and languages, including natural spacing", () => {
  const rows = projectAtlasData(
    [
      project("a", {
        capabilities: ["UX-Design", "User Testing"],
        methods: [],
        languages: ["TypeScript"],
      }),
      project("b", { tools: ["React.js"] }),
    ],
    [],
  );
  for (const query of ["UX design", "user testing", "typescript"]) {
    assert.deepEqual(
      atlasSearch(rows, query).map((p) => p.id),
      ["a"],
    );
  }
  assert.deepEqual(
    atlasSearch(rows, "  React.js ").map((p) => p.id),
    ["b"],
  );
  assert.equal(atlasSearch(rows, "unknown skill").length, 0);
  assert.equal(atlasSearch(rows, "").length, 2);
});

test("dense and unmapped datasets keep every project inside the navigable map", () => {
  for (const known of [false, true]) {
    const rows = Array.from({ length: 42 }, (_, i) =>
      project(String(i), { productTypes: known ? ["Web app"] : [] }),
    );
    const layout = atlasLayout(rows, "product");
    const nodes = layout.flatMap((group) => group.nodes);
    assert.equal(new Set(nodes.map((n) => n.project.id)).size, 42);
    assert.ok(
      nodes.every(
        (n) => n.x > 0 && n.x < 1170 && n.y > 0 && n.y < atlasMapHeight(layout),
      ),
    );
  }
});

test("Atlas industries classify the market independently of project use cases", () => {
  const { atlasGroups, atlasMemberships } = loadTs(
    new URL(
      "../apps/web/src/components/ExperienceAtlas/model.ts",
      import.meta.url,
    ),
  );
  const project = {
    id: "seabo",
    industries: ["Maritime & logistics"],
    productTypes: ["Web app"],
    matching: { domains: ["Logistics operations"], buyerNeeds: [] },
  };
  assert.ok(!atlasMemberships(project, "industry").includes("unmapped"));
  const [group] = atlasGroups([project], "industry");
  assert.equal(group.label, "Maritime & logistics");
  assert.deepEqual(
    atlasMemberships({ ...project, industries: [] }, "industry"),
    ["unmapped"],
  );
});

test("migrated methods remain searchable and explain cross-sector related work", () => {
  const rows = [
    project("a", { industries: ["Retail"], methods: ["User Testing"] }),
    project("b", { industries: ["Healthcare"], methods: ["User Testing"] }),
  ];
  assert.deepEqual(atlasRelated(rows, "a"), [
    { id: "b", reasons: ["User Testing"] },
  ]);
  assert.deepEqual(
    atlasSearch(projectAtlasData(rows, []), "user testing").map((p) => p.id),
    ["a", "b"],
  );
});

test("every public buyer need has an Atlas use-case group and a German term", () => {
  const { CASE_VOCABULARY } = loadTs(
    new URL("../packages/content/src/projectCase.ts", import.meta.url),
  );
  const { ATLAS_DE } = loadTs(
    new URL(
      "../apps/web/src/components/ExperienceAtlas/atlasCopy.ts",
      import.meta.url,
    ),
  );
  for (const need of Object.keys(CASE_VOCABULARY.buyerNeeds)) {
    const memberships = atlasMemberships(
      { matching: { buyerNeeds: [need], domains: [] } },
      "challenge",
    );
    assert.ok(!memberships.includes("unmapped"), `${need} has no Atlas group`);
    assert.ok(ATLAS_DE[need], `${need} has no German Atlas term`);
  }
});

test("every product format has an Atlas product group and a German term", () => {
  const { PRODUCT_FORMATS } = loadTs(
    new URL("../packages/content/src/projectTaxonomy.ts", import.meta.url),
  );
  const { ATLAS_DE } = loadTs(
    new URL(
      "../apps/web/src/components/ExperienceAtlas/atlasCopy.ts",
      import.meta.url,
    ),
  );
  for (const format of PRODUCT_FORMATS) {
    const memberships = atlasMemberships({ productTypes: [format] }, "product");
    assert.ok(
      !memberships.includes("unmapped"),
      `${format} has no Atlas group`,
    );
    assert.ok(ATLAS_DE[format], `${format} has no German Atlas term`);
  }
});
