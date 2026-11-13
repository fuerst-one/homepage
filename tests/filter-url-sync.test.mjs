import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const moduleUrl = new URL(
  "../src/components/Cv/Projects/parseSearchParams.ts",
  import.meta.url,
);
const getSync = () => {
  const m = loadTs(moduleUrl);
  assert.equal(typeof m.reconcileProjectUrl, "function");
  return m;
};
test("store changes wait for their pending URL without restoring stale filters", () => {
  const { reconcileProjectUrl } = getSync();
  const action = reconcileProjectUrl({
    urlSearch: "tools=React",
    focusedProjectId: null,
    filters: {},
    lastUrl: "tools=React",
    pendingUrl: null,
  });
  assert.equal(action.type, "write");
  assert.equal(action.search, "all=1");
  assert.equal(
    reconcileProjectUrl({
      urlSearch: "tools=React",
      focusedProjectId: null,
      filters: {},
      lastUrl: "tools=React",
      pendingUrl: "all=1",
    }).type,
    "wait",
  );
  assert.equal(
    reconcileProjectUrl({
      urlSearch: "all=1",
      focusedProjectId: null,
      filters: {},
      lastUrl: "tools=React",
      pendingUrl: "all=1",
    }).type,
    "accept",
  );
});
test("all-project selection round trips without applying the default featured filter", () => {
  const { parseProjectSearchParams } = getSync();
  assert.deepEqual(parseProjectSearchParams({ all: "1" }), {});
  assert.deepEqual(parseProjectSearchParams({}), { featured: ["true"] });
  assert.deepEqual(
    parseProjectSearchParams({ tools: "React", focus: "project-id" }),
    { tools: ["React"] },
  );
});
test("filter changes preserve focused project and unrelated URL parameters", () => {
  const { reconcileProjectUrl } = getSync();
  const action = reconcileProjectUrl({
    urlSearch: "tools=React&focus=project-id",
    focusedProjectId: "project-id",
    filters: { industries: ["E-Commerce"] },
    lastUrl: "tools=React&focus=project-id",
    pendingUrl: null,
  });
  const next = new URLSearchParams(action.search);
  assert.equal(next.get("focus"), "project-id");
  assert.equal(next.get("industries"), "E-Commerce");
  assert.equal(next.has("tools"), false);
});
test("back and forward navigation updates the filter store", () => {
  const { reconcileProjectUrl } = getSync();
  const action = reconcileProjectUrl({
    urlSearch: "tools=Vue",
    focusedProjectId: null,
    filters: { tools: ["React"] },
    lastUrl: "tools=React",
    pendingUrl: null,
  });
  assert.equal(action.type, "read");
  assert.deepEqual(action.filters, { tools: ["Vue"] });
});
test("a newer filter selection is written when an earlier navigation arrives", () => {
  const { reconcileProjectUrl } = getSync();
  const action = reconcileProjectUrl({
    urlSearch: "tools=Vue",
    focusedProjectId: null,
    filters: { tools: ["Svelte"] },
    lastUrl: "tools=React",
    pendingUrl: "tools=Vue",
  });
  assert.deepEqual(action, { type: "write", search: "tools=Svelte" });
});
test("unrelated URL updates preserve a newer filter selection", () => {
  const { reconcileProjectUrl } = getSync();
  const action = reconcileProjectUrl({
    urlSearch: "tools=React&view=list",
    focusedProjectId: null,
    filters: {},
    lastUrl: "tools=React",
    pendingUrl: null,
  });
  assert.deepEqual(action, { type: "write", search: "view=list&all=1" });
});

test("queued filter reset and dialog close are serialized together", () => {
  const { reconcileProjectUrl } = getSync();
  const first = reconcileProjectUrl({
    urlSearch: "tools=React&focus=P",
    lastUrl: "tools=React&focus=P",
    pendingUrl: null,
    filters: {},
    focusedProjectId: "P",
  });
  assert.equal(first.type, "write");
  const next = reconcileProjectUrl({
    urlSearch: first.search,
    lastUrl: "tools=React&focus=P",
    pendingUrl: first.search,
    filters: {},
    focusedProjectId: null,
  });
  assert.deepEqual(next, { type: "write", search: "all=1" });
});
test("opening and closing before navigation arrives removes queued focus", () => {
  const { reconcileProjectUrl } = getSync();
  const action = reconcileProjectUrl({
    urlSearch: "tools=React&focus=P",
    lastUrl: "tools=React",
    pendingUrl: "tools=React&focus=P",
    filters: { tools: ["React"] },
    focusedProjectId: null,
  });
  assert.deepEqual(action, { type: "write", search: "tools=React" });
});
