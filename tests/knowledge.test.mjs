import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
test("model schema restricts citation IDs and action targets to this retrieval", () => {
  const { knowledgeResponseSchema } = loadTs(
    new URL("../src/lib/knowledge.ts", import.meta.url),
  );
  const schema = knowledgeResponseSchema([
    { id: "s1", projectId: "project-1" },
  ]);
  assert.deepEqual(schema.properties.sourceIds.items.enum, ["s1"]);
  assert.deepEqual(schema.properties.actions.items.properties.target.enum, [
    "project-1",
    "projects",
    "contact",
    "hire",
    "search",
  ]);
});

const core = loadTs(new URL("../src/lib/knowledge.ts", import.meta.url));
const { KNOWLEDGE_CONSENT_VERSION } = loadTs(
  new URL("../src/lib/knowledgeConsent.ts", import.meta.url),
);

test("chat rejects oversized messages, invalid locales and injected model settings", () => {
  const consent = {
    version: KNOWLEDGE_CONSENT_VERSION,
    decidedAt: Date.now(),
    remember: false,
    allowed: true,
  };
  assert.equal(
    core.parseKnowledgeRequest({ message: "a".repeat(1001), locale: "en" }),
    null,
  );
  assert.equal(
    core.parseKnowledgeRequest({ message: "hello", locale: "fr" }),
    null,
  );
  assert.equal(
    core.parseKnowledgeRequest({
      message: "hello",
      locale: "en",
      model: "expensive",
    }),
    null,
  );
  assert.deepEqual(
    core.parseKnowledgeRequest({
      message: "  Relevant AI projects? ",
      locale: "de",
      consent,
    }),
    {
      message: "Relevant AI projects?",
      locale: "de",
      consent,
    },
  );
});

test("chunks preserve text and headings without exceeding the size limit", () => {
  const chunks = core.chunkKnowledge("Overview\n\n" + "Word ".repeat(900));
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length <= 1800 && chunk.length > 0));
  assert.equal(
    chunks.join(" ").replace(/\s+/g, " "),
    ("Overview\n\n" + "Word ".repeat(900)).trim().replace(/\s+/g, " "),
  );
});

const sources = [
  {
    id: "s1",
    projectId: "p1",
    title: "Konfig",
    href: "/en/projects/konfig/case-study",
    content: "Public evidence",
  },
];
test("model output can cite and navigate only the retrieved public documents", () => {
  const result = core.validateKnowledgeAnswer(
    {
      answer: "A relevant project.",
      sourceIds: ["s1", "secret", "s1"],
      actions: [
        { type: "navigate", target: "https://evil.example" },
        { type: "navigate", target: "p1" },
        { type: "filter", target: "private-project" },
        { type: "highlight", target: "search" },
      ],
    },
    sources,
    "en",
  );
  assert.deepEqual(
    result.sources.map((source) => source.id),
    ["s1"],
  );
  assert.deepEqual(result.actions, [
    {
      type: "navigate",
      target: "/en/projects/konfig/case-study",
      label: "Konfig",
    },
    { type: "highlight", target: "search", label: "Highlight search" },
  ]);
});

test("uncited answers and malformed structured responses cannot become grounded answers", () => {
  assert.equal(
    core.validateKnowledgeAnswer(
      { answer: "Made up", sourceIds: [], actions: [] },
      sources,
      "en",
    ),
    null,
  );
  assert.equal(
    core.validateKnowledgeAnswer(
      { answer: "x".repeat(5001), sourceIds: ["s1"], actions: [] },
      sources,
      "en",
    ),
    null,
  );
  assert.equal(core.validateKnowledgeAnswer(null, sources, "en"), null);
});

test("safe navigation actions use the visitor's locale and filter only cited projects", () => {
  const result = core.validateKnowledgeAnswer(
    {
      answer: "Konfig passt.",
      sourceIds: ["s1"],
      actions: [
        { type: "navigate", target: "contact" },
        { type: "filter", target: "p1" },
        { type: "highlight", target: "document.body" },
      ],
    },
    sources,
    "de",
  );
  assert.equal(result.actions[0].target, "/de/contact");
  assert.equal(result.actions[1].target, "p1");
  assert.equal(result.actions.length, 2);
});
