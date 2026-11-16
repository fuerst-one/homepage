import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const history = loadTs(
  new URL("../apps/web/src/lib/knowledgeHistory.ts", import.meta.url),
);
const now = 1_000_000_000;
const turn = {
  question: "AI projects?",
  result: {
    answer: "Published work.",
    sources: [
      {
        id: "s1",
        projectId: "project-1",
        title: "Project",
        href: "/en/projects/project-1",
      },
    ],
    actions: [
      { type: "navigate", target: "/en/projects/project-1", label: "Project" },
    ],
  },
};
const saved = (overrides = {}) =>
  JSON.stringify({ version: 1, savedAt: now, turns: [turn], ...overrides });
test("saved conversations restore their messages and validated page actions", () => {
  assert.deepEqual(history.restoreKnowledgeHistory(saved(), now + 100), {
    savedAt: now,
    turns: [turn],
  });
});
test("history expires after two hours without being renewed by reading", () => {
  assert.equal(
    history.restoreKnowledgeHistory(saved(), now + 2 * 60 * 60 * 1000),
    null,
  );
  assert.equal(
    history.restoreKnowledgeHistory(saved({ savedAt: now + 1 }), now),
    null,
  );
});
test("corrupt, oversized and unsupported history are rejected", () => {
  for (const raw of [
    "bad JSON",
    saved({ version: 2 }),
    saved({ turns: Array(6).fill(turn) }),
    " ".repeat(200001),
  ])
    assert.equal(history.restoreKnowledgeHistory(raw, now), null);
});
test("stored citations and navigation cannot introduce external or executable URLs", () => {
  for (const href of [
    "javascript:alert(1)",
    "//example.com",
    "/en/projects/%2f%2fevil",
    "/en/projects/a?redirect=https://evil",
  ]) {
    const unsafe = structuredClone(turn);
    unsafe.result.sources[0].href = href;
    assert.equal(
      history.restoreKnowledgeHistory(saved({ turns: [unsafe] }), now),
      null,
    );
  }
  const unsafe = structuredClone(turn);
  unsafe.result.actions[0].target = "https://evil.example";
  assert.equal(
    history.restoreKnowledgeHistory(saved({ turns: [unsafe] }), now),
    null,
  );
});

test("published case-study citations survive history restoration", () => {
  const cited = structuredClone(turn);
  cited.result.sources[0].href = "/de/projects/project-1/case-study";
  cited.result.actions[0].target = "/de/projects/project-1/case-study";
  assert.deepEqual(
    history.restoreKnowledgeHistory(saved({ turns: [cited] }), now)?.turns,
    [cited],
  );
});
