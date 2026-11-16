import { knowledgeDatabase } from "../knowledge/database";
import type { CvOwner } from "./getCvOwner";
import type { CvProject } from "./getCvProjects";
import type { CaseStudyBlock } from "./caseStudyBlocks";
import type { ProjectCase } from "../../lib/projectCase";

export const WEBSITE_CONTENT_KEY = "website-v1";
export type WebsiteContent = {
  projects: CvProject[];
  owner: CvOwner;
  icons: Record<string, string | null>;
  cases: { id: string; caseStudy: ProjectCase }[];
  copy: { key: string; en: string; de: string }[];
  studies: Record<string, CaseStudyBlock[]>;
  assets: Record<string, string>;
};

/** A database publication is the only source used by website renders and APIs. */
export async function readWebsiteSection<K extends keyof WebsiteContent>(
  section: K,
  sql = knowledgeDatabase(),
): Promise<WebsiteContent[K]> {
  const [row] =
    await sql`SELECT payload->${section}::text AS value FROM notion_snapshots WHERE key=${WEBSITE_CONTENT_KEY}`;
  if (row?.value === null || row?.value === undefined)
    throw new Error("Website content unavailable; run the initial worker sync");
  return row.value as WebsiteContent[K];
}

/** Related sections must come from the same SQL statement/publication. */
export async function readWebsiteSections<K extends keyof WebsiteContent>(
  sections: K[],
  sql = knowledgeDatabase(),
): Promise<Pick<WebsiteContent, K>> {
  const [row] =
    await sql`SELECT jsonb_object_agg(entry.key,entry.value) AS value FROM notion_snapshots s,
    LATERAL jsonb_each(s.payload) entry WHERE s.key=${WEBSITE_CONTENT_KEY} AND entry.key=ANY(${sections}::text[])`;
  if (
    !row?.value ||
    sections.some((section) => row.value[section] === undefined)
  )
    throw new Error("Website content unavailable; run the initial worker sync");
  return row.value as Pick<WebsiteContent, K>;
}

export const propertyAssetKey = (
  pageId: string,
  property: string,
  index: number,
) => `property:${pageId}:${property}:${index}`;
export const caseAssetKey = (pageId: string, blockId: string) =>
  `case:${pageId}:${blockId}`;

export async function readWebsiteAsset(key: string, sql = knowledgeDatabase()) {
  const [row] = await sql`SELECT a.content,a.content_type FROM notion_assets a
    JOIN notion_snapshots s ON s.key=${WEBSITE_CONTENT_KEY} AND s.payload->'assets'->>${key}=a.key`;
  return row
    ? {
        content: row.content as Buffer,
        contentType: row.content_type as string,
      }
    : null;
}
