import { safeNotionLogger } from "../notion/notionDiagnostics";
import { Client } from "@notionhq/client";
import { createHash } from "node:crypto";
import { caseStudyPageId } from "../../lib/projectCaseStudy";
import {
  loadCaseStudyBlocks,
  type CaseStudyBlock,
} from "../notion/caseStudyBlocks";
import { createNotionReadFetch } from "../notion/createNotionFetch";
import { publicKnowledgeSeeds, type KnowledgeSeed } from "./publicContent";
import slugs from "../../data/project-slugs.json";

export type KnowledgeDocument = KnowledgeSeed & { hash: string };
const blockText = (blocks: CaseStudyBlock[]): string =>
  blocks
    .map((block) =>
      [
        block.richText.map((t) => t.plain_text).join(""),
        block.caption.map((t) => t.plain_text).join(""),
        blockText(block.children),
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");

/** Never follow arbitrary URLs, relations, child pages or synced blocks. */
export async function readNotionKnowledge(
  previous: Map<string, KnowledgeDocument> = new Map(),
) {
  const auth = process.env.NEXT_NOTION_TOKEN,
    database_id = process.env.NEXT_NOTION_PROJECT_DB_ID;
  if (!auth || !database_id)
    throw new Error("Notion knowledge source unconfigured");
  const notion = new Client({
    timeoutMs: 120_000,
    logger: safeNotionLogger,
    auth,
    fetch: createNotionReadFetch(),
  });
  const pages = [];
  let cursor: string | undefined;
  do {
    const response = await notion.databases.query({
      database_id,
      page_size: 100,
      start_cursor: cursor,
    });
    pages.push(...response.results);
    if (pages.length > 500) throw new Error("Knowledge project limit exceeded");
    cursor = response.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
  } while (cursor);
  const documents: KnowledgeDocument[] = [];
  for (const page of pages) {
    const slug = (slugs as Record<string, string>)[page.id] || page.id;
    for (const seed of publicKnowledgeSeeds(page, slug)) {
      let caseVersion = "",
        body = "";
      if (seed.caseStudyId) {
        const casePage = await notion.pages.retrieve({
          page_id: seed.caseStudyId,
        });
        if (
          !("last_edited_time" in casePage) ||
          casePage.archived ||
          casePage.in_trash
        ) {
          // An archived linked page loses its case-study text and link immediately on the next sync.
          seed.caseStudyId = null;
        } else caseVersion = casePage.last_edited_time;
      }
      const hash = createHash("sha256")
        .update(JSON.stringify([seed, caseVersion]))
        .digest("hex");
      if (previous.get(seed.id)?.hash === hash) {
        documents.push(previous.get(seed.id)!);
        continue;
      }
      if (
        seed.caseStudyId &&
        caseStudyPageId(
          { caseStudyEn: `https://notion.so/${seed.caseStudyId}` },
          "en",
        )
      ) {
        body = blockText(
          await loadCaseStudyBlocks(
            async (id, start_cursor) =>
              notion.blocks.children.list({
                block_id: id,
                start_cursor,
                page_size: 100,
              }),
            seed.caseStudyId,
          ),
        );
      }
      const text = `${seed.text}\n\n${body}`.trim();
      if (text.length > 100_000)
        throw new Error("Knowledge document size limit exceeded");
      documents.push({
        ...seed,
        href: seed.href + (seed.caseStudyId ? "/case-study" : ""),
        text,
        hash,
      });
    }
  }
  return documents;
}
