import { unstable_cache } from "next/cache";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { fetchNotionDatabase } from "./utils/fetchNotionDatabase";
import type { Locale } from "@/lib/i18n";
import source from "@/data/notion-site-copy.json";

const getCopySource = unstable_cache(
  async () => {
    const databaseId =
      process.env.NEXT_NOTION_SITE_COPY_DB_ID || source.databaseId;
    if (!databaseId)
      throw new Error("Set up the Notion Site Copy database before building");
    const { results } = await fetchNotionDatabase(databaseId);
    return (results as PageObjectResponse[]).map((page) => {
      const text = (key: string) => {
        const property = page.properties[key];
        if (property?.type === "title")
          return property.title.map((part) => part.plain_text).join("");
        if (property?.type === "rich_text")
          return property.rich_text.map((part) => part.plain_text).join("");
        return "";
      };
      return { key: text("Key"), en: text("English"), de: text("German") };
    });
  },
  ["site-copy-v1"],
  { tags: ["site-copy"], revalidate: 3600 },
);

export async function getSiteCopy(
  locale: Locale,
): Promise<Record<string, string>> {
  return Object.fromEntries(
    (await getCopySource()).map((row) => [row.key, row[locale] || row.en]),
  );
}
