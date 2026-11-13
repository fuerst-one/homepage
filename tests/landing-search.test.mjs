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
