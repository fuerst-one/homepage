import { randomUUID } from "node:crypto";
import { knowledgeDatabase } from "@homepage/database/database";

export class KnowledgeQuotaError extends Error {}
const budget = (value: string | undefined, fallback: number) => {
  const amount = Number(value ?? fallback);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100)
    throw new Error("Invalid knowledge budget");
  return Math.floor(amount * 1_000_000);
};

/** Serialize admission checks across all server instances before starting paid work. */
export async function reserveKnowledgeUsage(
  visitor: string,
  indexer = false,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  const sql = knowledgeDatabase(),
    amount = indexer ? 10_000 : 100_000;
  return sql.begin(async (tx) => {
    signal?.throwIfAborted();
    await tx`SELECT pg_advisory_xact_lock(816161)`.signal(signal);
    const [usage] = await tx`
      SELECT coalesce(sum(amount_micro_usd) FILTER (WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'),0) AS daily,
        coalesce(sum(amount_micro_usd) FILTER (WHERE created_at >= date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'),0) AS monthly,
        count(*) FILTER (WHERE visitor = ${visitor} AND created_at > now() - interval '1 minute') AS recent,
        count(*) FILTER (WHERE visitor = ${visitor} AND created_at > now() - interval '1 day') AS visitor_daily,
        count(*) FILTER (WHERE status = 'reserved' AND created_at > now() - interval '2 minutes') AS running
      FROM knowledge_usage
      WHERE created_at >= least(date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC', now() - interval '1 day')
    `.signal(signal);
    if (
      Number(usage.daily) + amount >
        budget(process.env.KNOWLEDGE_DAILY_BUDGET_USD, 1) ||
      Number(usage.monthly) + amount >
        budget(process.env.KNOWLEDGE_MONTHLY_BUDGET_USD, 10) ||
      (!indexer &&
        (Number(usage.recent) >= 3 || Number(usage.visitor_daily) >= 20)) ||
      Number(usage.running) >= 3
    )
      throw new KnowledgeQuotaError("Knowledge allowance reached");
    const id = randomUUID();
    await tx`INSERT INTO knowledge_usage(id,visitor,amount_micro_usd) VALUES (${id},${visitor},${amount})`.signal(
      signal,
    );
    // Usage records contain no prompts, responses or raw IP addresses.
    await tx`DELETE FROM knowledge_usage WHERE created_at < now() - interval '35 days'`.signal(
      signal,
    );
    return id;
  });
}

export async function finishKnowledgeUsage(
  id: string,
  costUsd?: number,
  failed = false,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  const sql = knowledgeDatabase();
  // Unknown costs retain the full reservation, including timeouts and upstream errors.
  if (
    !failed &&
    typeof costUsd === "number" &&
    Number.isFinite(costUsd) &&
    costUsd >= 0
  ) {
    await sql`UPDATE knowledge_usage SET status = 'complete', amount_micro_usd = ${Math.ceil((costUsd + 0.001) * 1_000_000)} WHERE id = ${id}`.signal(
      signal,
    );
  } else {
    await sql`UPDATE knowledge_usage SET status = ${failed ? "failed" : "complete"} WHERE id = ${id}`.signal(
      signal,
    );
  }
}
