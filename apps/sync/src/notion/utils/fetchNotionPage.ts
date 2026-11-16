import { safeNotionLogger } from "@homepage/database/notionDiagnostics";
import { Client } from "@notionhq/client";
import { createNotionReadFetch } from "../createNotionFetch";

export const fetchNotionPage = async (pageId: string) => {
  const notion = new Client({
    timeoutMs: 120_000,
    logger: safeNotionLogger,
    auth: process.env.NEXT_NOTION_TOKEN,
    fetch: createNotionReadFetch(),
  });

  const page = await notion.pages.retrieve({
    page_id: pageId,
  });

  return page;
};
