import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

test("a visitor question cannot be admitted without a current explicit AI consent receipt", () => {
  const { parseKnowledgeRequest } = loadTs(
    new URL("../packages/content/src/knowledge.ts", import.meta.url),
  );
  assert.equal(
    parseKnowledgeRequest({ message: "Relevant projects?", locale: "en" }),
    null,
  );
});

test("missing logos never cause an automatic third-party request", () => {
  const { getProjectLogoSources } = loadTs(
    new URL(
      "../apps/web/src/components/Cv/Projects/getProjectLogoSources.ts",
      import.meta.url,
    ),
  );
  assert.deepEqual(
    getProjectLogoSources({
      websiteUrl: "https://client.example",
      githubUrl: "https://github.com/client",
    }),
    [],
  );
  assert.deepEqual(
    getProjectLogoSources({
      logo: ["/api/image/project/Logo", "/api/image/project/Logo"],
    }),
    ["/api/image/project/Logo"],
  );
});

test("consent is versioned, bounded to six months, and history is a separate boolean choice", () => {
  const {
    parseKnowledgeConsent,
    parseKnowledgeDecision,
    KNOWLEDGE_CONSENT_VERSION,
    KNOWLEDGE_CONSENT_TTL,
  } = loadTs(
    new URL("../apps/web/src/lib/knowledgeConsent.ts", import.meta.url),
  );
  const now = Date.now();
  const receipt = {
    version: KNOWLEDGE_CONSENT_VERSION,
    decidedAt: now,
    remember: false,
    allowed: true,
  };
  assert.deepEqual(parseKnowledgeConsent(receipt, now), receipt);
  const declined = { ...receipt, allowed: false };
  assert.deepEqual(parseKnowledgeDecision(declined, now), declined);
  assert.equal(parseKnowledgeConsent(declined, now), null);
  for (const invalid of [
    null,
    {},
    { ...receipt, version: "old" },
    { ...receipt, version: "2026-11-16.1" },
    { ...receipt, version: "2026-11-16.2" },
    { ...receipt, version: "2026-11-18.1" },
    { ...receipt, version: "2026-11-18.2" },
    { ...receipt, remember: "true" },
    { ...receipt, decidedAt: now + 120000 },
    { ...receipt, decidedAt: now - KNOWLEDGE_CONSENT_TTL },
    { ...receipt, extra: true },
  ])
    assert.equal(parseKnowledgeConsent(invalid, now), null);
  const { parseKnowledgeRequest } = loadTs(
    new URL("../packages/content/src/knowledge.ts", import.meta.url),
  );
  assert.deepEqual(
    parseKnowledgeRequest({
      message: "  Work?  ",
      locale: "de",
      consent: receipt,
    }),
    { message: "Work?", locale: "de", consent: receipt },
  );
});

test("both embedding and answer calls enforce no-training and ZDR routing without allowing callers to weaken it", async () => {
  const { routerRequest } = loadTs(
    new URL("../packages/knowledge/src/openRouter.ts", import.meta.url),
  );
  const previous = globalThis.fetch;
  const key = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "test-key";
  const bodies = [];
  globalThis.fetch = async (_, options) => {
    bodies.push(JSON.parse(options.body));
    return Response.json({});
  };
  try {
    await routerRequest("embeddings", {
      input: ["public"],
      provider: { data_collection: "allow", zdr: false },
    });
    await routerRequest("chat/completions", {
      messages: [],
      provider: { require_parameters: true },
    });
    for (const body of bodies) {
      assert.equal(body.provider.data_collection, "deny");
      assert.equal(body.provider.zdr, true);
      assert.deepEqual(body.provider.only, ["azure"]);
      assert.equal(body.provider.allow_fallbacks, false);
    }
    assert.equal(bodies[1].provider.require_parameters, true);
  } finally {
    globalThis.fetch = previous;
    if (key === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = key;
  }
});
