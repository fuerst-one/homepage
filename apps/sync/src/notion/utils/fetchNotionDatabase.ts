import { safeNotionLogger } from "@homepage/database/notionDiagnostics";
import { Client, collectPaginatedAPI } from "@notionhq/client";
import { createNotionReadFetch } from "../createNotionFetch";

export const fetchNotionDatabase = async (databaseId: string) => {
  const notion = new Client({
    timeoutMs: 120_000,
    logger: safeNotionLogger,
    auth: process.env.NEXT_NOTION_TOKEN,
    fetch: createNotionReadFetch(),
  });

  const results = await collectPaginatedAPI(notion.databases.query, {
    database_id: databaseId,
  });

  return { results };
};
