import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const taxonomy = () =>
  loadTs(
    new URL("../packages/content/src/projectTaxonomy.ts", import.meta.url),
  );
const multi = (...names) => ({ multi_select: names.map((name) => ({ name })) });

test("delivery reads every reviewed operation tag from the renamed Notion field", () => {
  const { readNotionProjectTaxonomy } = taxonomy();
  const value = readNotionProjectTaxonomy({
    properties: {
      "Delivery & operation": multi(
        "Hosted access",
        "Embedded integration",
        "Hosted access",
        "PRIVATE",
      ),
      "Delivery model": { select: { name: "SaaS" } },
    },
  });
  assert.deepEqual(value.deliveryModels, [
    "Hosted access",
    "Embedded integration",
  ]);
  assert.equal(
    value.deliveryModel,
    "Hosted access",
    "the scalar API remains a first-value compatibility projection",
  );
});

test("an explicitly empty renamed field and withdrawn projects never revive legacy values", () => {
  const { readNotionProjectTaxonomy, publicProjectTaxonomy } = taxonomy();
  const properties = {
    "Delivery & operation": multi(),
    "Delivery model": { select: { name: "SaaS" } },
  };
  assert.deepEqual(
    readNotionProjectTaxonomy({ properties }).deliveryModels,
    [],
  );
  assert.deepEqual(
    readNotionProjectTaxonomy({ properties, archived: true }).deliveryModels,
    [],
  );
  assert.deepEqual(
    readNotionProjectTaxonomy({
      properties: { ...properties, Hidden: { checkbox: true } },
    }).deliveryModels,
    [],
  );
  assert.deepEqual(
    publicProjectTaxonomy({ deliveryModels: [], deliveryModel: "SaaS" })
      .deliveryModels,
    [],
  );
});

test("the rollout reads old selects and the intermediate multi-select without guessing replacements", () => {
  const { readNotionProjectTaxonomy, publicProjectTaxonomy } = taxonomy();
  for (const name of [
    "SaaS",
    "Free Service",
    "Physical Product",
    "Consultation",
    "Open Source",
  ]) {
    assert.deepEqual(
      readNotionProjectTaxonomy({
        properties: { "Delivery model": { select: { name } } },
      }).deliveryModels,
      [name],
    );
    assert.deepEqual(
      publicProjectTaxonomy({ deliveryModel: name }).deliveryModels,
      [name],
    );
  }
  assert.deepEqual(
    readNotionProjectTaxonomy({
      properties: {
        "Delivery model": multi("Self-hosted", "Local installation"),
      },
    }).deliveryModels,
    ["Self-hosted", "Local installation"],
  );
  assert.deepEqual(
    publicProjectTaxonomy({
      deliveryModels: ["Physical build", "Design handoff", "PRIVATE"],
    }).deliveryModels,
    ["Physical build", "Design handoff"],
  );
});

test("source review recognises the new field and flags unreviewed tags", () => {
  const { reviewProjectSource } = loadTs(
    new URL("../packages/content/src/projectSourceReview.ts", import.meta.url),
  );
  const issues = reviewProjectSource({
    properties: { "Delivery & operation": multi("Design handoff", "PRIVATE") },
  });
  assert.deepEqual(
    issues.filter((i) => i.field === "Delivery & operation"),
    [
      {
        field: "Delivery & operation",
        reason: "unknown-value",
        values: ["PRIVATE"],
      },
    ],
  );
});

test("facets and saved singular filters include secondary delivery tags once per project", () => {
  const { computeFacets } = loadTs(
    new URL("../apps/web/src/server/api/facets.ts", import.meta.url),
  );
  const { filterProjects } = loadTs(
    new URL(
      "../apps/web/src/components/Cv/Projects/Filter/utils.ts",
      import.meta.url,
    ),
  );
  const project = {
    id: "konfig",
    tools: [],
    industries: [],
    capabilities: [],
    languages: [],
    clients: [],
    deliveryModel: "Hosted access",
    deliveryModels: [
      "Hosted access",
      "Embedded integration",
      "Embedded integration",
    ],
  };
  const rows = [project];
  assert.deepEqual(computeFacets(rows).deliveryModels, [
    { value: "Embedded integration", count: 1 },
    { value: "Hosted access", count: 1 },
  ]);
  assert.deepEqual(
    filterProjects(rows, { deliveryModel: ["Embedded integration"] }),
    rows,
  );
  assert.deepEqual(
    filterProjects(rows, { deliveryModels: ["Embedded integration"] }),
    rows,
  );
});

test("web and API URL parsing accept multiple delivery tags", () => {
  const { parseProjectSearchParams } = loadTs(
    new URL(
      "../apps/web/src/components/Cv/Projects/parseSearchParams.ts",
      import.meta.url,
    ),
  );
  const { parseListParams } = loadTs(
    new URL("../apps/web/src/server/api/parseListParams.ts", import.meta.url),
  );
  const query = { deliveryModels: "Hosted access,Embedded integration" };
  const expected = {
    deliveryModel: ["Hosted access", "Embedded integration"],
  };
  assert.deepEqual(parseProjectSearchParams(query), expected);
  assert.deepEqual(
    parseListParams(new URLSearchParams(query)).params.categorical,
    expected,
  );
  const mixed = { deliveryModel: "Self-hosted", ...query };
  const merged = {
    deliveryModel: ["Self-hosted", "Hosted access", "Embedded integration"],
  };
  assert.deepEqual(parseProjectSearchParams(mixed), merged);
  assert.deepEqual(
    parseListParams(new URLSearchParams(mixed)).params.categorical,
    merged,
  );
});

test("landing search exposes and localises secondary delivery tags", () => {
  const { buildProjectSearchIndex } = loadTs(
    new URL(
      "../apps/web/src/components/PlasmaLanding/projectSearch.ts",
      import.meta.url,
    ),
  );
  const item = {
    id: "konfig",
    name: "Konfig",
    webUrl: "https://fuerst.one/en/projects/konfig",
    oneLineSummary: "Configurator",
    tools: [],
    industries: [],
    capabilities: [],
    methods: [],
    languages: [],
    clientNames: [],
    featured: true,
    deliveryModel: "Hosted access",
    deliveryModels: ["Hosted access", "Embedded integration"],
  };
  const index = buildProjectSearchIndex([item], "de");
  assert.deepEqual(index.projects[0].facets.deliveryModel, [
    "Hosted access",
    "Embedded integration",
  ]);
  const keyword = index.keywords.find(
    (k) => k.filter?.value === "Embedded integration",
  );
  assert.ok(keyword);
  assert.notEqual(keyword.label, "Embedded integration");
});

test("OpenAPI describes the additive delivery array and deprecated scalar", () => {
  const { buildOpenApiSpec } = loadTs(
    new URL("../apps/web/src/server/api/openapiSpec.ts", import.meta.url),
  );
  const props =
    buildOpenApiSpec().components.schemas.ProjectListItem.properties;
  assert.equal(props.deliveryModels.type, "array");
  assert.equal(props.deliveryModel.deprecated, true);
});
