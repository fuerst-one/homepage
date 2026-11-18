import type { Locale } from "@homepage/content/i18n";
import { knowledgeDatabase } from "./database";
export type PublicImageDescription = {
  href: string;
  description: string;
  altText: string;
  language: "en";
};
/** Captions are public text only while their exact image version remains published. */
export async function readPublicImageDescriptions(
  projectId: string,
  locale: Locale,
  sql = knowledgeDatabase(),
): Promise<PublicImageDescription[]> {
  const rows =
    await sql`SELECT href,description,alt_text FROM public_image_descriptions WHERE project_id=${projectId} AND locale=${locale} ORDER BY href`;
  return rows.map((row) => ({
    href: row.href as string,
    description: row.description as string,
    altText: (row.alt_text as string | null) ?? "",
    language: "en",
  }));
}
