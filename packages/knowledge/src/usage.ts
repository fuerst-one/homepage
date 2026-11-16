import { randomUUID } from "node:crypto";
import { knowledgeDatabase } from "@homepage/database/database";
import type { KnowledgeConsent } from "@homepage/content/knowledgeConsent";
import { readKnowledgeSettings } from "./policy";

export class KnowledgeQuotaError extends Error {}

/** Serialize admission checks across all server instances before starting paid work. */
export async function reserveKnowledgeUsage(
  visitor: string,
  indexer = false,
  signal?: AbortSignal,
  consent?: KnowledgeConsent,
) {
  signal?.throwIfAborted();
  const sql = knowledgeDatabase(),
    amount = indexer ? 10_000 : 100_000;
  return sql.begin(async (tx) => {
    signal?.throwIfAborted();
    await tx`SELECT pg_advisory_xact_lock(816161)`.signal(signal);
    const settings = await readKnowledgeSettings(tx, signal);
    const kind = indexer
      ? visitor === "availability-probe"
        ? "probe"
        : "indexer"
      : "chat";
    const [usage] = await tx`
      SELECT coalesce(sum(amount_micro_usd) FILTER (WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'),0) AS daily,
        coalesce(sum(amount_micro_usd) FILTER (WHERE created_at >= date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'),0) AS monthly,
        count(*) FILTER (WHERE visitor = ${visitor} AND created_at > now() - interval '1 minute') AS recent,
        count(*) FILTER (WHERE visitor = ${visitor} AND created_at > now() - interval '1 day') AS visitor_daily,
        count(*) FILTER (WHERE kind='chat' AND created_at > now()-interval '1 minute') AS global_recent,
        count(*) FILTER (WHERE kind='chat' AND created_at >= date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') AS global_daily,
        count(*) FILTER (WHERE kind='probe' AND created_at > now()-interval '1 minute') AS probe_recent,
        count(*) FILTER (WHERE kind='probe' AND created_at >= date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') AS probe_daily,
        count(*) FILTER (WHERE status = 'reserved' AND created_at > now() - interval '2 minutes') AS running
      FROM knowledge_usage
      WHERE created_at >= least(date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC', now() - interval '1 day')
    `.signal(signal);
    if (
      Number(usage.daily) + amount >
        Math.floor(settings.dailyBudgetUsd * 1_000_000) ||
      Number(usage.monthly) + amount >
        Math.floor(settings.monthlyBudgetUsd * 1_000_000) ||
      (kind !== "indexer" && !settings.enabled) ||
      (!indexer &&
        (Number(usage.recent) >= settings.visitorPerMinute ||
          Number(usage.visitor_daily) >= settings.visitorPerDay ||
          Number(usage.global_recent) >= settings.globalPerMinute ||
          Number(usage.global_daily) >= settings.globalPerDay)) ||
      (kind === "probe" &&
        (Number(usage.probe_recent) >= settings.probePerMinute ||
          Number(usage.probe_daily) >= settings.probePerDay)) ||
      Number(usage.running) >= settings.concurrency
    )
      throw new KnowledgeQuotaError("Knowledge allowance reached");
    const id = randomUUID();
    await tx`INSERT INTO knowledge_usage(id,visitor,amount_micro_usd,consent,kind) VALUES (${id},${visitor},${amount},${consent ? tx.json(consent) : null},${kind})`.signal(
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
