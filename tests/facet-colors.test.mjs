import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const {
  facetPalette,
  leadingFacetValues,
  FACET_PALETTE,
  UNRANKED_FACET_COLOR,
} = loadTs(
  new URL(
    "../apps/web/src/components/Cv/Projects/facetColors.ts",
    import.meta.url,
  ),
);
const { SECTORS } = loadTs(
  new URL("../packages/content/src/projectTaxonomy.ts", import.meta.url),
);

const project = (id, overrides = {}) => ({
  id,
  industries: [],
  capabilities: [],
  methods: [],
  tools: [],
  projectType: "Hobby",
  ...overrides,
});

test("the most common values take the sector colors in rank order, ties by name", () => {
  const palette = facetPalette(
    [
      project("a", { tools: ["Vue", "React"] }),
      project("b", { tools: ["React", "Docker"] }),
      project("c", { tools: ["React", "Vue", "Angular"] }),
    ],
    "tools",
  );
  assert.deepEqual(
    [...palette],
    [
      ["React", FACET_PALETTE[0]],
      ["Vue", FACET_PALETTE[1]],
      ["Angular", FACET_PALETTE[2]],
      ["Docker", FACET_PALETTE[3]],
    ],
  );
});

test("values beyond the palette stay neutral", () => {
  const tools = Array.from(
    { length: FACET_PALETTE.length + 2 },
    (_, i) => `Tool ${String(i).padStart(2, "0")}`,
  );
  const palette = facetPalette([project("a", { tools })], "tools");
  assert.equal(palette.get("Tool 00"), FACET_PALETTE[0]);
  assert.equal(
    palette.get(`Tool ${String(FACET_PALETTE.length).padStart(2, "0")}`),
    UNRANKED_FACET_COLOR,
  );
});

test("industries keep their own sector color whatever their rank", () => {
  const palette = facetPalette(
    [
      project("a", { industries: ["Healthcare"] }),
      project("b", { industries: ["Healthcare"] }),
      project("c", { industries: ["Education"] }),
    ],
    "industries",
  );
  assert.equal(palette.get("Healthcare"), SECTORS.Healthcare.color);
  assert.equal(palette.get("Education"), SECTORS.Education.color);
});

test("single-value facets like the project setting are colored too", () => {
  const palette = facetPalette(
    [
      project("a", { projectType: "Freelance" }),
      project("b", { projectType: "Freelance" }),
      project("c", { projectType: "Hobby" }),
    ],
    "projectType",
  );
  assert.deepEqual(
    [...palette],
    [
      ["Freelance", FACET_PALETTE[0]],
      ["Hobby", FACET_PALETTE[1]],
    ],
  );
});

test("a card leads with its three highest-ranked values and counts the rest", () => {
  const palette = new Map([
    ["React", "#1"],
    ["Docker", "#2"],
    ["Vue", "#3"],
    ["Node", "#4"],
  ]);
  assert.deepEqual(
    leadingFacetValues(
      project("a", { tools: ["Node", "Vue", "React", "Docker", "Rare"] }),
      "tools",
      palette,
    ),
    {
      values: [
        { value: "React", color: "#1" },
        { value: "Docker", color: "#2" },
        { value: "Vue", color: "#3" },
      ],
      hiddenCount: 2,
    },
  );
});

test("a card without values for the view has nothing to lead with", () => {
  assert.deepEqual(leadingFacetValues(project("a"), "methods", new Map()), {
    values: [],
    hiddenCount: 0,
  });
});

test("a single-value facet leads with that value", () => {
  assert.deepEqual(
    leadingFacetValues(
      project("a", { projectType: "Startup" }),
      "projectType",
      new Map([["Startup", "#1"]]),
    ),
    { values: [{ value: "Startup", color: "#1" }], hiddenCount: 0 },
  );
});
