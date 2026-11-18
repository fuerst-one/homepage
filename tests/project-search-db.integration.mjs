import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

test("semantic retrieval ranks and deduplicates real indexed projects in PostgreSQL", async () => {
  const database = loadTs(
    new URL("../packages/database/src/database.ts", import.meta.url),
  );
  const router = loadTs(
    new URL("../packages/knowledge/src/openRouter.ts", import.meta.url),
  );
  const usage = loadTs(
    new URL("../packages/knowledge/src/usage.ts", import.meta.url),
  );
  const { searchKnowledgeProjects } = loadTs(
    new URL(
      "../apps/web/src/server/knowledge/projectSearch.ts",
      import.meta.url,
    ),
  );
  const sql = database.knowledgeDatabase();
  const previousSecret = process.env.KNOWLEDGE_RATE_LIMIT_SECRET;
  process.env.KNOWLEDGE_RATE_LIMIT_SECRET = "local-retrieval-verification";
  try {
    const [seed] = await sql`
      SELECT d.project_id,c.embedding::text AS embedding
      FROM knowledge_documents d JOIN knowledge_chunks c ON c.document_id=d.id
      WHERE d.locale='en' AND c.id LIKE '%:0'
      ORDER BY length(c.content) DESC LIMIT 1
    `;
    assert.ok(seed, "run knowledge:sync before this integration check");
    // Exercise the real retrieval SQL with a stored vector. No provider calls,
    // budget changes or public AI-setting changes are made by this check.
    router.embedKnowledgeWithUsage = async () => ({
      vectors: [JSON.parse(seed.embedding)],
      costUsd: 0,
    });
    usage.reserveKnowledgeUsage = async () => "read-only-verification";
    usage.finishKnowledgeUsage = async () => {};
    const ids = await searchKnowledgeProjects(
      "nebulaquartz",
      "test",
      AbortSignal.timeout(5000),
    );
    assert.equal(ids[0], seed.project_id);
    assert.equal(ids.length, new Set(ids).size);
    const known =
      await sql`SELECT DISTINCT project_id FROM knowledge_documents`;
    const publicIds = new Set(known.map((row) => row.project_id));
    assert.ok(ids.every((id) => publicIds.has(id)));
  } finally {
    if (previousSecret === undefined)
      delete process.env.KNOWLEDGE_RATE_LIMIT_SECRET;
    else process.env.KNOWLEDGE_RATE_LIMIT_SECRET = previousSecret;
    await sql.end();
  }
});
