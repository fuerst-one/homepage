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
) {
  throw new Error(
    "Integration tests require a dedicated localhost database ending in _test",
  );
}
const { knowledgeDatabase } = loadTs(
  new URL("../packages/database/src/database.ts", import.meta.url),
);
const { reserveKnowledgeUsage, finishKnowledgeUsage } = loadTs(
  new URL("../packages/knowledge/src/usage.ts", import.meta.url),
);
const sql = knowledgeDatabase();
const { cachedKnowledgeEmbeddings } = loadTs(
  new URL("../packages/knowledge/src/embeddingCache.ts", import.meta.url),
);
test("a failed late batch reuses already paid embeddings on retry", async () => {
  await sql.unsafe(
    await readFile(
      new URL(
        "../packages/database/migrations/001-initial.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await sql`TRUNCATE knowledge_embedding_cache`;
  const chunks = Array.from({ length: 20 }, (_, i) => `passage ${i}`);
  const paid = [];
  const vector = Array.from({ length: 1536 }, (_, i) => (i === 0 ? 1 : 0));
  await assert.rejects(
    cachedKnowledgeEmbeddings(sql, chunks, "test", async (batch) => {
      if (paid.length) throw new Error("upstream interrupted");
      paid.push(...batch);
      return batch.map(() => vector);
    }),
    /interrupted/,
  );
  const result = await cachedKnowledgeEmbeddings(
    sql,
    chunks,
    "test",
    async (batch) => {
      paid.push(...batch);
      return batch.map(() => vector);
    },
  );
  assert.deepEqual(
    paid,
    chunks,
    "each passage is paid for once despite the retry",
  );
  assert.equal(result.length, 20);
});
test("real PostgreSQL enforces atomic reservations, concurrency and visitor limits", async () => {
  const migration = await readFile(
    new URL("../packages/database/migrations/001-initial.sql", import.meta.url),
    "utf8",
  );
  try {
    await sql.unsafe(migration);
    await sql.unsafe(migration); // A rerun preserves the existing schema.
    await sql.unsafe(
      await readFile(
        new URL(
          "../packages/database/migrations/008-ai-admission.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await sql`TRUNCATE knowledge_usage`;
    await sql`UPDATE settings SET value='true' WHERE key='ai.enabled'`;
    await sql`UPDATE settings SET value='1' WHERE key='ai.daily_budget_usd'`;
    await sql`UPDATE settings SET value='20' WHERE key='ai.global_per_minute'`;
    const attempts = await Promise.allSettled(
      Array.from({ length: 12 }, (_, i) =>
        reserveKnowledgeUsage(`visitor-${i}`),
      ),
    );
    const admitted = attempts.filter((r) => r.status === "fulfilled");
    assert.equal(
      admitted.length,
      3,
      "only three paid requests may be in flight globally",
    );
    for (const attempt of admitted)
      await finishKnowledgeUsage(attempt.value, 0.002);
    assert.ok(await reserveKnowledgeUsage("another-visitor"));
    await sql`TRUNCATE knowledge_usage`;
    await sql`UPDATE settings SET value='0.2' WHERE key='ai.daily_budget_usd'`;
    const budgets = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) =>
        reserveKnowledgeUsage(`budget-${i}`),
      ),
    );
    assert.equal(
      budgets.filter((r) => r.status === "fulfilled").length,
      2,
      "parallel calls cannot reuse the same remaining budget",
    );
    await sql`TRUNCATE knowledge_usage`;
    await sql`UPDATE settings SET value='1' WHERE key='ai.daily_budget_usd'`;
    for (let i = 0; i < 3; i++)
      await finishKnowledgeUsage(
        await reserveKnowledgeUsage("same-visitor"),
        0,
      );
    await assert.rejects(reserveKnowledgeUsage("same-visitor"), /allowance/i);
  } finally {
    await sql.end();
  }
});
