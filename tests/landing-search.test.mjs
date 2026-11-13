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
