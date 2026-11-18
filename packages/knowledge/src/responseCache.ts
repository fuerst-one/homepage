import type postgres from "postgres";
import type { Locale } from "@homepage/content/i18n";
import {
  validateKnowledgeAnswer,
  type KnowledgeSource,
} from "@homepage/content/knowledge";

type CachedRequest = {
  key: string;
  guard: string;
  scope: string;
  vector?: number[];
  locale: Locale;
  requestText: string;
};
type GeneratedAnswer = {
  raw: unknown;
  sources: KnowledgeSource[];
  costUsd?: number;
};
export type KnowledgeCacheSql = postgres.Sql | postgres.TransactionSql;

// Measured wrapper paraphrases score ~0.77–0.90. The exact parsed intent guard,
// not a broad cosine threshold, protects entities, relationships and negation.
const MIN_RESPONSE_SIMILARITY = 0.75;

function validated(row: Record<string, unknown> | undefined, locale: Locale) {
  if (
    !row ||
    !Array.isArray(row.evidence) ||
    !row.evidence.length ||
    row.evidence.length > 6
  )
    return null;
  const sources = row.evidence as KnowledgeSource[];
  if (
    !sources.every(
      (s) =>
        s &&
        [s.id, s.projectId, s.title, s.href, s.content].every(
          (v) => typeof v === "string",
        ) &&
        /^\/(en|de)\/projects\//u.test(s.href),
    )
  )
    return null;
  return validateKnowledgeAnswer(row.response, sources, locale);
}

export async function findExactCachedAnswer(
  sql: KnowledgeCacheSql,
  input: CachedRequest,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  try {
    const [row] =
      await sql`SELECT response,evidence FROM knowledge_response_cache WHERE scope=${input.scope} AND key=${input.key} AND guard=${input.guard} AND request_text IS NOT NULL AND expires_at>now()`.signal(
        signal,
      );
    return validated(row, input.locale);
  } catch {
    signal?.throwIfAborted();
    return null;
  }
}

/** Guard equality is required in addition to similarity: negations/entities cannot disappear. */
export async function resolveCachedAnswer(
  sql: postgres.Sql,
  input: CachedRequest & { vector: number[] },
  generate: (database: KnowledgeCacheSql) => Promise<GeneratedAnswer>,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  let started = false;
  let produced:
    | {
        answer: ReturnType<typeof validateKnowledgeAnswer>;
        costUsd?: number;
        hit: null;
      }
    | undefined;
  const produce = async (database: KnowledgeCacheSql) => {
    started = true;
    const generated = await generate(database);
    signal?.throwIfAborted();
    const answer = validateKnowledgeAnswer(
      generated.raw,
      generated.sources,
      input.locale,
    );
    produced = { answer, costUsd: generated.costUsd, hit: null };
    return { generated, result: produced };
  };
  try {
    return await sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${`${input.scope}:${input.guard}`},816164))`.signal(
        signal,
      );
      const exact = await findExactCachedAnswer(tx, input, signal);
      if (exact) return { answer: exact, costUsd: 0, hit: "exact" as const };
      const [similar] =
        await tx`SELECT response,evidence FROM knowledge_response_cache WHERE scope=${input.scope} AND guard=${input.guard} AND request_text IS NOT NULL AND expires_at>now() AND 1-(embedding <=> ${JSON.stringify(input.vector)}::vector)>=${MIN_RESPONSE_SIMILARITY} ORDER BY embedding <=> ${JSON.stringify(input.vector)}::vector LIMIT 1`.signal(
          signal,
        );
      const answer = validated(similar, input.locale);
      if (answer) return { answer, costUsd: 0, hit: "semantic" as const };
      const { generated, result } = await produce(tx);
      if (result.answer) {
        await tx`INSERT INTO knowledge_response_cache(scope,key,guard,embedding,response,evidence,request_text,created_at,expires_at) VALUES(${input.scope},${input.key},${input.guard},${JSON.stringify(input.vector)}::vector,${tx.json(generated.raw as postgres.JSONValue)},${tx.json(generated.sources)},${input.requestText},now(),now()+interval '1 year') ON CONFLICT(scope,key) DO UPDATE SET guard=excluded.guard,embedding=excluded.embedding,response=excluded.response,evidence=excluded.evidence,request_text=excluded.request_text,created_at=excluded.created_at,expires_at=excluded.expires_at`.signal(
          signal,
        );
      }
      return result;
    });
  } catch (error) {
    signal?.throwIfAborted();
    if (produced) return produced;
    if (started) throw error;
    return (await produce(sql)).result;
  }
}
