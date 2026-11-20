import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const subject = loadTs(
  new URL(
    "../apps/web/src/components/Cv/Projects/Filter/utils.ts",
    import.meta.url,
  ),
);
const { filterProjects, getFilterOptionCounts } = subject;
const { parseProjectSearchParams } = loadTs(
  new URL(
    "../apps/web/src/components/Cv/Projects/parseSearchParams.ts",
    import.meta.url,
  ),
);

const projects = [
  {
    id: "one",
    featured: false,
    capabilities: ["UX-Design", "UX-Design", "AI Engineering"],
    industries: ["Maritime & logistics"],
    methods: ["Prototyping"],
  },
  {
    id: "two",
    featured: true,
    capabilities: ["UX-Design"],
    industries: ["Software & business services"],
    methods: [],
  },
];

test("shared facet counts count projects once per category and retain overlapping categories", () => {
  assert.deepEqual(
    getFilterOptionCounts(projects, "capabilities").map(
      ({ itemKey, count }) => ({
        itemKey,
        count,
      }),
    ),
    [
      { itemKey: "UX-Design", count: 2 },
      { itemKey: "AI Engineering", count: 1 },
    ],
  );
});

test("homepage facet links open all matching projects, including work outside the featured selection", () => {
  assert.equal(typeof subject.projectFacetHref, "function");
  for (const locale of ["en", "de"]) {
    const href = subject.projectFacetHref("capabilities", "UX-Design", locale);
    const url = new URL(href, "https://fuerst.one");
    assert.equal(url.pathname, `/${locale}/projects`);
    const filters = parseProjectSearchParams(
      Object.fromEntries(url.searchParams),
    );
    assert.deepEqual(
      filterProjects(projects, filters).map((p) => p.id),
      ["one", "two"],
    );
    assert.equal(url.searchParams.has("featured"), false);
  }
});

test("facet links preserve punctuation in the recorded category", () => {
  assert.equal(typeof subject.projectFacetHref, "function");
  const href = subject.projectFacetHref(
    "industries",
    "Maritime & logistics",
    "de",
  );
  const url = new URL(href, "https://fuerst.one");
  assert.equal(url.searchParams.get("industries"), "Maritime & logistics");
  const filters = parseProjectSearchParams(
    Object.fromEntries(url.searchParams),
  );
  assert.deepEqual(
    filterProjects(projects, filters).map((p) => p.id),
    ["one"],
  );
});

test("buyer-need links open the projects that name that need", () => {
  const href = subject.projectFacetHref(
    "buyerNeeds",
    "Automate repetitive work",
    "en",
  );
  const url = new URL(href, "https://fuerst.one");
  assert.equal(url.pathname, "/en/projects");
  const filters = parseProjectSearchParams(
    Object.fromEntries(url.searchParams),
  );
  assert.deepEqual(
    filterProjects(
      [
        { id: "one", matching: { buyerNeeds: ["Automate repetitive work"] } },
        { id: "two", matching: { buyerNeeds: ["Improve conversion"] } },
      ],
      filters,
    ).map((p) => p.id),
    ["one"],
  );
});

test("German project views label expertise, methods and product formats with the Atlas terms", () => {
  for (const [key, value, label] of [
    ["capabilities", "Conception", "Konzeption"],
    ["capabilities", "E-Commerce Development", "E-Commerce-Entwicklung"],
    ["methods", "AI-Assisted Development", "KI-gestützte Entwicklung"],
    ["productTypes", "MCP Server", "MCP-Server"],
  ]) {
    assert.equal(subject.facetValueLabel(key, value, "de"), label);
    assert.equal(subject.facetValueLabel(key, value, "en"), value);
  }
});
