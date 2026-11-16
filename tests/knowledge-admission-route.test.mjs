import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { loadTs } from "./helpers/load-ts.mjs";

function route(name, admit) {
  const calls = [];
  const privacy = loadTs(
    new URL("../apps/web/src/lib/knowledgeConsent.ts", import.meta.url),
  );
  const fallback = { answer: "Browse projects.", sources: [], actions: [] };
  const dependencies = {
    "next/server": {
      NextResponse: { json: (body, options) => Response.json(body, options) },
      after: () => calls.push("probe-scheduled"),
    },
    "@homepage/content/knowledge": loadTs(
      new URL("../packages/content/src/knowledge.ts", import.meta.url),
    ),
    "@/lib/knowledgeConsent": privacy,
    "@/server/siteFeatures": {
      getSiteFeatures: () => ({ assistantEnabled: true }),
    },
    "@homepage/knowledge/usage": {
      KnowledgeQuotaError: class extends Error {},
    },
    "@homepage/knowledge/policy": { recordKnowledgeAdmission: async () => {} },
    "@/server/knowledge/admission": {
      getKnowledgeAdmission: async () => {
        calls.push("admission");
        return { allowed: admit, retryAt: Date.now() + 60000 };
      },
      knowledgeClientAddress: () => "local",
    },
  };
  for (const prefix of ["../../../", "../../../../"]) {
    dependencies[`${prefix}lib/knowledgeFallback`] = {
      knowledgeFallback: () => fallback,
    };
    dependencies[`${prefix}server/knowledge/chat`] = {
      answerKnowledge: async () => {
        calls.push("paid");
        return fallback;
      },
    };
    dependencies[`${prefix}server/knowledge/availability`] = {
      knowledgeAvailability: () => ({
        status: () => ({ available: true, verified: true, retryAt: 0 }),
        run: async (work) => work(new AbortController().signal),
      }),
      probeKnowledgeServices: async () => {},
    };
  }
  const exports = {};
  const source = readFileSync(
    new URL(`../apps/web/src/app/api/assistant/${name}`, import.meta.url),
    "utf8",
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  new Function("exports", "require", outputText)(exports, (name) => {
    assert.ok(dependencies[name], `Unexpected import ${name}`);
    return dependencies[name];
  });
  const request = new Request("https://example.test/api/assistant", {
    method: "POST",
    headers: {
      origin: "https://example.test",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      message: "Relevant projects?",
      locale: "en",
      consent: {
        version: privacy.KNOWLEDGE_CONSENT_VERSION,
        decidedAt: Date.now(),
        allowed: true,
        remember: false,
      },
    }),
  });
  request.nextUrl = new URL(request.url);
  return { exports, request, calls };
}
test("excluded direct POSTs use local fallback without paid calls or probes", async () => {
  const { exports, request, calls } = route("route.ts", false);
  const result = await (await exports.POST(request)).json();
  assert.equal(result.mode, "fallback");
  assert.equal(result.availability.available, false);
  assert.deepEqual(calls, ["admission"]);
});
test("excluded status checks cannot initiate paid recovery probes", async () => {
  process.env.KNOWLEDGE_DATABASE_URL = "postgres://localhost/test";
  process.env.OPENROUTER_API_KEY = "fixture";
  const { exports, calls } = route("status/route.ts", false);
  const result = await (
    await exports.GET(new Request("https://example.test/api/assistant/status"))
  ).json();
  assert.equal(result.available, false);
  assert.deepEqual(calls, ["admission"]);
});
test("selected direct POSTs dispatch only after admission", async () => {
  const { exports, request, calls } = route("route.ts", true);
  const result = await (await exports.POST(request)).json();
  assert.equal(result.mode, "answer");
  assert.deepEqual(calls, ["admission", "paid"]);
});
