import { unstable_cache } from "next/cache";
import { flattenRichText } from "@/app/cv.pdf/flattenRichText";
import type { Locale } from "@/lib/i18n";
import type { EnquiryEvidence } from "@/lib/enquiryEvidence";
import { readPublicProjectCase } from "@/lib/projectCase";
import { projectPath } from "@/lib/seo";
import {
  CV_PROJECTS_CACHE_TAG,
  getCachedCvProjects,
} from "./getCachedCvProjects";
import { fetchNotionDatabase } from "./utils/fetchNotionDatabase";

export const getPublicProjectCases = unstable_cache(
  async () => {
    const databaseId = process.env.NEXT_NOTION_PROJECT_DB_ID;
    if (!databaseId) throw new Error("Project database unconfigured");
    const { results } = await fetchNotionDatabase(databaseId);
    return results.flatMap((page) => {
      const caseStudy = readPublicProjectCase(page);
      return caseStudy ? [{ id: page.id, caseStudy }] : [];
    });
  },
  ["enquiry-public-cases-v1"],
  { tags: [CV_PROJECTS_CACHE_TAG], revalidate: 3600 },
);

/** Join public cases only, and project an explicit DTO before crossing into the browser. */
export async function getEnquiryEvidence(
  locale: Locale,
): Promise<EnquiryEvidence[]> {
  try {
    const [projects, cases] = await Promise.all([
      getCachedCvProjects(locale),
      getPublicProjectCases(),
    ]);
    const byId = new Map(cases.map((value) => [value.id, value.caseStudy]));
    return projects.flatMap((project) => {
      const caseStudy = byId.get(project.id);
      if (!caseStudy) return [];
      // Case Context is currently English. Keep its language explicit on German pages.
      const summary =
        caseStudy.summary || flattenRichText(project.description).slice(0, 600);
      return [
        {
          id: project.id,
          name: project.name,
          href: projectPath(project, locale),
          summary,
          summaryLocale: caseStudy.summary
            ? "en"
            : (project.contentLocale ?? "en"),
          caseStudy: { ...caseStudy, summary: "" },
        },
      ];
    });
  } catch {
    // Optional evidence must not stop someone from sending a brief. Do not cache an empty source.
    console.error("Enquiry project evidence unavailable");
    return [];
  }
}
