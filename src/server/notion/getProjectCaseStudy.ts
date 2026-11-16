import "server-only";
import { cache } from "react";
import type { Locale } from "@/lib/i18n";
import { caseStudyPageId } from "@/lib/projectCaseStudy";
import { hasGermanTranslation } from "@/lib/localizeContent";
import { projectPath, projectSlug } from "@/lib/seo";
import { localizeProject } from "@/lib/localizeContent";
import { readWebsiteSections } from "./websiteContent";

/** Always resolve through a visible project and its explicitly linked case study. */
export const getProjectCaseStudy = cache(
  async (reference: string, locale: Locale) => {
    const content = await readWebsiteSections(["projects", "studies"]);
    const projects = content.projects.map((project) =>
      localizeProject(project, locale),
    );
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
      blocks: content.studies[pageId] ?? [],
    };
  },
);
