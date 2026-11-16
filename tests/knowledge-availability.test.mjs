import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const moduleAt = (name) =>
  loadTs(
    new URL(
      name === "database"
        ? "../packages/database/src/database.ts"
        : ["openRouter", "usage"].includes(name)
          ? `../packages/knowledge/src/${name}.ts`
          : `../apps/web/src/server/knowledge/${name}.ts`,
      import.meta.url,
    ),
  );
const database = moduleAt("database");
const router = moduleAt("openRouter");
const usage = moduleAt("usage");
const { probeKnowledgeServices } = moduleAt("availability");
const { createServiceCircuit } = moduleAt("serviceCircuit");
process.env.KNOWLEDGE_RATE_LIMIT_SECRET = "test-only-secret";
function setup() {
  const calls = [];
  database.knowledgeDatabase = () => (strings) => ({
    signal: async (signal) => {
      signal.throwIfAborted();
      calls.push("db");
      return strings.join("").includes("knowledge_sync")
        ? [{ fresh: true }]
        : [{}];
    },
  });
  router.embeddingModel = () => "openai/text-embedding-3-small";
  router.chatModel = () => "test-model";
  router.verifyChatPrice = async (signal) => {
    signal.throwIfAborted();
    calls.push("price");
  };
  usage.reserveKnowledgeUsage = async (visitor, indexer, signal) => {
    signal.throwIfAborted();
    assert.equal(indexer, true);
    calls.push("reserve");
    return "r1";
  };
  router.embedKnowledge = async (input, signal) => {
    signal.throwIfAborted();
    assert.deepEqual(input, ["Portfolio availability check"]);
    calls.push("embedding");
  };
  router.routerRequest = async (path, body, signal) => {
    signal.throwIfAborted();
    assert.equal(path, "chat/completions");
    assert.equal(body.max_tokens, 64);
    assert.equal(body.response_format.json_schema.strict, true);
    calls.push("chat");
    return {
      choices: [
        {
          message: {
            content: JSON.stringify({
              answer: "OK",
              sourceIds: ["s1"],
              actions: [],
            }),
          },
        },
      ],
      usage: { cost: 0.000001 },
    };
  };
  usage.finishKnowledgeUsage = async (id, cost, failed) => {
    calls.push(failed ? "retain" : "finish");
  };
  return calls;
}
test("recovery proves DB, embeddings and chat, with budget admission before paid calls", async () => {
  const calls = setup();
  await probeKnowledgeServices(new AbortController().signal);
  assert.deepEqual(calls, [
    "db",
    "db",
    "price",
    "reserve",
    "embedding",
    "chat",
    "finish",
  ]);
});
test("DB failure skips all paid probes", async () => {
  const calls = setup();
  database.knowledgeDatabase = () => () => ({
    signal: async () => {
      throw new Error("DB unreachable");
    },
  });
  await assert.rejects(
    probeKnowledgeServices(new AbortController().signal),
    /DB unreachable/,
  );
  assert.deepEqual(calls, []);
});
test("exhausted budget blocks both paid probes", async () => {
  const calls = setup();
  usage.reserveKnowledgeUsage = async () => {
    throw new Error("quota");
  };
  await assert.rejects(
    probeKnowledgeServices(new AbortController().signal),
    /quota/,
  );
  assert.deepEqual(calls, ["db", "db", "price"]);
});
test("provider failure retains the conservative reservation and fails recovery", async () => {
  const calls = setup();
  router.routerRequest = async () => {
    throw new Error("OpenRouter unreachable");
  };
  await assert.rejects(
    probeKnowledgeServices(new AbortController().signal),
    /OpenRouter unreachable/,
  );
  assert.deepEqual(calls, [
    "db",
    "db",
    "price",
    "reserve",
    "embedding",
    "retain",
  ]);
});
test("a recovery deadline aborts DB work and never starts paid work later", async () => {
  const calls = setup();
  let received;
  database.knowledgeDatabase = () => () => ({
    signal: (signal) => {
      received = signal;
      return new Promise((resolve, reject) =>
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        }),
      );
    },
  });
  const circuit = createServiceCircuit({ probeTimeoutMs: 15 });
  await circuit.probe(probeKnowledgeServices, true);
  assert.equal(received.aborted, true);
  assert.equal(circuit.status().available, false);
  assert.deepEqual(calls, []);
});

test("plain text success cannot clear a structured-output capability failure", async () => {
  const calls = setup();
  router.routerRequest = async () => ({
    choices: [{ message: { content: "OK" } }],
  });
  await assert.rejects(probeKnowledgeServices(new AbortController().signal));
  assert.equal(calls.at(-1), "retain");
});
