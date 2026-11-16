"use server";

import { isDev } from "@/utils/env";
import { Client, collectPaginatedAPI } from "@notionhq/client";
import { createNotionFetch } from "../createNotionFetch";

export const fetchNotionDatabase = async (
  databaseId: string,
  uncached = false,
) => {
  const notion = new Client({
    auth: process.env.NEXT_NOTION_TOKEN,
    fetch: createNotionFetch((url, options) =>
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
