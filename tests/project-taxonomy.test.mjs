import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

test("project classification reads its own sector and independent taxonomy fields", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "-e",
      `
    import assert from 'node:assert/strict';
    import { fetchNotionProjectsDatabase } from './apps/sync/src/notion/fetchNotionProjectsDatabase.tsx';
    process.env.NEXT_NOTION_PROJECT_DB_ID = 'fixture';
    const multi = values => ({type:'multi_select',multi_select:values.map(name=>({name}))});
    const select = name => ({type:'select',select:name ? {name} : null});
    const page = sector => ({id:'project',properties:{
      Name:{type:'title',title:[{plain_text:'RoadTrippin'}]},
      Hidden:{type:'checkbox',checkbox:false},
      Sector:select(sector),
      Industries:{type:'rollup',rollup:{type:'array',array:[multi(['Consulting','E-Commerce'])]}},
      'Product type':multi(['Web app','Mobile app']),
      'Target market':multi(['B2C']),
      'Usage context':multi(['Personal']),
      'Delivery model':select('SaaS'),
    }});
    const [classified] = await fetchNotionProjectsDatabase([page('Travel & tourism')]);
    assert.deepEqual(classified.industries, ['Travel & tourism']);
    assert.deepEqual(classified.productTypes, ['Web app','Mobile app']);
    assert.deepEqual(classified.targetMarket, ['B2C']);
    assert.deepEqual(classified.usageContext, ['Personal']);
    assert.equal(classified.deliveryModel, 'SaaS');
    const [unknown] = await fetchNotionProjectsDatabase([page(null)]);
    assert.deepEqual(unknown.industries, [], 'unclassified projects must not inherit agency industries');
  `,
    ],
    { encoding: "utf8", cwd: new URL("..", import.meta.url) },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("facet counts count projects once even when legacy rollups contain duplicate values", () => {
  const { getFilterOptionCounts } = loadTs(
    new URL(
      "../apps/web/src/components/Cv/Projects/Filter/utils.ts",
      import.meta.url,
    ),
  );
  const counts = getFilterOptionCounts(
    [
      {
        id: "one",
        industries: ["Maritime & logistics", "Maritime & logistics"],
      },
      { id: "two", industries: ["Maritime & logistics"] },
    ],
    "industries",
  );
  assert.equal(
    counts.find((c) => c.itemKey === "Maritime & logistics").count,
    2,
  );
});

test("new use cases survive the existing public case projection", () => {
  const { readPublicProjectCase } = loadTs(
    new URL("../packages/content/src/projectCase.ts", import.meta.url),
  );
  const profile = readPublicProjectCase({
    properties: {
      Hidden: { checkbox: false },
      "Project Domains": {
        multi_select: [
          { name: "Travel planning" },
          { name: "Product configuration" },
          { name: "Private unreviewed label" },
        ],
      },
    },
  });
  assert.deepEqual(profile.domains, [
    "Travel planning",
    "Product configuration",
  ]);
});

test("independent facets survive URL and API parsing and compose with sector filters", () => {
  const { parseProjectSearchParams } = loadTs(
    new URL(
      "../apps/web/src/components/Cv/Projects/parseSearchParams.ts",
      import.meta.url,
    ),
  );
  const { parseListParams } = loadTs(
    new URL("../apps/web/src/server/api/parseListParams.ts", import.meta.url),
  );
  const query = {
    industries: "Travel & tourism",
    productTypes: "Mobile app",
    usageContext: "Personal",
    targetMarket: "B2C",
    deliveryModel: "SaaS",
  };
  const expected = Object.fromEntries(
    Object.entries(query).map(([key, value]) => [key, [value]]),
  );
  assert.deepEqual(parseProjectSearchParams(query), expected);
  assert.deepEqual(
    parseListParams(new URLSearchParams(query)).params.categorical,
    expected,
  );
});

test("legacy sector and moved domain links retain a meaningful classification", () => {
  const { filterProjects } = loadTs(
    new URL(
      "../apps/web/src/components/Cv/Projects/Filter/utils.ts",
      import.meta.url,
    ),
  );
  const rows = [
    {
      id: "seabo",
      industries: ["Maritime & logistics"],
      productTypes: ["Web app"],
      matching: { domains: ["Logistics operations"] },
    },
    {
      id: "road",
      industries: ["Travel & tourism"],
      productTypes: ["Mobile app"],
      matching: { domains: ["Travel planning"] },
    },
    {
      id: "health",
      industries: ["Healthcare"],
      matching: { domains: ["Brand and portfolio"] },
    },
    {
      id: "nautic",
      industries: ["Maritime & logistics"],
      matching: { domains: ["Brand and portfolio"] },
    },
  ];
  for (const [filters, id] of [
    [{ domains: ["Tourism and travel"] }, "road"],
    [{ domains: ["Healthcare"] }, "health"],
  ]) {
    assert.deepEqual(
      filterProjects(rows, filters).map((p) => p.id),
      [id],
    );
  }
  assert.deepEqual(
    filterProjects(rows, { domains: ["Logistics and maritime"] }).map(
      (p) => p.id,
    ),
    ["seabo", "nautic"],
  );
  assert.deepEqual(
    filterProjects(rows, { industries: ["Marine Shipping"] }).map((p) => p.id),
    ["seabo", "nautic"],
  );
});

test("enquiry examples retain sector matches after use cases are separated", () => {
  const { selectEnquiryEvidence } = loadTs(
    new URL("../packages/content/src/enquiryEvidence.ts", import.meta.url),
  );
  const cases = [
    ["seabo", "Maritime & logistics", "Logistics operations", "maritime"],
    ["road", "Travel & tourism", "Travel planning", "travel"],
    ["health", "Healthcare", "Brand and portfolio", "healthcare"],
  ];
  const projects = cases.map(([id, sector, domain]) => ({
    id,
    name: id,
    href: `/en/projects/${id}`,
    summary: "",
    industries: [sector],
    caseStudy: {
      buyerNeeds: [],
      domains: [domain],
      stages: [],
      aiUsage: [],
      aiCapabilities: [],
      ownership: "",
      maintenance: "",
      summary: "",
    },
  }));
  for (const [id, , , outcome] of cases) {
    assert.deepEqual(
      selectEnquiryEvidence(projects, {
        intent: "explore",
        situation: "",
        outcome,
        context: {},
      }).map((match) => match.project.id),
      [id],
    );
  }
  const embedded = {
    ...projects[0],
    id: "device",
    productTypes: ["Hardware / embedded"],
    caseStudy: { ...projects[0].caseStudy, domains: ["Animal deterrence"] },
  };
  assert.equal(
    selectEnquiryEvidence([embedded], {
      intent: "explore",
      situation: "",
      outcome: "embedded firmware",
      context: {},
    })[0]?.project.id,
    "device",
  );
});

test("the API contract describes independent taxonomy response fields", () => {
  const { buildOpenApiSpec } = loadTs(
    new URL("../apps/web/src/server/api/openapiSpec.ts", import.meta.url),
  );
  const schemas = buildOpenApiSpec().components.schemas;
  for (const key of ["productTypes", "targetMarket", "usageContext"]) {
    assert.equal(schemas.ProjectListItem.properties[key]?.type, "array");
    assert.equal(schemas.Facets.properties[key]?.type, "array");
  }
  assert.deepEqual(schemas.ProjectListItem.properties.deliveryModel?.type, [
    "string",
    "null",
  ]);
  assert.equal(schemas.Facets.properties.deliveryModels?.type, "array");
});

test("publication and API project the independent fields without leaking unreviewed values", () => {
  const { preparePublication } = loadTs(
    new URL("../apps/sync/src/notion/preparePublication.ts", import.meta.url),
  );
  const { toProjectListItem } = loadTs(
    new URL("../apps/web/src/server/api/projectListItem.ts", import.meta.url),
  );
  const rich = { type: "rich_text", rich_text: [] };
  const publication = preparePublication({
    projects: [
      {
        id: "public",
        name: "Example",
        hidden: false,
        description: rich,
        kpis: rich,
        productTypes: ["Web app", "PRIVATE_FORMAT"],
        targetMarket: ["B2B", "Personal"],
        usageContext: ["Internal", "PRIVATE_CONTEXT"],
        deliveryModel: "SaaS",
        industries: ["Software & business services"],
      },
    ],
    owner: {},
    cases: [],
    copy: [],
    studies: {},
    assets: {},
    icons: {},
  });
  for (const locale of ["en", "de"]) {
    const project = publication.locales[locale].projects[0];
    assert.deepEqual(project.productTypes, ["Web app"]);
    assert.deepEqual(project.targetMarket, ["B2B"]);
    assert.deepEqual(project.usageContext, ["Internal"]);
    assert.equal(project.deliveryModel, "SaaS");
    assert.deepEqual(publication.locales[locale].evidence[0].industries, [
      "Software & business services",
    ]);
    assert.deepEqual(toProjectListItem(project, locale).productTypes, [
      "Web app",
    ]);
  }
  assert.equal(JSON.stringify(publication).includes("PRIVATE_"), false);
});

test("the facets endpoint exposes independent formats, markets, contexts and delivery models", () => {
  const { computeFacets } = loadTs(
    new URL("../apps/web/src/server/api/facets.ts", import.meta.url),
  );
  const result = computeFacets([
    {
      tools: [],
      industries: ["Travel & tourism", "Travel & tourism"],
      capabilities: [],
      languages: [],
      clients: [],
      productTypes: ["Web app"],
      targetMarket: ["B2C"],
      usageContext: ["Personal"],
      deliveryModel: "SaaS",
    },
  ]);
  assert.deepEqual(result.productTypes, [{ value: "Web app", count: 1 }]);
  assert.deepEqual(result.targetMarket, [{ value: "B2C", count: 1 }]);
  assert.deepEqual(result.usageContext, [{ value: "Personal", count: 1 }]);
  assert.deepEqual(result.deliveryModels, [{ value: "SaaS", count: 1 }]);
  assert.deepEqual(result.industries, [
    { value: "Travel & tourism", count: 1 },
  ]);
});
