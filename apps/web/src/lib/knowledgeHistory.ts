import type { KnowledgeAnswer } from "@homepage/content/knowledge";

export type KnowledgeTurn = { question: string; result: KnowledgeAnswer };
export const KNOWLEDGE_HISTORY_KEY = "fuerst-one:knowledge-chat:v1";
export const KNOWLEDGE_HISTORY_TTL = 2 * 60 * 60 * 1000;
type SavedHistory = { savedAt: number; turns: KnowledgeTurn[] };
const record = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));
const text = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= max;
const destination = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\/(en|de)\/(projects(?:\/[a-zA-Z0-9_-]+(?:\/case-study)?)?|contact|hire)$/.test(
    value,
  );

/** Browser storage is untrusted; restore only bounded text and known page actions. */
export function restoreKnowledgeHistory(
  raw: string | null,
  now = Date.now(),
): SavedHistory | null {
  if (!raw || raw.length > 200_000) return null;
  try {
    const saved: unknown = JSON.parse(raw);
    if (
      !record(saved) ||
      saved.version !== 1 ||
      typeof saved.savedAt !== "number" ||
      !Number.isFinite(saved.savedAt) ||
      saved.savedAt > now ||
      now - saved.savedAt >= KNOWLEDGE_HISTORY_TTL ||
      !Array.isArray(saved.turns) ||
      !saved.turns.length ||
      saved.turns.length > 5
    )
      return null;
    const turns: KnowledgeTurn[] = [];
    for (const turn of saved.turns) {
      if (!record(turn) || !text(turn.question, 1000) || !record(turn.result))
        return null;
      const result = turn.result;
      if (
        !text(result.answer, 5000) ||
        !Array.isArray(result.sources) ||
        result.sources.length > 6 ||
        !Array.isArray(result.actions) ||
        result.actions.length > 3
      )
        return null;
      const sources: KnowledgeAnswer["sources"] = [];
      for (const source of result.sources) {
        if (
          !record(source) ||
          !text(source.id, 100) ||
          !text(source.projectId, 100) ||
          !text(source.title, 500) ||
          !destination(source.href)
        )
          return null;
        sources.push({
          id: source.id,
          projectId: source.projectId,
          title: source.title,
          href: source.href,
        });
      }
      const actions: KnowledgeAnswer["actions"] = [];
      for (const action of result.actions) {
        if (
          !record(action) ||
          !text(action.label, 500) ||
          !text(action.target, 500)
        )
          return null;
        if (action.type === "navigate" && destination(action.target))
          actions.push({
            type: "navigate",
            target: action.target,
            label: action.label,
          });
        else if (
          action.type === "filter" &&
          sources.some((source) => source.projectId === action.target)
        )
          actions.push({
            type: "filter",
            target: action.target,
            label: action.label,
          });
        else if (
          action.type === "highlight" &&
          ["search", "projects", "contact"].includes(action.target)
        )
          actions.push({
            type: "highlight",
            target: action.target,
            label: action.label,
          });
        else return null;
      }
      turns.push({
        question: turn.question,
        result: { answer: result.answer, sources, actions },
      });
    }
    return { savedAt: saved.savedAt, turns };
  } catch {
    return null;
  }
}
