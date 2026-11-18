import type { MetadataRoute } from "next";
import { getCachedCvProjects } from "../server/content/getCachedCvProjects";
import { projectPath, SITE_URL } from "../lib/seo";
import { servicePath, serviceSlugs } from "../data/services";
import { serviceAlternates } from "../components/Services/serviceMetadata";
import { serviceProductPath } from "../data/serviceProducts";
import {
  locales,
  localizedPath,
  languageAlternates,
} from "@homepage/content/i18n";
import { hasGermanTranslation } from "@homepage/content/localizeContent";
import { caseStudyPageId } from "@homepage/content/projectCaseStudy";

export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projects = await getCachedCvProjects();
  return [
    ...["/", "/projects", "/contact", "/hire", "/plasma"].flatMap((path) =>
      locales.map((locale) => ({
        url: `${SITE_URL}${localizedPath(path, locale)}`,
        alternates: { languages: languageAlternates(path) },
      })),
    ),
    ...["/legal-notice", "/privacy"].flatMap((path) =>
      locales.map((locale) => ({
        url: `${SITE_URL}${localizedPath(path, locale)}`,
        alternates: { languages: languageAlternates(path) },
      })),
    ),
    ...serviceSlugs.flatMap((slug) =>
      (["en", "de"] as const).map((locale) => ({
        url: `${SITE_URL}${servicePath(slug, locale)}`,
        alternates: { languages: serviceAlternates(slug) },
      })),
    ),
    ...serviceSlugs.flatMap((slug) =>
      locales.map((locale) => ({
        url: `${SITE_URL}${serviceProductPath(slug, locale)}`,
        alternates: {
          languages: languageAlternates(serviceProductPath(slug, "en")),
        },
      })),
    ),
    ...projects.flatMap((project) => {
      const available = hasGermanTranslation(project)
        ? locales
        : (["en"] as const);
      const languages = Object.fromEntries(
        available.map((locale) => [
          locale,
          `${SITE_URL}${projectPath(project, locale)}`,
        ]),
      );
      languages["x-default"] = `${SITE_URL}${projectPath(project, "en")}`;
      const caseLocales = available.filter((locale) =>
        caseStudyPageId(project, locale),
      );
      const caseLanguages = Object.fromEntries(
        caseLocales.map((locale) => [
          locale,
          `${SITE_URL}${projectPath(project, locale)}/case-study`,
        ]),
      );
      if (caseLocales.length)
        caseLanguages["x-default"] =
          `${SITE_URL}${projectPath(project, caseLocales[0])}/case-study`;
      return [
        ...available.map((locale) => ({
          url: `${SITE_URL}${projectPath(project, locale)}`,
          alternates: { languages },
        })),
        ...caseLocales.map((locale) => ({
          url: `${SITE_URL}${projectPath(project, locale)}/case-study`,
          alternates: { languages: caseLanguages },
        })),
      ];
    }),
  ];
}
