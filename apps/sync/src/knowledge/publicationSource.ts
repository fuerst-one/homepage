import { createHash } from "node:crypto";
import { knowledgeDatabase } from "@homepage/database/database";

import {
  PUBLICATION_KEY,
  type PublicPublication,
  type CaseStudyBlock,
} from "@homepage/content/models";
import type { Locale } from "@homepage/content/i18n";
import slugs from "@homepage/content/data/project-slugs.json";
export type KnowledgeDocument = {
  id: string;
  projectId: string;
  title: string;
  locale: Locale;
  href: string;
  text: string;
  hash: string;
};
const blockText = (blocks: CaseStudyBlock[]): string =>
  blocks
    .map((b) =>
      [
        b.richText.map((p) => p.plain_text).join(""),
        b.caption.map((p) => p.plain_text).join(""),
        blockText(b.children),
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");

/** Index exactly the public publication. This never calls the editorial source. */
export async function readPublishedKnowledge(sql = knowledgeDatabase()) {
  const [row] =
    await sql`SELECT payload,refreshed_at::text AS revision FROM public_content WHERE key=${PUBLICATION_KEY} AND payload->>'version'='3'`;
  if (!row) throw new Error("Public content unavailable; seed before indexing");
  const publication = row.payload as PublicPublication;
  return {
    documents: publishedKnowledgeDocuments(publication),
    revision: row.revision as string,
  };
}

/** One deterministic projection for indexing and immediate withdrawal of outdated evidence. */
export function publishedKnowledgeDocuments(
  publication: PublicPublication,
): KnowledgeDocument[] {
  const documents: KnowledgeDocument[] = [];
  for (const locale of ["en", "de"] as const) {
    const { projects, studies } = publication.locales[locale] ?? {
      projects: [],
      studies: {},
    };
    for (const p of projects) {
      if (!p.availableLocales?.includes(locale)) continue;
      const description = p.description.rich_text
        .map((t) => t.plain_text)
        .join("");
      if (!description.trim()) continue;
      const profile = p.matching;
      const body = p.caseStudyIds[locale]
        ? blockText(studies[p.caseStudyIds[locale]!] ?? [])
        : "";
      const text =
        [
          p.name,
          description,
          locale === "en" ? profile?.summary : "",
          ...p.tools,
          ...p.capabilities,
          ...(p.methods ?? []),
          ...p.industries,
          ...p.languages,
          ...(p.productTypes ?? []),
          ...(p.targetMarket ?? []),
          ...(p.usageContext ?? []),
          p.deliveryModel,
          p.projectType,
          p.workplace,
          ...p.clients.map((client) => client.name),
          ...(profile?.buyerNeeds ?? []),
          ...(profile?.domains ?? []),
          ...(profile?.aiCapabilities ?? []),
          ...(profile?.aiUsage ?? []),
          ...(profile?.stages ?? []),
          profile?.ownership,
          profile?.maintenance,
        ]
          .filter(Boolean)
          .join("\n\n") + (body ? `\n\n${body}` : "");
      const slug = (slugs as Record<string, string>)[p.id] ?? p.id;
      const doc = {
        id: `${p.id}:${locale}`,
        projectId: p.id,
        title: p.name,
        locale,
        href: `/${locale}/projects/${slug}${p.caseStudyIds[locale] ? "/case-study" : ""}`,
        text,
      };
      documents.push({
        ...doc,
        hash: createHash("sha256").update(JSON.stringify(doc)).digest("hex"),
      });
    }
  }
  return documents;
}
