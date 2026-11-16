import type { MetadataRoute } from "next";
import { getCachedCvProjects } from "@/server/notion/getCachedCvProjects";
import { projectPath, SITE_URL } from "@/lib/seo";
import { servicePath, serviceSlugs } from "@/data/services";
import { serviceAlternates } from "@/components/Services/serviceMetadata";
import { serviceProductPath } from "@/data/serviceProducts";
import { locales, localizedPath, languageAlternates } from "@/lib/i18n";
import { hasGermanTranslation } from "@/lib/localizeContent";

export const revalidate = 3600;

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
      return available.map((locale) => ({
        url: `${SITE_URL}${projectPath(project, locale)}`,
        alternates: { languages },
      }));
    }),
  ];
}
