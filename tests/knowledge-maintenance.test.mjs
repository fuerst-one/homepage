import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

test("independent maintenance runs GitHub, daily cache and profile pruning and hourly usage cleanup even with AI paused", async () => {
  const intervals = [],
    calls = [];
  const store = { read: async () => ({ observation: true }) };
  const dependencies = {
    "@homepage/database/visitorProfile": {
      profileCollectionAvailable: async () => true,
      pruneProfileEvents: async () => calls.push("profiles"),
    },
    "@homepage/database/notionDiagnostics": { notionFailure: () => ({}) },
    "node:timers/promises": {
      setTimeout: async (interval) => {
        intervals.push(interval);
        throw new Error("end test iteration");
      },
    },
    "@homepage/database/database": { knowledgeDatabase: () => ({}) },
    "@homepage/database/durableEnquiryStore": {
      drainEnquiryOutbox: async () => calls.push("enquiries"),
    },
    "../enquiries/notionEnquiryStore": { notionEnquiryStore: () => ({}) },
    "@homepage/database/postgresMaltMirrorStore": {
      postgresMaltMirrorStore: () => store,
    },
    "../malt/scheduledRefresh": {
      refreshMaltIfDue: async () => calls.push("malt"),
    },
    "../malt/notionMaltMirrorStore": { notionMaltMirrorStore: () => store },
    "./syncWebsiteContent": {
      syncWebsiteContent: async () => calls.push("website"),
    },
    "../github/syncGitHubActivity": {
      syncGitHubActivity: async () => calls.push("github"),
    },
    "@homepage/knowledge/policy": {
      cleanupKnowledgeUsage: async () => calls.push("usage"),
      cleanupKnowledgeCache: async () => calls.push("cache"),
    },
  };
  const { outputText } = ts.transpileModule(
    readFileSync(
      new URL("../apps/sync/src/notion/notionWorker.ts", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  );
  const exports = {};
  new Function("exports", "require", outputText)(exports, (name) => {
    assert.ok(dependencies[name], `Unexpected dependency ${name}`);
    return dependencies[name];
  });
  await exports.watchNotion(new AbortController().signal);
  assert.equal(calls.filter((call) => call === "cache").length, 1);
  assert.equal(calls.filter((call) => call === "usage").length, 1);
  assert.equal(calls.filter((call) => call === "profiles").length, 1);
  assert.equal(calls.filter((call) => call === "github").length, 1);
  assert.deepEqual(
    intervals.sort((a, b) => a - b),
    [5000, 60000, 60000, 60000, 3600_000, 24 * 3600_000, 24 * 3600_000],
  );
});
