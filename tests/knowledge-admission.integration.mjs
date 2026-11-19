import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile, access } from "node:fs/promises";
import { loadTs } from "./helpers/load-ts.mjs";

const url = new URL(
  process.env.KNOWLEDGE_DATABASE_URL || "http://unconfigured",
);
if (
  !["localhost", "127.0.0.1"].includes(url.hostname) ||
  !url.pathname.endsWith("_test")
)
  throw new Error(
    "Admission integration tests require a dedicated localhost _test database",
  );
const { knowledgeDatabase } = loadTs(
  new URL("../packages/database/src/database.ts", import.meta.url),
);
const usage = loadTs(
  new URL("../packages/knowledge/src/usage.ts", import.meta.url),
);
const sql = knowledgeDatabase();
test("database policy enforces global/probe caps, pause, live updates and independent expiry", async () => {
  try {
    const migration = new URL(
      "../packages/database/migrations/008-ai-admission.sql",
      import.meta.url,
    );
    assert.equal(
      await access(migration).then(
        () => true,
        () => false,
      ),
      true,
      "AI settings migration exists",
    );
    await sql.unsafe(
      await readFile(
        new URL(
          "../packages/database/migrations/001-initial.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await sql.unsafe(await readFile(migration, "utf8"));
    await sql.unsafe(await readFile(migration, "utf8"));
    await sql`TRUNCATE knowledge_usage, knowledge_admission_counts`;
    const setting = (key, value) =>
      sql`INSERT INTO settings(key,value) VALUES (${key},${sql.json(value)}) ON CONFLICT(key) DO UPDATE SET value=excluded.value`;
    await setting("ai.enabled", true);
    await setting("ai.global_per_minute", 2);
    await setting("ai.probe_per_day", 12);
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, (_, i) =>
        usage.reserveKnowledgeUsage(`visitor-${i}`),
      ),
    );
    assert.equal(
      results.filter((x) => x.status === "fulfilled").length,
      2,
      "global admission is atomic across different visitors",
    );
    for (const x of results)
      if (x.status === "fulfilled")
        await usage.finishKnowledgeUsage(x.value, 0);
    await assert.rejects(
      usage.reserveKnowledgeUsage("different-visitor"),
      /allowance/i,
    );
    assert.equal(
      await usage.knowledgeChatAllowance("different-visitor"),
      false,
      "a used-up cap is visible without reserving paid work",
    );
    await setting("ai.global_per_minute", 3);
    assert.equal(await usage.knowledgeChatAllowance("different-visitor"), true);
    await setting("ai.daily_budget_usd", 0);
    assert.equal(
      await usage.knowledgeChatAllowance("different-visitor"),
      false,
      "an exhausted budget is visible without reserving paid work",
    );
    await setting("ai.daily_budget_usd", 1);
    const [before] = await sql`SELECT count(*) AS total FROM knowledge_usage`;
    assert.equal(Number(before.total), 2, "allowance checks record no usage");
    await usage.finishKnowledgeUsage(
      await usage.reserveKnowledgeUsage("different-visitor"),
      0,
    );
    await setting("ai.enabled", false);
    await assert.rejects(usage.reserveKnowledgeUsage("paused"), /allowance/i);
    await assert.rejects(
      usage.reserveKnowledgeUsage("availability-probe", true),
      /allowance/i,
    );
    // Indexing may maintain the public corpus while interactive AI is paused.
    await usage.finishKnowledgeUsage(
      await usage.reserveKnowledgeUsage("indexer", true),
      0,
    );
    await setting("ai.enabled", true);
    await setting("ai.probe_per_day", 1);
    await usage.finishKnowledgeUsage(
      await usage.reserveKnowledgeUsage("availability-probe", true),
      0,
    );
    await assert.rejects(
      usage.reserveKnowledgeUsage("availability-probe", true),
      /allowance/i,
    );
    await setting("ai.global_per_minute", "invalid");
    await assert.rejects(usage.reserveKnowledgeUsage("invalid-policy"));
    await setting("ai.global_per_minute", 20);
    await setting("ai.probe_per_minute", 0);
    await assert.rejects(
      usage.reserveKnowledgeUsage("availability-probe", true),
      /allowance/i,
    );
    await setting("ai.probe_per_minute", 1);
    const consent = {
      version: "test-receipt",
      allowed: true,
      remember: false,
      decidedAt: Date.now(),
    };
    const id = await usage.reserveKnowledgeUsage(
      "receipt",
      false,
      undefined,
      consent,
    );
    const [receipt] =
      await sql`SELECT consent FROM knowledge_usage WHERE id=${id}`;
    assert.deepEqual(
      receipt.consent,
      consent,
      "consent is stored as structured JSON, not a quoted string",
    );
    await sql`INSERT INTO knowledge_usage(id, visitor, amount_micro_usd, created_at) VALUES ('00000000-0000-4000-8000-000000000001','expired',1,now()-interval '36 days')`;
    const { cleanupKnowledgeUsage } = loadTs(
      new URL("../packages/knowledge/src/policy.ts", import.meta.url),
    );
    await cleanupKnowledgeUsage();
    const [row] =
      await sql`SELECT count(*) AS total FROM knowledge_usage WHERE visitor='expired'`;
    assert.equal(Number(row.total), 0);
  } finally {
    await sql.end();
  }
});
