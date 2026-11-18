import type { Locale } from "@homepage/content/i18n";
import { parseKnowledgeConsent } from "./knowledgeConsent";
import type { KnowledgePurpose } from "./knowledgeConsent";

export type KnowledgeSource = {
  id: string;
  projectId: string;
  title: string;
  href: string;
  content: string;
  sourceKind?: "image";
  imageHref?: string;
};
export type KnowledgeAction = {
  type: "navigate" | "filter" | "highlight";
  target: string;
  label: string;
};
export type KnowledgeAnswer = {
  answer: string;
  sources: Omit<KnowledgeSource, "content">[];
  actions: KnowledgeAction[];
};

/** Constrain generation as well as validating the result after the provider responds. */
export const knowledgeResponseSchema = (
  sources: Pick<KnowledgeSource, "id" | "projectId">[],
) => ({
  type: "object",
  additionalProperties: false,
  required: ["answer", "sourceIds", "actions"],
  properties: {
    answer: { type: "string" },
    sourceIds: {
      type: "array",
      items: { type: "string", enum: sources.map((source) => source.id) },
    },
    actions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "target"],
        properties: {
          type: { type: "string", enum: ["filter", "navigate", "highlight"] },
          target: {
            type: "string",
            enum: [
              ...new Set([
                ...sources.map((source) => source.projectId),
                "projects",
                "contact",
                "hire",
                "search",
              ]),
            ],
          },
        },
      },
    },
  },
});
const record = (input: unknown): Record<string, unknown> | null =>
  input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : null;

export function parseKnowledgeRequest(
  input: unknown,
  purpose: KnowledgePurpose = "assistant",
) {
  const value = record(input);
  if (
    !value ||
    Object.keys(value).some(
      (key) => !["message", "locale", "consent"].includes(key),
    ) ||
    typeof value.message !== "string" ||
    !value.message.trim() ||
    value.message.length > 1000 ||
    !["en", "de"].includes(String(value.locale))
  )
    return null;
  const consent = parseKnowledgeConsent(value.consent, Date.now(), purpose);
  if (!consent) return null;
  return {
    message: value.message.trim(),
    locale: value.locale as Locale,
    consent,
  };
}

/** Word boundaries keep passages bounded, including unusually long tokens. */
export function chunkKnowledge(text: string): string[] {
  const chunks: string[] = [];
  let remaining = text.trim();
  while (remaining) {
    let end = Math.min(1800, remaining.length);
    if (end < remaining.length) {
      const boundary = remaining.lastIndexOf(" ", end);
      if (boundary > 900) end = boundary;
    }
    chunks.push(remaining.slice(0, end).trim());
    remaining = remaining.slice(end).trim();
  }
  return chunks;
}

/** URLs, selectors and executable code are never accepted from the model. */
export function validateKnowledgeAnswer(
  input: unknown,
  retrieved: KnowledgeSource[],
  locale: Locale,
): KnowledgeAnswer | null {
  const value = record(input);
  if (
    !value ||
    typeof value.answer !== "string" ||
    !value.answer.trim() ||
    value.answer.length > 5000 ||
    !Array.isArray(value.sourceIds)
  )
    return null;
  const ids = new Set(
    value.sourceIds.filter((id): id is string => typeof id === "string"),
  );
  const sources = retrieved.filter((source) => ids.has(source.id));
  if (!sources.length) return null;
  const projects = new Map(sources.map((source) => [source.projectId, source]));
  const actions: KnowledgeAction[] = [];
  for (const raw of Array.isArray(value.actions)
    ? value.actions.slice(0, 12)
    : []) {
    if (actions.length === 3) break;
    const action = record(raw);
    if (!action || typeof action.target !== "string") continue;
    const project = projects.get(action.target);
    if (action.type === "filter" && project) {
      actions.push({
        type: "filter",
        target: project.projectId,
        label: project.title,
      });
    } else if (action.type === "navigate") {
      if (project)
        actions.push({
          type: "navigate",
          target: project.href,
          label: project.title,
        });
      else if (["projects", "contact", "hire"].includes(action.target)) {
        const labels: Record<string, [string, string]> = {
          projects: ["Explore projects", "Projekte entdecken"],
          contact: ["Get in touch", "Kontakt aufnehmen"],
          hire: ["Work with me", "Zusammenarbeiten"],
        };
        actions.push({
          type: "navigate",
          target: `/${locale}/${action.target}`,
          label: labels[action.target][locale === "de" ? 1 : 0],
        });
      }
    } else if (
      action.type === "highlight" &&
      ["search", "projects", "contact"].includes(action.target)
    ) {
      const labels: Record<string, [string, string]> = {
        search: ["Highlight search", "Suche hervorheben"],
        projects: ["Highlight projects", "Projekte hervorheben"],
        contact: ["Highlight contact", "Kontakt hervorheben"],
      };
      actions.push({
        type: "highlight",
        target: action.target,
        label: labels[action.target][locale === "de" ? 1 : 0],
      });
    }
  }
  return {
    answer: value.answer.trim(),
    sources: [
      ...new Map(
        sources.map(({ id, projectId, title, href, sourceKind, imageHref }) => [
          id,
          {
            id,
            projectId,
            title,
            href,
            ...(sourceKind === "image" ? { sourceKind, imageHref } : {}),
          },
        ]),
      ).values(),
    ],
    actions,
  };
}
