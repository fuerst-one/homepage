import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const source = new URL(
  "../scripts/project-lab/build-snapshot.ts",
  import.meta.url,
);
const fixture = () => ({
  database: {
    metadata: {
      publicationRefreshedAt: "2026-11-17T14:00:00Z",
      knowledgeSyncedAt: "2026-11-17T14:01:00Z",
      embeddingDimensions: 2,
    },
    projects: [
      {
        id: "a",
        name: "A",
        tools: ["React"],
        languages: ["TS"],
        capabilities: [],
        methods: [],
        caseStudyIds: { en: "study" },
        matching: {
          buyerNeeds: ["Build"],
          stages: [],
          domains: [],
          aiUsage: [],
          aiCapabilities: [],
          ownership: "Solo delivery",
          maintenance: "",
          summary: "Public summary",
        },
        websiteUrl: "https://private.invalid",
        logo: ["SIGNED_FILE_SECRET"],
      },
      {
        id: "b",
        name: "B",
        tools: [],
        languages: [],
        capabilities: [],
        methods: [],
        caseStudyIds: { en: null },
      },
      { id: "hidden", name: "Hidden" },
    ],
    studies: {
      study: [
        {
          richText: [{ plain_text: "hello world" }],
          caption: [{ plain_text: "four five" }],
          children: [{ richText: [{ plain_text: "three" }], children: [] }],
        },
      ],
    },
    documents: [
      {
        projectId: "a",
        locale: "en",
        matchesPublication: true,
        embeddingModel: "m",
        chunks: [{ embedding: [1, 0] }],
      },
      {
        projectId: "b",
        locale: "en",
        matchesPublication: false,
        embeddingModel: "m",
        chunks: [{ embedding: [1, 0] }],
      },
    ],
  },
  notion: {
    fetchedAt: "2026-11-17T14:02:00Z",
    pages: [
      {
        id: "a",
        last_edited_time: "2026-11-16T00:00:00Z",
        properties: {
          Hidden: { checkbox: false },
          "Outcome Basis": { select: { name: "Owner estimate" } },
          "Personal Contribution": { rich_text: [{ plain_text: "Solo work" }] },
          "Product type": { multi_select: [{ name: "Web app" }] },
          "Short Description": {
            rich_text: [{ plain_text: "Playlist analytics" }],
          },
          References: { SECRET: "REF_SECRET" },
          Screenshots: { url: "SIGNED_URL_SECRET" },
        },
      },
      { id: "hidden", properties: { Hidden: { checkbox: true } } },
      { id: "b", properties: { Hidden: { checkbox: false } } },
      {
        id: "private",
        properties: { Name: { title: [{ plain_text: "PRIVATE_ROW_SECRET" }] } },
      },
    ],
  },
  commercial: {
    matchedProjectIds: ["a"],
    coverageNotes: ["Source inspected"],
    findings: [
      {
        projectId: "a",
        field: "Tools",
        tag: "Vite",
        taxonomy: "existing",
        confidence: "high",
        reason: "Build configuration",
        evidence: [{ path: "/repo/vite.config.ts", line: 1 }],
      },
    ],
  },
  privateAudit: {
    projects: [
      {
        id: "b",
        proposals: [
          {
            field: "Tools",
            tag: "New tool",
            taxonomy: "new_candidate",
            confidence: "high",
            evidence: [
              { path: "/repo/tool.ts", line: 2, reason: "Implementation" },
            ],
          },
        ],
        reviewFlags: [
          {
            field: "Tools",
            tags: ["Old tool"],
            confidence: "medium",
            reason: "Historical support unclear",
            action: "review_support_not_remove",
          },
        ],
      },
    ],
    unmatchedRepos: [{ name: "Other repo" }],
  },
});

test("current publication can retain an explicitly older embedding counterview with separate provenance", () => {
  const { buildSnapshot } = loadTs(source);
  const inputs = fixture();
  const comparison = structuredClone(inputs.database);
  comparison.documents[1].matchesPublication = true;
  inputs.database.documents = [];
  inputs.database.metadata.publicationRefreshedAt = "2026-11-17T18:00:00Z";
  const result = buildSnapshot({ ...inputs, comparison });
  assert.equal(result.metadata.publicationRefreshedAt, "2026-11-17T18:00:00Z");
  assert.equal(
    result.metadata.comparisonPublicationRefreshedAt,
    "2026-11-17T14:00:00Z",
  );
  assert.equal(result.metadata.publicationEmbeddingDocuments, 0);
  assert.equal(result.metadata.embeddedProjects, 2);
  assert.equal(result.similarities.length, 1);
  inputs.notion.pages.find((p) => p.id === "b").properties.Hidden.checkbox =
    true;
  assert.equal(buildSnapshot({ ...inputs, comparison }).similarities.length, 0);
});

test("case words preserve formatting spans and linked punctuation without inventing spaces", () => {
  const { buildSnapshot } = loadTs(source);
  const inputs = fixture();
  inputs.database.studies.study = [
    {
      richText: [
        { plain_text: "inter" },
        { plain_text: "active" },
        { plain_text: ",", href: "https://example.com" },
        { plain_text: " experience" },
      ],
      caption: [
        { plain_text: "split" },
        { plain_text: "word" },
        { plain_text: "." },
      ],
      children: [{ richText: [{ plain_text: "Next block" }] }],
    },
  ];
  assert.equal(buildSnapshot(inputs).projects[0].caseStudyWords, 5);
});

test("lab snapshot keeps public safe projections and counts nested English case text", () => {
  const { buildSnapshot } = loadTs(source);
  const result = buildSnapshot(fixture());
  assert.deepEqual(
    result.projects.map((p) => p.id),
    ["a", "b"],
  );
  assert.equal(result.projects[0].caseStudyWords, 5);
  assert.equal(result.projects[0].outcomeBasis, "Owner estimate");
  assert.equal(result.projects[0].contribution, "Solo work");
  assert.deepEqual(result.projects[0].productTypes, ["Web app"]);
  assert.equal(result.projects[0].shortDescription, "Playlist analytics");
  for (const secret of [
    "SIGNED_FILE_SECRET",
    "REF_SECRET",
    "SIGNED_URL_SECRET",
    "PRIVATE_ROW_SECRET",
    "private.invalid",
    "embedding",
  ])
    assert.equal(JSON.stringify(result.projects).includes(secret), false);
});

test("semantic export requires confirmed current hashes and omits vectors from output", () => {
  const { buildSnapshot } = loadTs(source);
  const inputs = fixture();
  const stale = buildSnapshot(inputs);
  assert.deepEqual(stale.similarities, []);
  assert.equal(stale.metadata.embeddedProjects, 1);
  inputs.database.documents[1].matchesPublication = true;
  const current = buildSnapshot(inputs);
  assert.equal(current.similarities.length, 1);
  assert.equal(current.similarities[0].cosine, 1);
  assert.equal(JSON.stringify(current).includes('"embedding":'), false);
  delete inputs.database.documents[1].matchesPublication;
  assert.deepEqual(buildSnapshot(inputs).similarities, []);
  inputs.database.documents[1].matchesPublication = true;
  inputs.database.documents[1].chunks[0].content = "Changed chunk";
  inputs.database.documents[1].chunks[0].contentHash = "stale-chunk-hash";
  assert.deepEqual(buildSnapshot(inputs).similarities, []);
});

test("fresh Notion metadata supersedes publication labels and keeps empty observations unknown", () => {
  const { buildSnapshot } = loadTs(source);
  const inputs = fixture();
  Object.assign(inputs.notion.pages[0].properties, {
    "Wow-Factor 1-10": { number: 8 },
    "Complexity 1-5": { number: 3 },
    "Effort Days Low": { number: 0 },
    "Effort Days High": { number: 30 },
    "Effort Class (upper)": { select: { name: "M" } },
    "Team Size Low": { number: 1 },
    "Team Size High": { number: null },
    Workplace: { select: { name: "Remote" } },
    "Delivery Stages": {
      multi_select: [{ name: "Production (restricted access)" }],
    },
    "Buyer Needs": { multi_select: [] },
  });
  const result = buildSnapshot(inputs);
  assert.equal(result.projects[0].assessment.wow, 8);
  assert.equal(result.projects[0].assessment.effortLow, 0);
  assert.equal(result.projects[0].assessment.teamHigh, null);
  assert.equal(result.projects[0].assessment.workplace, "Remote");
  assert.deepEqual(result.projects[0].matching.buyerNeeds, []);
  assert.deepEqual(result.projects[0].matching.stages, [
    "Production (restricted access)",
  ]);
  assert.equal(result.projects[0].matching.ownership, "Solo delivery");
  assert.equal(result.projects[1].assessment.wow, null);
});

test("audits preserve taxonomy candidates and review flags without treating findings count as coverage", () => {
  const { buildSnapshot } = loadTs(source);
  const result = buildSnapshot(fixture());
  assert.deepEqual(
    result.findings.map((f) => f.kind),
    ["missing", "taxonomy", "review"],
  );
  assert.equal(result.findings[0].property, "Tools");
  assert.deepEqual(result.findings[0].paths, ["/repo/vite.config.ts:1"]);
  assert.equal(result.metadata.auditCoverage.matchedProjects, 2);
  assert.deepEqual(result.metadata.auditCoverage.unmatchedProjects, []);
  assert.match(result.findings[2].caveat, /remove/i);
});

test("a project no longer returned by Notion cannot survive only through the older publication", () => {
  const { buildSnapshot } = loadTs(source);
  const inputs = fixture();
  inputs.notion.pages = inputs.notion.pages.filter((p) => p.id !== "b");
  assert.deepEqual(
    buildSnapshot(inputs).projects.map((p) => p.id),
    ["a"],
  );
});
