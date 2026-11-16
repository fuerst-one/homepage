import "server-only";
import { cache } from "react";
import type { Locale } from "@homepage/content/i18n";
import { caseStudyPageId } from "@homepage/content/projectCaseStudy";
import { hasGermanTranslation } from "@homepage/content/localizeContent";
import { projectSlug } from "../../lib/seo";
import { readWebsiteSections } from "@homepage/database/websiteContent";

/** Always resolve through a visible project and its explicitly linked case study. */
export const getProjectCaseStudy = cache(
  async (reference: string, locale: Locale) => {
    const content = await readWebsiteSections(
      ["projects", "studies"],
      undefined,
      locale,
    );
    const projects = content.projects;
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
      blocks: content.studies[pageId] ?? [],
    };
  },
);
