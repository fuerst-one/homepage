import { Client } from "@notionhq/client";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import type { Locale } from "@/lib/i18n";
import { caseStudyPageId } from "@/lib/projectCaseStudy";
import { hasGermanTranslation } from "@/lib/localizeContent";
import { projectPath, projectSlug } from "@/lib/seo";
import { getCachedCvProjects } from "./getCachedCvProjects";
import { createNotionFetch } from "./createNotionFetch";
import { loadCaseStudyBlocks } from "./caseStudyBlocks";

const readBlocks = async (pageId: string) => {
  const notion = new Client({
    auth: process.env.NEXT_NOTION_TOKEN,
    fetch: createNotionFetch((url, options) =>
      fetch(url, { ...options, cache: "no-store" }),
    ),
  });
  return loadCaseStudyBlocks(
    async (id, cursor) =>
      notion.blocks.children.list({
        block_id: id,
        start_cursor: cursor,
        page_size: 100,
      }),
    pageId,
  );
};

const readCachedBlocks = unstable_cache(
  readBlocks,
  ["project-case-study-blocks-v1"],
  { revalidate: 3000 },
);

/** Always resolve through a visible project and its explicitly linked case study. */
export const getProjectCaseStudy = cache(
  async (reference: string, locale: Locale, refreshImages = false) => {
    const projects = await getCachedCvProjects(locale);
    const project = projects.find(
      (item) => item.id === reference || projectSlug(item) === reference,
    );
    if (!project || (locale === "de" && !hasGermanTranslation(project)))
      return null;
    const pageId = caseStudyPageId(project, locale);
    if (!pageId) return null;
    const availableLocales = (["en", "de"] as const).filter(
      (lang) =>
        caseStudyPageId(project, lang) &&
        (lang === "en" || hasGermanTranslation(project)),
    );
    return {
      project,
      pageId,
      availableLocales,
      projectLinks: Object.fromEntries(
        projects.map((item) => [item.id, projectPath(item, locale)]),
      ),
      blocks: await (refreshImages
        ? readBlocks(pageId)
        : readCachedBlocks(pageId)),
    };
  },
);
