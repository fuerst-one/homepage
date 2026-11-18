import { createHmac } from "node:crypto";
import type postgres from "postgres";
import type { Locale } from "@homepage/content/i18n";

export const normalizeQuery = (message: string) =>
  message.trim().replace(/\s+/gu, " ");

export function queryCacheKey(message: string, model: string, secret: string) {
  if (!secret) throw new Error("Query cache secret unavailable");
  return createHmac("sha256", secret)
    .update(JSON.stringify(["query-v1", model, 1536, normalizeQuery(message)]))
    .digest("hex");
}

export type PublicProject = { projectId: string; title: string };
type PublicIntent = { signature: string; question: string; projectId?: string };

const questionText = (text: string) =>
  normalizeQuery(text).normalize("NFC").toLowerCase();

/** Fully parsed public questions only. Never remove an unknown qualifier to obtain a hit. */
export function publicQuestionIntent(
  message: string,
  locale: Locale,
  projects: PublicProject[] = [],
): PublicIntent | null {
  if (locale !== "en" && locale !== "de") return null;
  const original = questionText(message);
  if (/[?.!]{2}$/u.test(original)) return null;
  const text = original.replace(/[?.!]$/u, "");
  const intent = (
    kind: string,
    topic: string,
    question: string,
  ): PublicIntent => ({
    signature: JSON.stringify(["public-intent-v2", locale, kind, topic]),
    question,
  });

  const overviewPatterns =
    locale === "en"
      ? [/^(?:tell me about|what is) (.+)$/u]
      : [
          /^(?:was ist|erzähl(?:e)? mir (?:etwas )?(?:von|über)) (.+)$/u,
          /^kannst du mir (?:etwas )?über (.+) erzählen$/u,
        ];
  // A terminal ? may be sentence punctuation or part of a published name.
  // Consider both readings and reject ambiguity instead of picking the first.
  const names = new Set(
    [original, text].flatMap((value) =>
      overviewPatterns.flatMap((pattern) => {
        const match = pattern.exec(value);
        return match ? [match[1]] : [];
      }),
    ),
  );
  if (names.size) {
    const matches = projects.filter((project) =>
      names.has(questionText(project.title)),
    );
    const ids = new Set(matches.map((project) => project.projectId));
    if (ids.size !== 1) return null;
    const [projectId] = ids;
    // Stable across localized aliases and database row order.
    const title = projects
      .filter(
        (project) =>
          project.projectId === projectId &&
          !projects.some(
            (other) =>
              other.projectId !== projectId &&
              questionText(other.title) === questionText(project.title),
          ),
      )
      .map((project) => project.title)
      .sort()[0];
    if (!title) return null;
    return {
      ...intent(
        "project",
        projectId,
        locale === "en"
          ? `Give a brief overview of the published project ${JSON.stringify(title)}.`
          : `Gib einen kurzen Überblick über das veröffentlichte Projekt ${JSON.stringify(title)}.`,
      ),
      projectId,
    };
  }

  const allPatterns =
    locale === "en"
      ? [/^(?:please )?(?:show|find|list)(?: me)? projects$/u]
      : [
          /^(?:bitte )?(?:zeig|zeige|finde|suche)(?: mir)? projekte$/u,
          /^(?:bitte )?liste(?: mir)? projekte auf$/u,
          /^welche projekte gibt es$/u,
        ];
  if (allPatterns.some((pattern) => pattern.test(text)))
    return intent(
      "projects",
      "all",
      locale === "en"
        ? "Show me published projects."
        : "Zeige mir veröffentlichte Projekte.",
    );

  const topicPatterns =
    locale === "en"
      ? [
          /^(?:please )?(?:show|find|list)(?: me)? (.+) projects$/u,
          /^(?:which|what) (.+) projects$/u,
        ]
      : [
          /^(?:bitte )?(?:zeig|zeige|finde|suche)(?: mir)? (.+)(?:-| )projekte$/u,
          /^(?:bitte )?liste(?: mir)? (.+)(?:-| )projekte auf$/u,
          /^welche (.+)(?:-| )projekte(?: gibt es)?$/u,
        ];
  const usagePatterns =
    locale === "en"
      ? [
          /^(?:(?:please )?(?:show|find|list)(?: me)? )?projects (?:with|using) (.+)$/u,
          /^(?:which|what) projects use (.+)$/u,
        ]
      : [
          /^(?:(?:bitte )?(?:zeig|zeige|finde|suche)(?: mir)? )?projekte mit (.+)$/u,
          /^(?:bitte )?liste(?: mir)? projekte mit (.+) auf$/u,
          /^welche projekte (?:nutzen|verwenden) (.+)$/u,
          /^welche projekte setzen (.+) ein$/u,
        ];
  for (const [kind, patterns] of [
    ["topic", topicPatterns],
    ["usage", usagePatterns],
  ] as const) {
    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (!match) continue;
      const topic = match[1];
      if (!PUBLIC_TOPICS.has(topic)) return null;
      return intent(
        kind,
        topic,
        locale === "en"
          ? kind === "usage"
            ? `Show me projects using ${topic}.`
            : `Show me ${topic} projects.`
          : kind === "usage"
            ? `Zeige mir Projekte mit ${topic}.`
            : `Zeige mir ${topic}-Projekte.`,
      );
    }
  }
  return null;
}

const PUBLIC_TOPICS = new Set([
  "react",
  "react native",
  "vue",
  "angular",
  "next.js",
  "nextjs",
  "typescript",
  "javascript",
  "php",
  "laravel",
  "python",
  "node.js",
  "nodejs",
  "ai",
  "ki",
  "llm",
  "automation",
  "automatisierung",
  "e-commerce",
  "ecommerce",
  "saas",
  "api",
  "apis",
  "mobile",
  "web",
  "frontend",
  "backend",
  "hardware",
  "embedded",
  "iot",
  "open source",
  "b2b",
  "b2c",
  "healthcare",
  "travel",
  "tourism",
  "logistics",
  "automotive",
  "education",
  "games",
  "gaming",
  "design",
  "ux",
  "ui",
]);

type EmbeddingResult = { vectors: number[][]; costUsd?: number };

/** Transaction locks coalesce misses across processes; one caller never cancels another's work. */
export async function cachedQueryEmbedding(
  sql: postgres.Sql,
  input: {
    message: string;
    rawMessage?: string;
    model: string;
    secret: string;
  },
  embed: (messages: string[], signal?: AbortSignal) => Promise<EmbeddingResult>,
  signal?: AbortSignal,
): Promise<{ vector: number[]; costUsd?: number; hit: boolean }> {
  signal?.throwIfAborted();
  const key = queryCacheKey(input.message, input.model, input.secret);
  let started = false;
  let produced:
    { vector: number[]; costUsd?: number; hit: boolean } | undefined;
  const produce = async () => {
    started = true;
    const {
      vectors: [vector],
      costUsd,
    } = await embed([normalizeQuery(input.message)], signal);
    signal?.throwIfAborted();
    if (!vector || vector.length !== 1536 || !vector.every(Number.isFinite))
      throw new Error("Invalid cached query vector");
    return (produced = { vector, costUsd, hit: false });
  };
  try {
    return await sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${key},816163))`.signal(
        signal,
      );
      const [cached] =
        await tx`SELECT embedding::text AS vector FROM knowledge_query_cache WHERE key=${key} AND request_text IS NOT NULL AND expires_at>now()`.signal(
          signal,
        );
      if (cached)
        return {
          vector: JSON.parse(cached.vector) as number[],
          costUsd: 0,
          hit: true,
        };
      const result = await produce();
      await tx`INSERT INTO knowledge_query_cache(key,embedding,request_text,created_at,expires_at) VALUES(${key},${JSON.stringify(result.vector)}::vector,${input.rawMessage ?? input.message},now(),now()+interval '1 year') ON CONFLICT(key) DO UPDATE SET embedding=excluded.embedding,request_text=excluded.request_text,created_at=excluded.created_at,expires_at=excluded.expires_at`.signal(
        signal,
      );
      return result;
    });
  } catch (error) {
    signal?.throwIfAborted();
    // A storage failure must neither discard paid work nor retry a failed provider.
    if (produced) return produced;
    if (started) throw error;
    return produce();
  }
}
