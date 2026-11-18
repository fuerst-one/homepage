import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { loadTs } from "./helpers/load-ts.mjs";

const url = new URL(
  process.env.KNOWLEDGE_DATABASE_URL || "http://unconfigured",
);
if (
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  !url.pathname.endsWith("_test")
)
  throw new Error(
    "Real provider check requires a dedicated localhost _test database",
  );

test("real provider answers persist and a supported paraphrase reuses an answer", async () => {
  const { knowledgeDatabase } = loadTs(
    new URL("../packages/database/src/database.ts", import.meta.url),
  );
  const { answerKnowledge } = loadTs(
    new URL("../apps/web/src/server/knowledge/chat.ts", import.meta.url),
  );
  const { searchKnowledgeProjects } = loadTs(
    new URL(
      "../apps/web/src/server/knowledge/projectSearch.ts",
      import.meta.url,
    ),
  );
  const { KNOWLEDGE_CONSENT_VERSION } = loadTs(
    new URL("../packages/content/src/knowledgeConsent.ts", import.meta.url),
  );
  const sql = knowledgeDatabase();
  const fixture = globalThis.cachePublicFixture;
  assert.ok(fixture, "run through tests/run-knowledge-cache.mjs --provider");
  const originalFetch = globalThis.fetch;
  const calls = { embeddings: 0, chat: 0 };
  const receipt = {
    version: KNOWLEDGE_CONSENT_VERSION,
    decidedAt: Date.now(),
    allowed: true,
    remember: false,
  };
  try {
    for (const file of [
      "001-initial.sql",
      "003-notion-resilience.sql",
      "005-public-content.sql",
      "008-project-dimensions.sql",
      "008-ai-admission.sql",
      "009-query-cache.sql",
      "010-query-cache-retention.sql",
      "011-image-descriptions.sql",
    ])
      await sql.unsafe(
        await readFile(
          new URL(`../packages/database/migrations/${file}`, import.meta.url),
          "utf8",
        ),
      );
    await sql`TRUNCATE knowledge_query_cache,knowledge_response_cache,knowledge_documents CASCADE`;
    await sql`INSERT INTO knowledge_documents(id,project_id,title,locale,href,hash,embedding_model) VALUES('fixture',${fixture.project_id},${fixture.title},'en',${fixture.href},${fixture.hash},${fixture.embedding_model})`;
    await sql`INSERT INTO knowledge_chunks(id,document_id,content,embedding) VALUES('fixture:0','fixture',${fixture.content},${fixture.embedding}::vector)`;
    await sql`INSERT INTO knowledge_sync(id,synced_at) VALUES(1,now()) ON CONFLICT(id) DO UPDATE SET synced_at=now()`;
    await sql`UPDATE settings SET value='true' WHERE key='ai.enabled'`;
    await sql`UPDATE settings SET value='0.5' WHERE key='ai.daily_budget_usd'`;
    await sql`UPDATE settings SET value='20' WHERE key='ai.visitor_per_minute'`;
    globalThis.fetch = async (resource, options) => {
      if (String(resource).endsWith("/embeddings")) calls.embeddings++;
      if (String(resource).endsWith("/chat/completions")) calls.chat++;
      return originalFetch(resource, options);
    };
    await searchKnowledgeProjects(
      "Show me React projects",
      "provider-cache-test",
      AbortSignal.timeout(8000),
      receipt,
    );
    const first = await answerKnowledge(
      "Show me React projects",
      "en",
      "provider-cache-test",
      AbortSignal.timeout(8000),
      receipt,
    );
    assert.ok(
      first.sources.length,
      "real model must produce a grounded response for cache eligibility",
    );
    assert.deepEqual(
      calls,
      { embeddings: 1, chat: 1 },
      "both services share a real vector",
    );
    const exact = await answerKnowledge(
      "Show me React projects",
      "en",
      "provider-cache-test",
      AbortSignal.timeout(8000),
      receipt,
    );
    assert.deepEqual(exact, first);
    assert.deepEqual(calls, { embeddings: 1, chat: 1 });
    const similar = await answerKnowledge(
      "Find React projects",
      "en",
      "provider-cache-test",
      AbortSignal.timeout(8000),
      receipt,
    );
    assert.deepEqual(similar, first);
    assert.deepEqual(calls, { embeddings: 2, chat: 1 });
    await answerKnowledge(
      "Projects without React",
      "en",
      "provider-cache-test",
      AbortSignal.timeout(8000),
      receipt,
    );
    assert.deepEqual(
      calls,
      { embeddings: 3, chat: 2 },
      "negative constraint must generate separately",
    );
    const [accounting] =
      await sql`SELECT sum(amount_micro_usd)/1000000.0 AS accounted_usd FROM knowledge_usage`;
    console.log(
      JSON.stringify({
        realProviderCalls: calls,
        uncachedCalls: { embeddings: 5, chat: 4 },
        accountedUsdIncludingSafetyMargin: accounting.accounted_usd,
      }),
    );
  } finally {
    globalThis.fetch = originalFetch;
    await sql`UPDATE settings SET value='false' WHERE key='ai.enabled'`;
    await sql.end();
  }
});
