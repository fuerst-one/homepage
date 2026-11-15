import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const { buildProjectSearchIndex, searchProjectIndex } = loadTs(
  new URL("../src/components/PlasmaLanding/projectSearch.ts", import.meta.url),
);
const { iconShape } = loadTs(
  new URL("../src/components/PlasmaLanding/iconCatalog.ts", import.meta.url),
);
const projects = [
  {
    id: "atlas",
    name: "Atlas Configurator",
    oneLineSummary: "Interactive product configuration.",
    webUrl: "https://fuerst.one/projects/atlas",
    tools: ["React.js", "Three.js"],
    experiences: ["Frontend-Development", "UI-Design"],
    industries: ["E-Commerce"],
    languages: ["TypeScript"],
    projectType: "Freelance",
    workplace: "Remote",
    clientNames: ["Acme & Co"],
    featured: true,
  },
  {
    id: "agent",
    name: "Agent Studio",
    oneLineSummary: "AI automation and workflows.",
    webUrl: "https://fuerst.one/projects/agent",
    tools: ["React.js", "Docker"],
    experiences: ["AI Engineering"],
    industries: ["Artificial Intelligence"],
    languages: ["Python"],
    projectType: "Hobby",
    workplace: "Hybrid",
    clientNames: ["Studio"],
    featured: false,
  },
  {
    id: "shop",
    name: "Shop Refresh",
    oneLineSummary: "A shop interface.",
    webUrl: "https://fuerst.one/projects/shop",
    tools: ["Tailwind"],
    experiences: ["UI-Design"],
    industries: ["Retail"],
    languages: ["CSS"],
    projectType: "Employed",
    workplace: "On-Premise",
    clientNames: ["Shop Inc"],
    featured: true,
  },
];
const index = buildProjectSearchIndex(projects);

test("German queries find canonical facets and localized chips", () => {
  const german = buildProjectSearchIndex(projects, "de");
  for (const [query, ids, label, field, value] of [
    [
      "Zeig mir Projekte mit KI",
      ["agent"],
      "Künstliche Intelligenz",
      "industries",
      "Artificial Intelligence",
    ],
    [
      "Frontend Entwicklung",
      ["atlas"],
      "Frontend-Entwicklung",
      "experiences",
      "Frontend-Development",
    ],
    ["freiberuflich", ["atlas"], "Freiberuflich", "projectType", "Freelance"],
    ["vor Ort", ["shop"], "Vor Ort", "workplace", "On-Premise"],
    ["Einzelhandel", ["shop"], "Einzelhandel", "industries", "Retail"],
  ]) {
    const result = searchProjectIndex(german, query);
    assert.deepEqual(
      result.projects.map((project) => project.id),
      ids,
      query,
    );
    const chip = result.suggestions.find((item) => item.label === label);
    assert.ok(chip, `Missing German chip for ${query}`);
    assert.deepEqual(chip.filter, { field, value });
    assert.equal(
      searchProjectIndex(german, chip.label, chip.filter).projects.length,
      chip.count,
    );
  }
});

test("German aliases accept umlauts and English input without changing English chips", () => {
  for (const locale of ["en", "de"]) {
    const localized = buildProjectSearchIndex(projects, locale);
    for (const query of [
      "künstliche Intelligenz",
      "kunstliche intelligenz",
      "kuenstliche Intelligenz",
      "KI",
      "Artificial Intelligence",
    ]) {
      assert.deepEqual(
        searchProjectIndex(localized, query).projects.map(
          (project) => project.id,
        ),
        ["agent"],
        query,
      );
    }
  }
  assert.ok(
    searchProjectIndex(index, "KI").suggestions.some(
      (item) => item.label === "Artificial Intelligence",
    ),
  );
});

test("German aliases cover expertise independently of industry and keep field identity", () => {
  const expertise = buildProjectSearchIndex(
    [
      {
        ...projects[0],
        experiences: ["Artificial Intelligence", "Data Visualization"],
        industries: ["Health"],
      },
    ],
    "de",
  );
  for (const [query, field, value] of [
    ["KI", "experiences", "Artificial Intelligence"],
    ["Datenvisualisierung", "experiences", "Data Visualization"],
    ["Gesundheit", "industries", "Health"],
  ]) {
    const result = searchProjectIndex(expertise, query);
    assert.deepEqual(
      result.projects.map((project) => project.id),
      ["atlas"],
    );
    assert.deepEqual(
      result.suggestions.find((chip) => chip.kind === "keyword")?.filter,
      { field, value },
    );
  }
});

test("German selection chips preserve exact featured status and counts", () => {
  const german = buildProjectSearchIndex(projects, "de");
  for (const [query, ids] of [
    ["Hervorgehoben", ["atlas", "shop"]],
    ["Nicht hervorgehoben", ["agent"]],
    ["Not featured", ["agent"]],
  ]) {
    assert.deepEqual(
      searchProjectIndex(german, query).projects.map((project) => project.id),
      ids,
    );
  }
  assert.equal(
    searchProjectIndex(german, "Atlas").suggestions.find(
      (item) => item.kind === "project",
    )?.category,
    "Projekt",
  );
  assert.deepEqual(
    searchProjectIndex(german, "Zeig mir Projekte").projects,
    [],
  );
});

test("every filterable keyword and project name is indexed", () => {
  for (const value of [
    "React.js",
    "Frontend-Development",
    "E-Commerce",
    "TypeScript",
    "Freelance",
    "Remote",
    "Acme & Co",
    "Featured",
    "Not featured",
  ]) {
    assert.ok(
      index.keywords.some((keyword) => keyword.label === value),
      `Missing keyword ${value}`,
    );
  }
  assert.equal(
    searchProjectIndex(index, "Atlas").suggestions.find(
      (item) => item.kind === "project",
    )?.label,
    "Atlas Configurator",
  );
});

test("search suggestions carry the React atom and each project's curated model", () => {
  assert.equal(
    searchProjectIndex(index, "React").suggestions[0].shape,
    iconShape("react"),
  );
  const projectIndex = buildProjectSearchIndex([
    {
      ...projects[0],
      icon: "route",
      webUrl: "https://fuerst.one/projects/roadtrippin",
    },
  ]);
  const result = searchProjectIndex(projectIndex, "Atlas");
  assert.equal(result.projects[0].shape, iconShape("route"));
  assert.equal(result.suggestions[0].shape, iconShape("route"));
  const changedIcon = buildProjectSearchIndex([
    { ...projects[0], icon: "brain" },
  ]);
  assert.equal(
    searchProjectIndex(changedIcon, "Atlas").projects[0].shape,
    iconShape("brain"),
  );
});

test("partial terms suggest the canonical keyword and its project count", () => {
  const result = searchProjectIndex(index, "rea");
  assert.equal(result.suggestions[0].label, "React.js");
  assert.equal(result.suggestions[0].count, 2);
  assert.deepEqual(
    result.projects.map((project) => project.id),
    ["atlas", "agent"],
  );
});

test("combined search matches across filters and project names", () => {
  assert.deepEqual(
    searchProjectIndex(index, "React remote").projects.map(
      (project) => project.id,
    ),
    ["atlas"],
  );
  assert.deepEqual(
    searchProjectIndex(index, "Atlas TypeScript").projects.map(
      (project) => project.id,
    ),
    ["atlas"],
  );
});

test("short AI searches do not accidentally match Tailwind", () => {
  assert.deepEqual(
    searchProjectIndex(index, "AI").projects.map((project) => project.id),
    ["agent"],
  );
  assert.ok(
    searchProjectIndex(index, "AI").suggestions.some(
      (item) => item.label === "Artificial Intelligence",
    ),
  );
});

test("project-name matches rank ahead of incidental summary mentions", () => {
  const crowded = buildProjectSearchIndex([
    ...Array.from({ length: 7 }, (_, i) => ({
      ...projects[1],
      id: `mention-${i}`,
      name: `Other ${i}`,
      oneLineSummary: "Integrated with Atlas Configurator.",
    })),
    projects[0],
  ]);
  const result = searchProjectIndex(crowded, "Atlas");
  assert.equal(result.projects[0].id, "atlas");
  assert.equal(result.suggestions[0].label, "Atlas Configurator");
});

test("an exact selection keyword keeps its advertised result count", () => {
  assert.deepEqual(
    searchProjectIndex(index, "Featured").projects.map((project) => project.id),
    ["atlas", "shop"],
  );
});

test("selecting a keyword applies its exact field, including clients and featured status", () => {
  const client = index.keywords.find((item) => item.label === "Acme & Co");
  assert.deepEqual(
    searchProjectIndex(index, client.label, client.filter).projects.map(
      (project) => project.id,
    ),
    ["atlas"],
  );
  const notFeatured = index.keywords.find(
    (item) => item.label === "Not featured",
  );
  assert.deepEqual(
    searchProjectIndex(
      index,
      notFeatured.label,
      notFeatured.filter,
    ).projects.map((project) => project.id),
    ["agent"],
  );
});

test("punctuation and casing are preserved in labels but normalized for matching", () => {
  assert.equal(
    searchProjectIndex(index, "e commerce").suggestions[0].label,
    "E-Commerce",
  );
  assert.equal(
    searchProjectIndex(index, "TYPESCRIPT").suggestions[0].label,
    "TypeScript",
  );
});

test("empty and unmatched searches have no invented results", () => {
  assert.equal(searchProjectIndex(index, "").suggestions.length, 0);
  assert.equal(searchProjectIndex(index, "zzzzzz").projects.length, 0);
});

test("search results link locally and retain only public search fields", () => {
  const augmented = buildProjectSearchIndex([
    { ...projects[0], email: "private@example.com", clientAddress: "private" },
  ]);
  assert.equal(augmented.projects[0].href, "/projects/atlas");
  assert.equal(augmented.projects[0].email, undefined);
  assert.equal(augmented.projects[0].clientAddress, undefined);
  assert.equal(augmented.projects[0].webUrl, undefined);
});

test("projects with no workplace or optional prose remain searchable", () => {
  const sparse = buildProjectSearchIndex(
    [{ ...projects[0], workplace: null, oneLineSummary: "" }],
    "de",
  );
  assert.deepEqual(searchProjectIndex(sparse, "unmatched").projects, []);
  assert.equal(searchProjectIndex(sparse, "Atlas").projects[0].id, "atlas");
});

const caseProfile = (values = {}) => ({
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
const enrichedItems = [
  {
    ...projects[0],
    matching: caseProfile({
      buyerNeeds: ["Maintain and evolve a product"],
      stages: ["Production", "Ongoing maintenance"],
      ownership: "Product engineering owner",
      aiUsage: ["AI-assisted implementation"],
    }),
  },
  {
    ...projects[1],
    matching: caseProfile({
      buyerNeeds: ["Add AI capabilities"],
      stages: ["MVP"],
      aiUsage: ["AI product feature"],
      aiCapabilities: ["Survey analysis", "Translation"],
    }),
  },
  {
    ...projects[2],
    matching: caseProfile({
      buyerNeeds: ["Improve a complex interface"],
      stages: ["Prototype"],
    }),
  },
];

test("landing suggestions include buyer needs, stages, capabilities and ownership with exact counts", () => {
  const enriched = buildProjectSearchIndex(enrichedItems);
  for (const [query, field, value, id] of [
    ["maintain", "buyerNeeds", "Maintain and evolve a product", "atlas"],
    ["production", "stages", "Production", "atlas"],
    ["survey analysis", "aiCapabilities", "Survey analysis", "agent"],
    [
      "product engineering owner",
      "ownership",
      "Product engineering owner",
      "atlas",
    ],
  ]) {
    const result = searchProjectIndex(enriched, query);
    const chip = result.suggestions.find(
      (item) => item.filter?.field === field && item.filter.value === value,
    );
    assert.ok(chip, query);
    const filtered = searchProjectIndex(enriched, chip.label, chip.filter);
    assert.equal(filtered.projects.length, chip.count);
    assert.deepEqual(
      filtered.projects.map((p) => p.id),
      [id],
    );
  }
});

test("landing buyer-need phrases and German capability prompts share the enquiry matcher", () => {
  for (const [locale, query, expected] of [
    ["en", "I need survey analysis and translation", "agent"],
    ["de", "Ich möchte Umfragen auswerten und übersetzen", "agent"],
    ["en", "maintain an existing product", "atlas"],
  ]) {
    const result = searchProjectIndex(
      buildProjectSearchIndex(enrichedItems, locale),
      query,
    );
    assert.equal(result.projects[0]?.id, expected, query);
    assert.ok(result.projects[0].matchReasons.length > 0);
  }
});

test("German buyer-need chips retain the canonical field value", () => {
  const enriched = buildProjectSearchIndex(enrichedItems, "de");
  const result = searchProjectIndex(enriched, "Umfrageauswertung");
  const chip = result.suggestions.find(
    (item) => item.filter?.field === "aiCapabilities",
  );
  assert.equal(chip?.label, "Umfrageauswertung");
  assert.deepEqual(chip.filter, {
    field: "aiCapabilities",
    value: "Survey analysis",
  });
});

test("combining a new dimension with an existing tool preserves all query constraints", () => {
  const enriched = buildProjectSearchIndex(enrichedItems);
  assert.deepEqual(
    searchProjectIndex(enriched, "React production").projects.map((p) => p.id),
    ["atlas"],
  );
  assert.deepEqual(
    searchProjectIndex(enriched, "Docker production").projects,
    [],
  );
});

test("AI delivery and AI-assisted implementation remain distinct selectable facets", () => {
  const enriched = buildProjectSearchIndex(enrichedItems);
  const chip = enriched.keywords.find(
    (item) =>
      item.filter?.field === "aiUsage" &&
      item.filter.value === "AI product feature",
  );
  assert.ok(chip);
  assert.deepEqual(
    searchProjectIndex(enriched, chip.label, chip.filter).projects.map(
      (p) => p.id,
    ),
    ["agent"],
  );
});

test("buyer-need interpretation cannot drop an explicitly requested technology", () => {
  const enriched = buildProjectSearchIndex(enrichedItems);
  assert.deepEqual(
    searchProjectIndex(enriched, "Tailwind survey analysis").projects,
    [],
  );
});

test("related landing results preserve explicit delivery, workplace, engagement and client constraints", () => {
  const enriched = buildProjectSearchIndex(enrichedItems);
  for (const query of [
    "production survey analysis",
    "remote survey analysis",
    "freelance survey analysis",
    "Acme survey analysis",
  ]) {
    assert.deepEqual(searchProjectIndex(enriched, query).projects, [], query);
  }
  assert.equal(
    searchProjectIndex(enriched, "MVP survey analysis").projects[0]?.id,
    "agent",
  );
});

test("English case summaries retain their language in project suggestion captions", () => {
  const enriched = buildProjectSearchIndex(
    [
      {
        ...enrichedItems[1],
        matching: {
          ...enrichedItems[1].matching,
          summary: "A public English summary",
        },
      },
    ],
    "de",
  );
  const suggestion = searchProjectIndex(
    enriched,
    "Umfrageauswertung",
  ).suggestions.find((item) => item.kind === "project");
  assert.equal(suggestion?.captionLocale, "en");
});

test("typing an AI-use classification keeps the same distinction as selecting its chip", () => {
  for (const [locale, phrase, expected] of [
    ["en", "AI-assisted implementation", "atlas"],
    ["en", "AI product feature", "agent"],
    ["de", "KI-unterstützte Umsetzung", "atlas"],
  ]) {
    const enriched = buildProjectSearchIndex(enrichedItems, locale);
    assert.deepEqual(
      searchProjectIndex(enriched, phrase).projects.map((p) => p.id),
      [expected],
      phrase,
    );
  }
});

test("introductory words cannot turn an unrelated tool prefix into a mandatory filter", () => {
  const enriched = buildProjectSearchIndex([
    ...enrichedItems,
    { ...projects[2], id: "webpack", tools: ["Webpack"] },
  ]);
  assert.equal(
    searchProjectIndex(enriched, "We need survey analysis").projects[0]?.id,
    "agent",
  );
});

test("client searches suggest their projects without standalone client results", () => {
  for (const locale of ["en", "de"]) {
    const result = searchProjectIndex(
      buildProjectSearchIndex(projects, locale),
      "Acme",
    );
    assert.deepEqual(
      result.projects.map((project) => project.id),
      ["atlas"],
    );
    assert.deepEqual(
      result.suggestions
        .filter((item) => item.kind === "project")
        .map((item) => item.label),
      ["Atlas Configurator"],
    );
    assert.ok(
      result.suggestions.every((item) => item.filter?.field !== "clients"),
    );
  }
});

test("client matches include every matching project suggestion and retain other query constraints", () => {
  const clientProjects = Array.from({ length: 9 }, (_, i) => ({
    ...projects[0],
    id: `client-${i}`,
    name: `Delivery ${i}`,
    tools: i === 8 ? ["Docker"] : ["React.js"],
  }));
  const clientIndex = buildProjectSearchIndex([...clientProjects, projects[1]]);
  for (const [query, expected] of [
    ["Acme", 9],
    ["ACM", 9],
    ["projects for Acme", 9],
    ["Acme React", 8],
  ]) {
    const result = searchProjectIndex(clientIndex, query);
    assert.equal(result.projects.length, expected, query);
    assert.deepEqual(
      result.suggestions
        .filter((item) => item.kind === "project")
        .map((item) => item.id),
      result.projects.map((project) => `project:${project.id}`),
      query,
    );
    assert.ok(
      result.suggestions.every((item) => item.filter?.field !== "clients"),
      query,
    );
  }
});
