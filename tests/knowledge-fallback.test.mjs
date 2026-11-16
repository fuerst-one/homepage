import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const { knowledgeFallback } = loadTs(
  new URL("../src/lib/knowledgeFallback.ts", import.meta.url),
);
test("fallback uses bounded public project suggestions without outage wording", () => {
  const projects = Array.from({ length: 5 }, (_, i) => ({
    id: `p${i}`,
    name: `Project ${i}`,
    href: `/en/projects/project-${i}`,
  }));
  const result = knowledgeFallback("en", projects);
  assert.equal(result.sources.length, 3);
  assert.equal(result.sources[0].title, "Project 0");
  assert.ok(result.actions.some((action) => action.target === "/en/projects"));
  assert.doesNotMatch(
    result.answer,
    /unavailable|error|offline|fallback|failed/i,
  );
});
test("fallback remains useful without search, a database, or a provider", () => {
  const result = knowledgeFallback("de");
  assert.equal(result.sources.length, 0);
  assert.ok(result.actions.some((action) => action.target === "/de/contact"));
  assert.doesNotMatch(
    result.answer,
    /Fehler|ausgefallen|nicht verfügbar|Fallback/i,
  );
});
