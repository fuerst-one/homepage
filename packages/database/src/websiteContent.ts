import { localizePublicIdentity } from "@homepage/content/publicIdentity";
import { knowledgeDatabase } from "./database";
import { PUBLICATION_KEY, type WebsiteContent } from "@homepage/content/models";
import type { Locale } from "@homepage/content/i18n";
export { propertyAssetKey, caseAssetKey } from "@homepage/content/models";
export type { WebsiteContent } from "@homepage/content/models";
export const WEBSITE_CONTENT_KEY = PUBLICATION_KEY;

/** Prepared public data only. A failed or absent publication never triggers source IO. */
export async function readWebsiteSection<K extends keyof WebsiteContent>(
  section: K,
  sql = knowledgeDatabase(),
  locale: Locale = "en",
): Promise<WebsiteContent[K]> {
  const [row] =
    await sql`SELECT payload->'locales'->${locale}::text->${section}::text AS value FROM public_content WHERE key=${PUBLICATION_KEY} AND payload->>'version'='3'`;
  if (row?.value === null || row?.value === undefined)
    throw new Error("Website content unavailable; run the initial worker sync");
  return localizePublicIdentity(row.value as WebsiteContent[K], locale);
}

/** Related sections are selected from one publication in one SQL statement. */
export async function readWebsiteSections<K extends keyof WebsiteContent>(
  sections: K[],
  sql = knowledgeDatabase(),
  locale: Locale = "en",
): Promise<Pick<WebsiteContent, K>> {
  const [row] =
    await sql`SELECT jsonb_object_agg(entry.key,entry.value) AS value FROM public_content s, LATERAL jsonb_each(s.payload->'locales'->${locale}::text) entry WHERE s.key=${PUBLICATION_KEY} AND s.payload->>'version'='3' AND entry.key=ANY(${sections}::text[])`;
  if (
    !row?.value ||
    sections.some((section) => row.value[section] === undefined)
  )
    throw new Error("Website content unavailable; run the initial worker sync");
  return localizePublicIdentity(row.value as Pick<WebsiteContent, K>, locale);
}
export async function readWebsiteAsset(key: string, sql = knowledgeDatabase()) {
  const [row] =
    await sql`SELECT a.content,a.content_type FROM public_content_assets a JOIN public_content s ON s.key=${PUBLICATION_KEY} AND s.payload->'assets'->>${key}=a.key`;
  return row
    ? {
        content: row.content as Buffer,
        contentType: row.content_type as string,
      }
    : null;
}
