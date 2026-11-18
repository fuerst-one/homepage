import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const url = new URL(
  "../apps/web/src/components/ProjectLab/comparison.ts",
  import.meta.url,
);
const model = existsSync(url) ? loadTs(url) : {};
const p = (id, tools = [], needs = []) => ({
  id,
  name: id,
  tools,
  languages: [],
  capabilities: [],
  methods: [],
  industries: [],
  productTypes: [],
  matching: { buyerNeeds: needs, domains: [] },
});

test("comparison reports shared labels, differences and unknown inputs separately", () => {
  assert.equal(
    typeof model.compareProjectFields,
    "function",
    "field comparisons must be available",
  );
  const rows = model.compareProjectFields(
    p("a", ["React", "React", " GSAP "], ["Automate", "Explore"]),
    p("b", ["react", "Laravel"], ["Automate"]),
  );
  const tools = rows.find((r) => r.id === "tools");
  assert.deepEqual(tools.shared, ["React"]);
  assert.deepEqual(tools.onlyA, ["GSAP"]);
  assert.deepEqual(tools.onlyB, ["Laravel"]);
  assert.equal(tools.similarity, 1 / 3);
  const languages = rows.find((r) => r.id === "languages");
  assert.equal(languages.similarity, null);
  assert.deepEqual(languages.missing, ["a", "b"]);
  const reverse = model.compareProjectFields(
    p("b", ["react", "Laravel"]),
    p("a", ["React", "GSAP"]),
  );
  assert.equal(
    reverse.find((r) => r.id === "tools").similarity,
    tools.similarity,
  );
});

test("transfer leads require multiple shared needs and known different toolsets", () => {
  assert.equal(
    typeof model.crossLensCandidates,
    "function",
    "cross-lens leads must be available",
  );
  const projects = [
    p("a", ["Vue"], ["Automate", "Explore", "Improve"]),
    p("b", ["React"], ["Automate", "Explore"]),
    p("one", ["Python"], ["Automate"]),
    p("missing", [], ["Automate", "Explore"]),
    p("same", ["Vue"], ["Automate", "Explore"]),
  ];
  const leads = model.crossLensCandidates(projects, "a");
  assert.deepEqual(
    leads.map((l) => l.b),
    ["b"],
  );
  assert.deepEqual(leads[0].sharedNeeds, ["Automate", "Explore"]);
  assert.equal(leads[0].needSimilarity, 2 / 3);
  assert.deepEqual(
    model.crossLensCandidates(
      projects.filter((p) => p.id !== "b"),
      "a",
    ),
    [],
  );
  assert.deepEqual(model.crossLensCandidates(projects, "absent"), []);
});

test("public navigation keeps complementary analyses and a single expert workbench", () => {
  const navUrl = new URL(
    "../apps/web/src/components/ProjectLab/navigation.ts",
    import.meta.url,
  );
  assert.ok(existsSync(navUrl), "consolidated navigation must be available");
  const { labTabs } = loadTs(navUrl);
  assert.deepEqual(
    labTabs(true).map((t) => t.id),
    ["coverage", "bundles", "evolution", "vectors"],
  );
  for (const retired of [
    "flow",
    "connections",
    "physics",
    "crossings",
    "families",
    "mixtures",
    "intersections",
  ])
    assert.ok(!labTabs(false).some((t) => t.id === retired));
});

test("delivery fingerprint consumes the current published working pattern", () => {
  const { fingerprint } = loadTs(
    new URL(
      "../apps/web/src/components/ProjectLab/vectorSpaces.ts",
      import.meta.url,
    ),
  );
  const row = fingerprint({
    ...p("a"),
    matching: {
      buyerNeeds: [],
      domains: [],
      summary: "",
      stages: [],
      aiUsage: [],
      aiCapabilities: [],
    },
    scale: { workingPattern: "4 days/week" },
    workingPattern: "obsolete",
  });
  assert.ok(row.blocks.context.some((f) => f.label === "4 days/week"));
  assert.ok(!row.blocks.context.some((f) => f.label === "obsolete"));
});

test("comparison labels distinguish projects with duplicate names in both source models", () => {
  assert.equal(typeof model.projectComparisonLabels, "function");
  const names = model.projectComparisonLabels([
    {
      ...p("web"),
      name: "Public Searoutes",
      shortDescription: "Navigation Web-App",
    },
    { ...p("plugin"), name: "Public Searoutes", subtitle: "Excel Plugin" },
  ]);
  assert.equal(names.get("web"), "Public Searoutes · Navigation Web-App");
  assert.equal(names.get("plugin"), "Public Searoutes · Excel Plugin");
});
