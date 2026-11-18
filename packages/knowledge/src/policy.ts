import { createHmac } from "node:crypto";
import type postgres from "postgres";
import { knowledgeDatabase } from "@homepage/database/database";

const definitions = {
  enabled: ["ai.enabled", false],
  rolloutPercent: ["ai.rollout_percent", 25, 0, 100],
  lotteryHours: ["ai.lottery_hours", 24, 1, 168],
  dailyBudgetUsd: ["ai.daily_budget_usd", 1, 0, 100],
  monthlyBudgetUsd: ["ai.monthly_budget_usd", 10, 0, 100],
  visitorPerMinute: ["ai.visitor_per_minute", 3, 0, 100],
  visitorPerDay: ["ai.visitor_per_day", 20, 0, 1000],
  globalPerMinute: ["ai.global_per_minute", 20, 0, 1000],
  globalPerDay: ["ai.global_per_day", 200, 0, 10000],
  concurrency: ["ai.concurrency", 3, 0, 10],
  probePerMinute: ["ai.probe_per_minute", 1, 0, 10],
  probePerDay: ["ai.probe_per_day", 24, 0, 100],
  blockBots: ["ai.block_bots", true],
  blockSuspicious: ["ai.block_suspicious", true],
} as const;
export type KnowledgeSettings = {
  [K in keyof typeof definitions]: (typeof definitions)[K][1] extends boolean
    ? boolean
    : number;
};

/** Missing keys are conservative; malformed configured keys stop admission. */
export function parseKnowledgeSettings(
  rows: { key: string; value: unknown }[],
) {
  const values = new Map(rows.map((row) => [row.key, row.value]));
  const result: Record<string, number | boolean> = {};
  for (const [name, definition] of Object.entries(definitions)) {
    const [key, fallback] = definition;
    const value = values.has(key) ? values.get(key) : fallback;
    if (typeof fallback === "boolean") {
      if (typeof value !== "boolean") throw new Error("Invalid AI setting");
    } else {
      const [, , min, max] = definition as readonly [
        string,
        number,
        number,
        number,
      ];
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < min ||
        value > max ||
        (!name.endsWith("BudgetUsd") && !Number.isInteger(value))
      )
        throw new Error("Invalid AI setting");
    }
    result[name] = value as number | boolean;
  }
  return result as KnowledgeSettings;
}

export async function readKnowledgeSettings(
  sql: postgres.Sql | postgres.TransactionSql = knowledgeDatabase(),
  signal?: AbortSignal,
) {
  const rows = await sql<{ key: string; value: unknown }[]>`
    SELECT key,value FROM settings WHERE key LIKE 'ai.%'
  `.signal(signal);
  return parseKnowledgeSettings(rows);
}

/** Stable keyed cohorts prevent refreshing or new cookies from rerolling an IP. */
export function knowledgeLottery(
  visitor: string,
  secret: string,
  settings: KnowledgeSettings,
  now = Date.now(),
) {
  if (!secret) throw new Error("AI admission secret unavailable");
  const duration = settings.lotteryHours * 3600_000;
  const window = Math.floor(now / duration);
  const score =
    createHmac("sha256", secret)
      .update(`ai-lottery:${window}:${visitor}`)
      .digest()
      .readUInt32BE(0) / 0x1_0000_0000;
  return {
    allowed: settings.enabled && score * 100 < settings.rolloutPercent,
    retryAt: (window + 1) * duration,
  };
}

const AUTOMATION =
  /bot\b|crawler|spider|curl\b|wget\b|python|httpx|scrapy|headless|selenium|playwright|puppeteer|node\b|go-http-client|libwww|postman/i;
const EXTRACTION =
  /(?:ignore|disregard|forget).{0,35}(?:previous|prior|system|all).{0,25}instructions|(?:reveal|print|expose|give me|show me).{0,35}(?:api[ _-]?key|system prompt|secret key)|(?:ignoriere|vergiss).{0,35}(?:anweisungen|instruktionen)|<\/?(?:script|system|assistant)\b/i;
export function screenKnowledgeRequest(
  headers: Headers,
  message: string | undefined,
  settings: KnowledgeSettings,
): "bot" | "suspicious" | null {
  if (
    settings.blockBots &&
    (!headers.get("user-agent") ||
      AUTOMATION.test(headers.get("user-agent")!) ||
      headers.get("sec-fetch-site") === "cross-site")
  )
    return "bot";
  if (
    settings.blockSuspicious &&
    message &&
    (EXTRACTION.test(message) ||
      /(.)\1{39}/u.test(message) ||
      Array.from(message).some((character) => {
        const code = character.charCodeAt(0);
        return (code < 32 && ![9, 10, 13].includes(code)) || code === 127;
      }))
  )
    return "suspicious";
  return null;
}

export async function verifyKnowledgeAutomation(
  settings: KnowledgeSettings,
  production: boolean,
  check: () => Promise<{ isBot: boolean; isVerifiedBot: boolean }>,
  signal?: AbortSignal,
) {
  if (!production || !settings.blockBots) return true;
  let onAbort: (() => void) | undefined;
  try {
    signal?.throwIfAborted();
    const result = await Promise.race([
      check(),
      new Promise<never>((_, reject) => {
        onAbort = () =>
          reject(signal?.reason || new Error("AI admission cancelled"));
        signal?.addEventListener("abort", onAbort, { once: true });
      }),
    ]);
    signal?.throwIfAborted();
    return result.isBot === false && result.isVerifiedBot === false;
  } catch {
    return false;
  } finally {
    if (onAbort) signal?.removeEventListener("abort", onAbort);
  }
}

export type AdmissionReason =
  "selected" | "excluded" | "paused" | "bot" | "suspicious" | "quota";
export async function recordKnowledgeAdmission(reason: AdmissionReason) {
  const sql = knowledgeDatabase();
  await sql`
    INSERT INTO knowledge_admission_counts(hour,reason,count)
    VALUES(date_trunc('hour',now()),${reason},1)
    ON CONFLICT(hour,reason) DO UPDATE SET count=knowledge_admission_counts.count+1
  `.signal(AbortSignal.timeout(1000));
}

/** Run from the independent maintenance loop, even when paid AI is paused. */
export async function cleanupKnowledgeUsage() {
  const sql = knowledgeDatabase();
  await sql`DELETE FROM knowledge_usage WHERE created_at < now()-interval '35 days'`;
  await sql`DELETE FROM knowledge_admission_counts WHERE hour < now()-interval '35 days'`;
}

/** Daily cache pruning remains independent of paid AI and public-content refreshes. */
export async function cleanupKnowledgeCache() {
  const sql = knowledgeDatabase();
  await sql`DELETE FROM knowledge_query_cache WHERE expires_at<=now()`;
  await sql`DELETE FROM knowledge_response_cache WHERE expires_at<=now()`;
}
