import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const {
  facetPalette,
  facetColor,
  leadingFacetValues,
  leadingFacetValuesInList,
  FACET_PALETTE,
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
const colorsOf = (palette) =>
  [...palette.values].map(([value]) => [value, facetColor(palette, value)]);

test("the most common values take the sector colors in rank order, ties by name", () => {
  const palette = facetPalette(
    [
      project("a", { tools: ["Vue", "React"] }),
      project("b", { tools: ["React", "Docker"] }),
      project("c", { tools: ["React", "Vue", "Angular"] }),
    ],
    "tools",
  );
  assert.deepEqual(colorsOf(palette), [
    ["React", FACET_PALETTE[0]],
    ["Vue", FACET_PALETTE[1]],
    ["Angular", FACET_PALETTE[2]],
    ["Docker", FACET_PALETTE[3]],
  ]);
});

test("values beyond the palette cycle through its colors", () => {
  const tools = Array.from(
    { length: FACET_PALETTE.length + 2 },
    (_, i) => `Tool ${String(i).padStart(2, "0")}`,
  );
  const palette = facetPalette([project("a", { tools })], "tools");
  assert.equal(facetColor(palette, "Tool 00"), FACET_PALETTE[0]);
  assert.equal(
    facetColor(
      palette,
      `Tool ${String(FACET_PALETTE.length + 1).padStart(2, "0")}`,
    ),
    FACET_PALETTE[1],
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
  assert.equal(facetColor(palette, "Healthcare"), SECTORS.Healthcare.color);
  assert.equal(facetColor(palette, "Education"), SECTORS.Education.color);
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
  assert.deepEqual(colorsOf(palette), [
    ["Freelance", FACET_PALETTE[0]],
    ["Hobby", FACET_PALETTE[1]],
  ]);
});

test("a card leads with values shared by some projects, not with ubiquitous or one-off ones", () => {
  const projects = Array.from({ length: 10 }, (_, i) =>
    project(`p${i}`, {
      tools: [
        "Everywhere",
        ...(i < 4 ? ["Often"] : []),
        ...(i < 2 ? ["Sometimes"] : []),
        ...(i === 0 ? ["Once"] : []),
      ],
    }),
  );
  const palette = facetPalette(projects, "tools");
  assert.deepEqual(leadingFacetValues(projects[0], "tools", palette), {
    values: ["Often", "Sometimes", "Everywhere"].map((value) => ({
      value,
      color: facetColor(palette, value),
    })),
    hiddenCount: 1,
  });
});

test("a card without values for the view has nothing to lead with", () => {
  const palette = facetPalette([project("a")], "methods");
  assert.deepEqual(leadingFacetValues(project("a"), "methods", palette), {
    values: [],
    hiddenCount: 0,
  });
});

test("a single-value facet leads with that value", () => {
  const startup = project("a", { projectType: "Startup" });
  const palette = facetPalette([startup], "projectType");
  assert.deepEqual(leadingFacetValues(startup, "projectType", palette), {
    values: [{ value: "Startup", color: FACET_PALETTE[0] }],
    hiddenCount: 0,
  });
});

test("later cards lead with values the cards above them have not shown yet", () => {
  const tools = ["A", "B", "C", "D", "E", "F"];
  const projects = ["first", "second", "third"].map((id) =>
    project(id, { tools }),
  );
  const palette = facetPalette(projects, "tools");
  const leading = leadingFacetValuesInList(projects, "tools", palette);
  const shown = (id) => leading.get(id).values.map(({ value }) => value);
  assert.deepEqual(shown("first"), ["A", "B", "C"]);
  assert.deepEqual(shown("second"), ["D", "E", "F"]);
  assert.deepEqual(shown("third"), ["A", "B", "C"]);
  assert.equal(leading.get("second").hiddenCount, 3);
});
