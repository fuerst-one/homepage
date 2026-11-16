import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const { filterProjects } = loadTs(
  new URL("../src/components/Cv/Projects/Filter/utils.ts", import.meta.url),
);
const { parseProjectSearchParams, reconcileProjectUrl } = loadTs(
  new URL(
    "../src/components/Cv/Projects/parseSearchParams.ts",
    import.meta.url,
  ),
);
const projects = [
  {
    id: "ai",
    experiences: ["AI Engineering"],
    featured: false,
    matching: {
      buyerNeeds: ["Add AI capabilities"],
      ownership: "Solo delivery",
    },
  },
  { id: "other", experiences: ["UX"], featured: true },
];
test("semantic case filters survive URL parsing and select by public metadata", () => {
  const filters = parseProjectSearchParams({
    buyerNeeds: "Add AI capabilities",
    ownership: "Solo delivery",
  });
  assert.deepEqual(filters, {
    buyerNeeds: ["Add AI capabilities"],
    ownership: ["Solo delivery"],
  });
  assert.deepEqual(
    filterProjects(projects, filters).map((p) => p.id),
    ["ai"],
  );
});
test("named expertise filters include newly added matching projects without changing the URL", () => {
  const filters = parseProjectSearchParams({ experiences: "AI Engineering" });
  assert.deepEqual(
    filterProjects(
      [...projects, { id: "new", experiences: ["AI Engineering"] }],
      filters,
    ).map((p) => p.id),
    ["ai", "new"],
  );
});
test("Not featured selects false booleans and composes with semantic facets", () => {
  assert.deepEqual(
    filterProjects(projects, {
      featured: ["false"],
      buyerNeeds: ["Add AI capabilities"],
    }).map((p) => p.id),
    ["ai"],
  );
});
test("semantic filter removal is written back without leaving stale facets in the URL", () => {
  const action = reconcileProjectUrl({
    urlSearch: "buyerNeeds=Add+AI+capabilities&experiences=AI+Engineering",
    filters: { experiences: ["AI Engineering"] },
    focusedProjectId: null,
    lastUrl: "buyerNeeds=Add+AI+capabilities&experiences=AI+Engineering",
    pendingUrl: null,
  });
  assert.equal(action.type, "write");
  assert.equal(new URLSearchParams(action.search).has("buyerNeeds"), false);
});
