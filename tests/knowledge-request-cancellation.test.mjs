import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { loadTs } from "./helpers/load-ts.mjs";

test("withdrawing an in-flight request prevents the next provider stage and does not trip the outage circuit", async () => {
  const core = loadTs(
    new URL("../packages/content/src/knowledge.ts", import.meta.url),
  );
  const privacy = loadTs(
    new URL("../apps/web/src/lib/knowledgeConsent.ts", import.meta.url),
  );
  const { createServiceCircuit } = loadTs(
    new URL(
      "../apps/web/src/server/knowledge/serviceCircuit.ts",
      import.meta.url,
    ),
  );
  const circuit = createServiceCircuit();
  const dispatched = [];
  let release, started;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const entered = new Promise((resolve) => {
    started = resolve;
  });
  const dependencies = {
    "next/server": {
      NextResponse: {
        json: (body, options = {}) => Response.json(body, options),
      },
      after: () => {},
    },
    "@homepage/content/knowledge": core,
    "@/lib/knowledgeConsent": privacy,
    "@/server/siteFeatures": loadTs(
      new URL("../apps/web/src/server/siteFeatures.ts", import.meta.url),
    ),
    "../../../lib/knowledgeFallback": {
      knowledgeFallback: () => ({
        answer: "Browse projects.",
        sources: [],
        actions: [],
      }),
    },
    "@homepage/knowledge/usage": {
      KnowledgeQuotaError: class extends Error {},
    },
    "../../../server/knowledge/availability": {
      knowledgeAvailability: () => circuit,
      probeKnowledgeServices: async () => {},
    },
    "../../../server/knowledge/chat": {
      answerKnowledge: async (_message, _locale, _ip, signal) => {
        started();
        await gate;
        signal.throwIfAborted();
        dispatched.push("next provider call");
        return { answer: "Answer.", sources: [], actions: [] };
      },
    },
  };
  const source = readFileSync(
    new URL("../apps/web/src/app/api/assistant/route.ts", import.meta.url),
    "utf8",
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const exports = {};
  new Function("exports", "require", outputText)(exports, (name) => {
    assert.ok(dependencies[name], `unexpected dependency ${name}`);
    return dependencies[name];
  });
  const previous = process.env.KNOWLEDGE_ASSISTANT_ENABLED;
  const previousPublic = process.env.NEXT_PUBLIC_KNOWLEDGE_ASSISTANT_ENABLED;
  process.env.KNOWLEDGE_ASSISTANT_ENABLED = "true";
  process.env.NEXT_PUBLIC_KNOWLEDGE_ASSISTANT_ENABLED = "true";
  const controller = new AbortController();
  const request = new Request("http://localhost/api/assistant", {
    method: "POST",
    headers: { origin: "http://localhost", "content-type": "application/json" },
    body: JSON.stringify({
      message: "My question",
      locale: "en",
      consent: {
        version: privacy.KNOWLEDGE_CONSENT_VERSION,
        decidedAt: Date.now(),
        allowed: true,
        remember: false,
      },
    }),
    signal: controller.signal,
  });
  request.nextUrl = new URL(request.url);
  try {
    const response = exports.POST(request);
    await entered;
    controller.abort(new DOMException("Withdrawn", "AbortError"));
    release();
    await response;
    assert.deepEqual(dispatched, []);
    assert.equal(circuit.status().available, true);
  } finally {
    if (previous === undefined) delete process.env.KNOWLEDGE_ASSISTANT_ENABLED;
    else process.env.KNOWLEDGE_ASSISTANT_ENABLED = previous;
    if (previousPublic === undefined)
      delete process.env.NEXT_PUBLIC_KNOWLEDGE_ASSISTANT_ENABLED;
    else process.env.NEXT_PUBLIC_KNOWLEDGE_ASSISTANT_ENABLED = previousPublic;
  }
});
