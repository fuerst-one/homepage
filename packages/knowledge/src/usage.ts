import { randomUUID } from "node:crypto";
import type postgres from "postgres";
import { knowledgeDatabase } from "@homepage/database/database";
import type { KnowledgeConsent } from "@homepage/content/knowledgeConsent";
import { readKnowledgeSettings, type KnowledgeSettings } from "./policy";

export class KnowledgeQuotaError extends Error {}

const CHAT_RESERVATION_MICRO_USD = 100_000;
const INDEXER_RESERVATION_MICRO_USD = 10_000;

async function readKnowledgeUsage(
  sql: postgres.Sql | postgres.TransactionSql,
  visitor: string,
  signal?: AbortSignal,
) {
  const [usage] = await sql`
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
  return usage;
}
type KnowledgeUsage = Awaited<ReturnType<typeof readKnowledgeUsage>>;

const exceedsBudget = (
  usage: KnowledgeUsage,
  settings: KnowledgeSettings,
  amount: number,
) =>
  Number(usage.daily) + amount >
    Math.floor(settings.dailyBudgetUsd * 1_000_000) ||
  Number(usage.monthly) + amount >
    Math.floor(settings.monthlyBudgetUsd * 1_000_000);

const exceedsChatCaps = (usage: KnowledgeUsage, settings: KnowledgeSettings) =>
  Number(usage.recent) >= settings.visitorPerMinute ||
  Number(usage.visitor_daily) >= settings.visitorPerDay ||
  Number(usage.global_recent) >= settings.globalPerMinute ||
  Number(usage.global_daily) >= settings.globalPerDay;

/**
 * Whether a question from this visitor would be admitted now, without reserving
 * anything. Momentary concurrency is ignored: it clears within a request.
 */
export async function knowledgeChatAllowance(
  visitor: string,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  const sql = knowledgeDatabase();
  const settings = await readKnowledgeSettings(sql, signal);
  const usage = await readKnowledgeUsage(sql, visitor, signal);
  return (
    settings.enabled &&
    !exceedsBudget(usage, settings, CHAT_RESERVATION_MICRO_USD) &&
    !exceedsChatCaps(usage, settings)
  );
}

/** Serialize admission checks across all server instances before starting paid work. */
export async function reserveKnowledgeUsage(
  visitor: string,
  indexer = false,
  signal?: AbortSignal,
  consent?: KnowledgeConsent,
) {
  signal?.throwIfAborted();
  const sql = knowledgeDatabase(),
    amount = indexer
      ? INDEXER_RESERVATION_MICRO_USD
      : CHAT_RESERVATION_MICRO_USD;
  return sql.begin(async (tx) => {
    signal?.throwIfAborted();
    await tx`SELECT pg_advisory_xact_lock(816161)`.signal(signal);
    const settings = await readKnowledgeSettings(tx, signal);
    const kind = indexer
      ? visitor === "availability-probe"
        ? "probe"
        : "indexer"
      : "chat";
    const usage = await readKnowledgeUsage(tx, visitor, signal);
    if (
      exceedsBudget(usage, settings, amount) ||
      (kind !== "indexer" && !settings.enabled) ||
      (!indexer && exceedsChatCaps(usage, settings)) ||
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
    await sql`UPDATE knowledge_usage SET status = 'complete', amount_micro_usd = ${costUsd === 0 ? 0 : Math.ceil((costUsd + 0.001) * 1_000_000)} WHERE id = ${id}`.signal(
      signal,
    );
  } else {
    await sql`UPDATE knowledge_usage SET status = ${failed ? "failed" : "complete"} WHERE id = ${id}`.signal(
      signal,
    );
  }
}
