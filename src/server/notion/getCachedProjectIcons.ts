import { unstable_cache } from "next/cache";
import { Client, collectPaginatedAPI } from "@notionhq/client";
import { createNotionFetch } from "./createNotionFetch";
import { readProjectIcons } from "./projectIcons";

// Icon edits refresh independently of the static CV and its merged relation data.
export const getCachedProjectIcons = unstable_cache(
  async () => {
    const databaseId = process.env.NEXT_NOTION_PROJECT_DB_ID;
    if (!databaseId) throw new Error("Missing Notion project database ID");
    const notion = new Client({
      auth: process.env.NEXT_NOTION_TOKEN,
      fetch: createNotionFetch((url, options) =>
        fetch(url, { ...options, cache: "no-store" }),
      ),
    });
    const pages = await collectPaginatedAPI(notion.databases.query, {
      database_id: databaseId,
      filter_properties: ["3D Icon"],
    });
    return readProjectIcons(pages);
  },
  ["project-icons"],
  { tags: ["project-icons"], revalidate: 300 },
);
