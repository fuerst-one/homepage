"use server";

import { safeNotionLogger } from "../notionDiagnostics";
import { isDev } from "@/utils/env";
import { Client, collectPaginatedAPI } from "@notionhq/client";
import { createNotionReadFetch } from "../createNotionFetch";

export const fetchNotionDatabase = async (
  databaseId: string,
  uncached = false,
) => {
  const notion = new Client({
    timeoutMs: 120_000,
    logger: safeNotionLogger,
    auth: process.env.NEXT_NOTION_TOKEN,
    fetch: createNotionReadFetch((url, options) =>
      fetch(url, {
        ...options,
        ...(uncached
          ? { cache: "no-store" as const }
          : { next: { revalidate: isDev() ? 600 : 3600 } }),
      }),
    ),
  });

  const results = await collectPaginatedAPI(notion.databases.query, {
    database_id: databaseId,
  });

  return { results };
};
