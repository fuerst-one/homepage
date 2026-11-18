import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { buildProjectSearchIndex, searchProjectIndex } = loadTs(
  new URL(
    "../apps/web/src/components/PlasmaLanding/projectSearch.ts",
    import.meta.url,
  ),
);
const { publishedKnowledgeDocuments } = loadTs(
  new URL("../apps/sync/src/knowledge/publicationSource.ts", import.meta.url),
);

const project = (id, overrides = {}) => ({
  id,
  name: id,
  oneLineSummary: "A public project",
  webUrl: `/en/projects/${id}`,
  tools: [],
  capabilities: [],
  methods: [],
  industries: [],
  languages: [],
  clientNames: [],
  featured: false,
  ...overrides,
});

test("description-only terms remain searchable alongside curated matching summaries", () => {
  const index = buildProjectSearchIndex([
    project("atlas", {
      oneLineSummary: "A photovoltaic monitoring interface",
      matching: {
        summary: "Public context",
        buyerNeeds: [],
        domains: [],
        aiCapabilities: [],
        aiUsage: [],
        stages: [],
      },
    }),
  ]);
  assert.deepEqual(
    searchProjectIndex(index, "photovoltaic").projects.map((p) => p.id),
    ["atlas"],
  );
});

test("embedding matches extend local search in relevance order without duplicates", () => {
  const index = buildProjectSearchIndex([project("atlas"), project("studio")]);
  assert.deepEqual(
    searchProjectIndex(index, "help buyers make confident choices", undefined, [
      "studio",
      "atlas",
      "studio",
      "withdrawn",
    ]).projects.map((p) => p.id),
    ["studio", "atlas"],
  );
});

test("an exact project name stays ahead of broader embedding matches", () => {
  const index = buildProjectSearchIndex([project("atlas"), project("studio")]);
  assert.deepEqual(
    searchProjectIndex(index, "atlas", undefined, [
      "studio",
      "atlas",
    ]).projects.map((p) => p.id),
    ["atlas", "studio"],
  );
});

test("embedding matches obey explicit technical tags and delivery constraints", () => {
  const index = buildProjectSearchIndex([
    project("remote-react", { tools: ["React.js"], workplace: "Remote" }),
    project("onsite-react", { tools: ["React.js"], workplace: "On-Premise" }),
    project("remote-vue", { tools: ["Vue.js"], workplace: "Remote" }),
  ]);
  assert.deepEqual(
    searchProjectIndex(
      index,
      "Remote React projects that help people choose",
      undefined,
      ["remote-vue", "onsite-react", "remote-react"],
    ).projects.map((p) => p.id),
    ["remote-react"],
  );
});

test("the embedding publication includes every public classification and excludes source-only fields", () => {
  const p = {
    ...project("atlas", {
      tools: ["Three.js"],
      methods: ["Prototyping"],
      capabilities: ["Frontend-Development"],
      industries: ["Retail & consumer goods"],
      languages: ["TypeScript"],
      productTypes: ["Web app"],
      targetMarket: ["B2B"],
      usageContext: ["Commercial"],
      deliveryModel: "SaaS",
      projectType: "Freelance",
      workplace: "Remote",
    }),
    description: { rich_text: [{ plain_text: "Public description" }] },
    clients: [{ name: "Public client" }],
    availableLocales: ["en"],
    caseStudyIds: { en: null, de: null },
    matching: {
      summary: "Public context",
      buyerNeeds: ["Improve conversion"],
      domains: ["Product configuration"],
      aiCapabilities: ["Translation"],
      aiUsage: ["AI-assisted delivery"],
      stages: ["Production"],
      ownership: "Solo delivery",
      maintenance: "Ongoing",
    },
    evidenceGaps: "PRIVATE NOTES",
    internalReview: "PRIVATE REVIEW",
  };
  const publication = { locales: { en: { projects: [p], studies: {} } } };
  const [doc] = publishedKnowledgeDocuments(publication);
  for (const value of [
    "Three.js",
    "Prototyping",
    "Frontend-Development",
    "Retail & consumer goods",
    "TypeScript",
    "Web app",
    "B2B",
    "Commercial",
    "SaaS",
    "Freelance",
    "Remote",
    "Public client",
    "Product configuration",
    "AI-assisted delivery",
  ])
    assert.ok(
      doc.text.includes(value),
      `Missing searchable metadata: ${value}`,
    );
  assert.ok(!doc.text.includes("PRIVATE"));
  p.tools = ["Vue.js"];
  assert.notEqual(
    publishedKnowledgeDocuments(publication)[0].hash,
    doc.hash,
    "changing tags invalidates the stored embedding document",
  );
});
