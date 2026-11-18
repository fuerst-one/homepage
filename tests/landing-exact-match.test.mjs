import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const { resolveSearchDestination } = loadTs(
  new URL(
    "../apps/web/src/components/PlasmaLanding/projectSearch.ts",
    import.meta.url,
  ),
);
const filter = { field: "tools", value: "React" };
const index = {
  locale: "en",
  projects: [
    {
      id: "p1",
      name: "Page Control",
      href: "/en/projects/page-control",
      facets: { tools: ["React"] },
    },
    {
      id: "p2",
      name: "Other",
      href: "/en/projects/other",
      facets: { tools: ["PHP"] },
    },
  ],
  keywords: [{ kind: "keyword", label: "React", filter }],
};
test("an exact project name opens the project, but partial names remain questions", () => {
  assert.equal(
    resolveSearchDestination(index, "  PAGE Control  "),
    "/en/projects/page-control",
  );
  assert.equal(resolveSearchDestination(index, "page"), null);
});
test("an exact suggestion opens the existing project view using its named facet", () => {
  const href = resolveSearchDestination(index, "React");
  assert.equal(href.split("?")[0], "/projects");
  assert.equal(new URLSearchParams(href.split("?")[1]).get("tools"), "React");
  assert.equal(resolveSearchDestination(index, "show me React work"), null);
});
test("a selected suggestion disambiguates identical labels", () => {
  const duplicate = {
    ...index,
    keywords: [
      { label: "React", filter: { field: "tools", value: "PHP" } },
      ...index.keywords,
    ],
  };
  assert.equal(
    new URLSearchParams(
      resolveSearchDestination(duplicate, "React", filter).split("?")[1],
    ).get("tools"),
    "React",
  );
});

test("AI Engineering uses the existing expertise filter rather than freezing project IDs", () => {
  const expertise = {
    ...index,
    keywords: [
      {
        label: "AI Engineering",
        filter: { field: "capabilities", value: "AI Engineering" },
      },
    ],
  };
  const params = new URLSearchParams(
    resolveSearchDestination(expertise, "AI Engineering").split("?")[1],
  );
  assert.equal(params.get("capabilities"), "AI Engineering");
  assert.equal(params.has("id"), false);
});
test("case facets also retain semantic names and Featured maps to the native boolean", () => {
  for (const [field, label, value, expected] of [
    [
      "buyerNeeds",
      "Add AI capabilities",
      "Add AI capabilities",
      "Add AI capabilities",
    ],
    ["featured", "Not featured", "Not featured", "false"],
  ]) {
    const fixture = {
      ...index,
      keywords: [{ label, filter: { field, value } }],
    };
    assert.equal(
      new URLSearchParams(
        resolveSearchDestination(fixture, label).split("?")[1],
      ).get(field),
      expected,
    );
  }
});
