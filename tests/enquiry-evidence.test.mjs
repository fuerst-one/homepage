import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { readPublicProjectCase, caseLabel } = loadTs(
  new URL("../packages/content/src/projectCase.ts", import.meta.url),
);
const { selectEnquiryEvidence } = loadTs(
  new URL("../packages/content/src/enquiryEvidence.ts", import.meta.url),
);
const profile = (values = {}) => ({
  buyerNeeds: [],
  stages: [],
  domains: [],
  aiUsage: [],
  aiCapabilities: [],
  ownership: "",
  maintenance: "",
  summary: "",
  ...values,
});
const project = (id, values = {}) => ({
  id,
  name: id,
  href: `/en/projects/${id}`,
  summary: "Public summary",
  caseStudy: profile(values),
});
const konfig = project("konfig", {
  buyerNeeds: [
    "Improve a complex interface",
    "Add AI capabilities",
    "Maintain and evolve a product",
  ],
  stages: ["Production", "Ongoing maintenance"],
  domains: ["E-commerce"],
  aiUsage: ["AI product feature"],
  aiCapabilities: ["Design generation", "Translation"],
  ownership: "Product engineering owner",
  maintenance: "Active development",
});
const conversion = project("conversion", {
  buyerNeeds: ["Add AI capabilities", "Make data actionable"],
  stages: ["MVP"],
  domains: ["Marketing and research"],
  aiUsage: ["AI product feature"],
  aiCapabilities: ["Survey analysis", "Survey generation", "Translation"],
  ownership: "Product engineering owner",
});
const seabo = project("seabo", {
  buyerNeeds: ["Join an existing team", "Improve a complex interface"],
  stages: ["Production", "Improvement"],
  domains: ["Logistics and maritime"],
  ownership: "Team contributor",
  maintenance: "Engagement ended",
});
const build = project("build", {
  buyerNeeds: ["Automate repetitive work", "Build internal tooling"],
  stages: ["Internal use"],
  domains: ["Developer tooling"],
  aiUsage: ["AI-powered developer tool"],
  aiCapabilities: ["Agent orchestration"],
  ownership: "Solo delivery",
});
const candidates = [konfig, conversion, seabo, build];
const brief = (values = {}) => ({
  intent: "explore",
  situation: "",
  outcome: "",
  context: {},
  ...values,
});
const text = (value) => ({
  type: "rich_text",
  rich_text: [{ plain_text: value }],
});

test("AI-product service context selects product AI evidence without requiring a written brief", () => {
  const matches = selectEnquiryEvidence(
    candidates,
    brief({ context: { service: "ai-products" } }),
  );
  assert.ok(matches.length > 0);
  assert.equal(
    matches[0].project.caseStudy.aiUsage.includes("AI product feature"),
    true,
  );
  assert.ok(matches[0].reasons.includes("Add AI capabilities"));
});
const multi = (...names) => ({
  type: "multi_select",
  multi_select: names.map((name) => ({ name })),
});

test("the public case projection exposes only supported dimensions, not raw editorial or contact data", () => {
  const value = readPublicProjectCase({
    properties: {
      Hidden: { checkbox: false },
      "Buyer Needs": multi("Add AI capabilities", "private custom tag"),
      "Delivery Stages": multi("Production"),
      "Ownership Model": { select: { name: "Product engineering owner" } },
      "Case Context": text("A public product context"),
      "Evidence Gaps": text("Private editorial notes"),
      "Personal Contribution": text("Unreviewed contribution prose"),
      email: { email: "private@example.com" },
    },
  });
  assert.deepEqual(value.buyerNeeds, ["Add AI capabilities"]);
  assert.equal(value.summary, "A public product context");
  assert.equal(value.ownership, "Product engineering owner");
  assert.doesNotMatch(JSON.stringify(value), /private|Unreviewed/);
  assert.deepEqual(readPublicProjectCase({ properties: {} }), profile());
});

test("hidden and archived cases never become matching candidates", () => {
  assert.equal(
    readPublicProjectCase({ properties: { Hidden: { checkbox: true } } }),
    null,
  );
  assert.equal(readPublicProjectCase({ archived: true, properties: {} }), null);
});

test("survey analysis requests rank implemented survey features above generic AI and preserve MVP limits", () => {
  const matches = selectEnquiryEvidence(
    candidates,
    brief({
      intent: "production",
      outcome: "Add AI survey analysis and translation to our product",
    }),
  );
  assert.equal(matches[0].project.id, "conversion");
  assert.ok(matches[0].reasons.includes("Survey analysis"));
  assert.equal(matches[0].partial, true);
  assert.deepEqual(matches[0].project.caseStudy.stages, ["MVP"]);
});

test("German requests use the same project evidence with localized explanations", () => {
  const matches = selectEnquiryEvidence(
    candidates,
    brief({
      intent: "improve",
      outcome: "Umfragen auswerten und automatisch übersetzen",
    }),
  );
  assert.equal(matches[0].project.id, "conversion");
  assert.equal(caseLabel("Survey analysis", "de"), "Umfrageauswertung");
});

test("enterprise team enquiries prefer documented team contribution over solo internal tools", () => {
  const matches = selectEnquiryEvidence(
    candidates,
    brief({
      intent: "team",
      outcome:
        "Improve our maritime logistics interface with our existing team",
    }),
  );
  assert.equal(matches[0].project.id, "seabo");
  assert.ok(matches[0].reasons.includes("Team contributor"));
  assert.equal(matches[0].project.caseStudy.maintenance, "Engagement ended");
});

test("developer automation requests return internal tooling without describing it as production", () => {
  const matches = selectEnquiryEvidence(
    candidates,
    brief({ outcome: "Agent orchestration for developer tooling" }),
  );
  assert.equal(matches[0].project.id, "build");
  assert.deepEqual(matches[0].project.caseStudy.stages, ["Internal use"]);
});

test("an unrelated industry has no forced match even when a broad starting point is selected", () => {
  assert.deepEqual(
    selectEnquiryEvidence(
      candidates,
      brief({ intent: "production", outcome: "Build a healthcare product" }),
    ),
    [],
  );
  assert.deepEqual(selectEnquiryEvidence(candidates, brief()), []);
});

test("a selected source case is identified as context without inventing topical relevance", () => {
  const matches = selectEnquiryEvidence(
    candidates,
    brief({
      context: { source: "project", projectId: "build" },
      outcome: "Healthcare software",
    }),
  );
  assert.equal(matches.length, 1);
  assert.equal(matches[0].project.id, "build");
  assert.equal(matches[0].selected, true);
  assert.equal(matches[0].partial, true);
  assert.deepEqual(matches[0].reasons, []);
});

test("AI-assisted implementation alone is not evidence of a delivered AI capability", () => {
  const assisted = project("assisted", {
    buyerNeeds: ["Add AI capabilities"],
    aiUsage: ["AI-assisted implementation"],
    stages: ["Production"],
  });
  const matches = selectEnquiryEvidence(
    [assisted, conversion],
    brief({ intent: "production", outcome: "Add AI capabilities" }),
  );
  assert.deepEqual(
    matches.map((match) => match.project.id),
    ["conversion"],
  );
});

test("explicitly excluding AI does not produce an AI-feature reason", () => {
  const matches = selectEnquiryEvidence(
    candidates,
    brief({
      intent: "team",
      outcome: "No AI needed. Improve our logistics interface.",
    }),
  );
  assert.equal(matches[0].project.id, "seabo");
  assert.ok(
    matches.every((match) => !match.reasons.includes("Add AI capabilities")),
  );
});

test("a service entry uses capabilities rather than a fixed project ID list", () => {
  const matches = selectEnquiryEvidence(
    [seabo, conversion],
    brief({
      intent: "improve",
      context: { source: "service", service: "ai-automation" },
    }),
  );
  assert.equal(matches[0].project.id, "conversion");
});

test("results are bounded, deterministic and do not mutate the source", () => {
  const projects = Array.from({ length: 5 }, (_, i) =>
    project(`case-${i}`, {
      buyerNeeds: ["Improve a complex interface"],
      stages: ["Improvement"],
    }),
  );
  const original = JSON.stringify(projects);
  const input = brief({ intent: "improve" });
  assert.equal(selectEnquiryEvidence(projects, input).length, 3);
  assert.deepEqual(
    selectEnquiryEvidence(projects, input),
    selectEnquiryEvidence([...projects].reverse(), input),
  );
  assert.equal(JSON.stringify(projects), original);
});

test("unrecognized specific requests do not silently fall back to generic production examples", () => {
  assert.deepEqual(
    selectEnquiryEvidence(
      candidates,
      brief({
        intent: "production",
        outcome: "Quantum cryptography for satellites",
      }),
    ),
    [],
  );
});

test("specific AI capabilities exclude cases that only share a generic AI tag", () => {
  const generic = project("generic", {
    buyerNeeds: ["Add AI capabilities"],
    aiUsage: ["AI product feature"],
    stages: ["Production"],
  });
  const matches = selectEnquiryEvidence(
    [generic, conversion],
    brief({ outcome: "AI survey analysis" }),
  );
  assert.deepEqual(
    matches.map((match) => match.project.id),
    ["conversion"],
  );
});

test("current absence of AI does not override the desired AI outcome in either language", () => {
  for (const [situation, outcome] of [
    ["Our product has no AI today.", "Add AI survey analysis."],
    [
      "Unser Produkt arbeitet aktuell ohne KI.",
      "KI für Umfrageauswertung ergänzen.",
    ],
  ]) {
    const matches = selectEnquiryEvidence(
      candidates,
      brief({ intent: "production", situation, outcome }),
    );
    assert.equal(matches[0]?.project.id, "conversion");
    assert.ok(matches[0].reasons.includes("Survey analysis"));
  }
});

test("shipping software is not interpreted as shipping logistics", () => {
  const matches = selectEnquiryEvidence(
    candidates,
    brief({
      intent: "production",
      situation: "We have a prototype.",
      outcome: "We need help shipping it.",
    }),
  );
  assert.ok(
    matches.every((match) => !match.reasons.includes("Logistics and maritime")),
  );
});

test("solo production experience is only a partial match for team support", () => {
  const solo = project("solo", {
    stages: ["Production"],
    buyerNeeds: ["Improve a complex interface"],
    ownership: "Solo delivery",
  });
  const matches = selectEnquiryEvidence(
    [solo],
    brief({ intent: "team", outcome: "Improve an interface" }),
  );
  assert.equal(matches[0]?.partial, true);
});
