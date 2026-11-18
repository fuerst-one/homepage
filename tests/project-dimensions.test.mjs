import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const { preparePublication } = loadTs(
  new URL("../apps/sync/src/notion/preparePublication.ts", import.meta.url),
);
const { filterProjects } = loadTs(
  new URL(
    "../apps/web/src/components/Cv/Projects/Filter/utils.ts",
    import.meta.url,
  ),
);
const { parseProjectSearchParams } = loadTs(
  new URL(
    "../apps/web/src/components/Cv/Projects/parseSearchParams.ts",
    import.meta.url,
  ),
);
const rich = { type: "rich_text", rich_text: [] };
const input = {
  projects: [
    {
      id: "p",
      hidden: false,
      name: "Public",
      description: rich,
      kpis: rich,
      capabilities: ["UX-Design"],
      methods: ["User Testing"],
      experiences: ["Legacy"],
      tools: ["Figma"],
      languages: [],
      clients: [],
      industries: [],
    },
  ],
  owner: {},
  cases: [],
  copy: [],
  assets: {},
  studies: {},
};
test("publication exposes separate capabilities and methods, without legacy experiences", () => {
  const p = preparePublication(input).locales.en.projects[0];
  assert.deepEqual(p.capabilities, ["UX-Design"]);
  assert.deepEqual(p.methods, ["User Testing"]);
  assert.ok(!("experiences" in p));
});
test("capability and method filters intersect and accept newly authored tags", () => {
  const projects = [
    { id: "both", capabilities: ["Novel skill"], methods: ["Novel method"] },
    { id: "cap", capabilities: ["Novel skill"], methods: [] },
  ];
  const params = parseProjectSearchParams({
    capabilities: "Novel skill",
    methods: "Novel method",
  });
  assert.deepEqual(params.capabilities, ["Novel skill"]);
  assert.deepEqual(params.methods, ["Novel method"]);
  assert.deepEqual(
    filterProjects(projects, params).map((p) => p.id),
    ["both"],
  );
});
