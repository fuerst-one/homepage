import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const multi = (...names) => ({ multi_select: names.map((name) => ({ name })) });
const select = (name) => ({ select: { name } });
const page = (properties = {}) => ({
  id: "public-project",
  properties: {
    Hidden: { checkbox: false },
    Name: { title: [{ plain_text: "Example" }] },
    "Project Description": {
      rich_text: [{ plain_text: "Public description" }],
    },
    Sector: select("Software & business services"),
    "Product type": multi("Developer tool"),
    "Usage context": multi("Internal"),
    "Buyer Needs": multi("Sell products"),
    "Project Domains": multi("Developer tooling"),
    Capabilities: multi("Frontend-Development"),
    Tools: multi("TypeScript"),
    ...properties,
  },
});

test("reviewed new taxonomy survives source and public projections", () => {
  const { readNotionProjectTaxonomy, publicProjectTaxonomy } = loadTs(
    new URL("../packages/content/src/projectTaxonomy.ts", import.meta.url),
  );
  const { readPublicProjectCase, caseLabel } = loadTs(
    new URL("../packages/content/src/projectCase.ts", import.meta.url),
  );
  const source = page({
    "Delivery model": select("Open Source"),
    "Delivery Stages": multi("Production (restricted access)", "Retired"),
    "AI Capabilities": multi(
      "Data parsing",
      "Code refactoring",
      "Geo suggestion",
      "Trip planning",
      "Routing",
    ),
  });
  const taxonomy = publicProjectTaxonomy(readNotionProjectTaxonomy(source));
  assert.deepEqual(taxonomy.productTypes, ["Developer tool"]);
  assert.equal(taxonomy.deliveryModel, "Open Source");
  const matching = readPublicProjectCase(source);
  assert.deepEqual(matching.stages, [
    "Production (restricted access)",
    "Retired",
  ]);
  assert.deepEqual(matching.buyerNeeds, ["Sell products"]);
  assert.equal(matching.aiCapabilities.length, 5);
  for (const value of [
    ...matching.stages,
    ...matching.aiCapabilities,
    "Sell products",
    "Developer tool",
    "Open Source",
  ])
    assert.notEqual(caseLabel(value, "de"), value);
});

test("source review reports unknown values and core-field regressions without admitting private values", () => {
  const { reviewProjectSource } = loadTs(
    new URL("../packages/content/src/projectSourceReview.ts", import.meta.url),
  );
  const { readNotionProjectTaxonomy } = loadTs(
    new URL("../packages/content/src/projectTaxonomy.ts", import.meta.url),
  );
  const source = page({
    "Product type": multi("Web app", "Private unreviewed format"),
    "Target market": multi("Personal"),
    "AI Capabilities": multi("Private unreviewed capability"),
    Capabilities: multi(),
  });
  const issues = reviewProjectSource(source);
  assert.ok(
    issues.some(
      (i) =>
        i.field === "Product type" &&
        i.values.includes("Private unreviewed format"),
    ),
  );
  assert.ok(
    issues.some(
      (i) => i.field === "Target market" && i.values.includes("Personal"),
    ),
  );
  assert.ok(issues.some((i) => i.field === "AI Capabilities"));
  assert.ok(
    issues.some(
      (i) => i.field === "Capabilities" && i.reason === "missing-required",
    ),
  );
  assert.deepEqual(readNotionProjectTaxonomy(source).productTypes, ["Web app"]);
  assert.deepEqual(reviewProjectSource(page()), []);
});

test("hidden and withdrawn sources produce no review details or completeness warnings", () => {
  const { reviewProjectSource } = loadTs(
    new URL("../packages/content/src/projectSourceReview.ts", import.meta.url),
  );
  for (const source of [
    page({ Hidden: { checkbox: true } }),
    { ...page(), archived: true },
    { ...page(), in_trash: true },
  ])
    assert.deepEqual(reviewProjectSource(source), []);
});

test("every target market and AI capability Notion offers survives the public projection", () => {
  const { reviewProjectSource } = loadTs(
    new URL("../packages/content/src/projectSourceReview.ts", import.meta.url),
  );
  const { readNotionProjectTaxonomy, publicProjectTaxonomy } = loadTs(
    new URL("../packages/content/src/projectTaxonomy.ts", import.meta.url),
  );
  const { readPublicProjectCase, caseLabel } = loadTs(
    new URL("../packages/content/src/projectCase.ts", import.meta.url),
  );
  const source = page({
    "Target market": multi("Direct Consumer", "OSS"),
    "AI Capabilities": multi("Suggestion generation", "Data analysis"),
  });
  assert.deepEqual(reviewProjectSource(source), []);
  assert.deepEqual(
    publicProjectTaxonomy(readNotionProjectTaxonomy(source)).targetMarket,
    ["Direct Consumer", "OSS"],
  );
  const { aiCapabilities } = readPublicProjectCase(source);
  assert.deepEqual(aiCapabilities, ["Suggestion generation", "Data analysis"]);
  for (const value of [...aiCapabilities, "Direct Consumer"])
    assert.notEqual(caseLabel(value, "de"), value);
});

test("retired sector-like domains are flagged in Notion but still label and resolve old links", () => {
  const { reviewProjectSource } = loadTs(
    new URL("../packages/content/src/projectSourceReview.ts", import.meta.url),
  );
  const { caseLabel } = loadTs(
    new URL("../packages/content/src/projectCase.ts", import.meta.url),
  );
  const { projectCaseAliases } = loadTs(
    new URL("../packages/content/src/enquiryEvidence.ts", import.meta.url),
  );
  const issues = reviewProjectSource(
    page({ "Project Domains": multi("Developer tooling", "Public sector") }),
  );
  assert.deepEqual(
    issues.filter((i) => i.field === "Project Domains").map((i) => i.values),
    [["Public sector"]],
  );
  assert.equal(caseLabel("Public sector", "de"), "Öffentlicher Sektor");
  assert.ok(projectCaseAliases("domains", "Public sector").includes("kommune"));
});

test("schema review flags Notion options the code does not know, in controlled fields only", () => {
  const { reviewProjectSchema } = loadTs(
    new URL("../packages/content/src/projectSourceReview.ts", import.meta.url),
  );
  const options = (...names) => ({
    multi_select: { options: names.map((name) => ({ name })) },
  });
  assert.deepEqual(
    reviewProjectSchema({
      "Target market": { type: "multi_select", ...options("B2B", "Retail") },
      "Buyer Needs": { type: "multi_select", ...options("Sell products") },
      Tools: { type: "multi_select", ...options("Anything goes") },
    }),
    [{ field: "Target market", reason: "unknown-option", values: ["Retail"] }],
  );
});

test("product formats editors added in Notion are published", () => {
  const { reviewProjectSource } = loadTs(
    new URL("../packages/content/src/projectSourceReview.ts", import.meta.url),
  );
  const { readNotionProjectTaxonomy, publicProjectTaxonomy } = loadTs(
    new URL("../packages/content/src/projectTaxonomy.ts", import.meta.url),
  );
  const source = page({
    "Product type": multi("MCP Server", "Concept", "Clickdummy"),
  });
  assert.deepEqual(reviewProjectSource(source), []);
  assert.deepEqual(
    publicProjectTaxonomy(readNotionProjectTaxonomy(source)).productTypes,
    ["MCP Server", "Concept", "Clickdummy"],
  );
});
