import { personName, localizePersonName } from "@homepage/content/i18n";
import {
  localizedPath,
  languageAlternates,
  localeFromPath,
  type Locale,
} from "@homepage/content/i18n";
import { hasGermanTranslation } from "@homepage/content/localizeContent";
import { contentDate } from "@homepage/content/contentDates";
import { hiringPlatforms } from "@homepage/content/data/hiringPlatforms";
import type { Metadata } from "next";
import projectSlugs from "@homepage/content/data/project-slugs.json";
import type { CvOwnerPublic } from "@homepage/content/models";
import type { CaseStudyBlock, CvProject } from "@homepage/content/models";
import {
  flattenRichText,
  truncateAtSentence,
} from "../app/cv.pdf/flattenRichText";

// Keep canonical identity independent of local/preview API origins.
export const SITE_URL = "https://fuerst.one";
export const SITE_NAME = "FUERST.ONE";
export const PERSON_ID = `${SITE_URL}/#person`;
export const PROFILE_LINKS = [
  ...new Set([
    "https://github.com/fuerst-one",
    ...hiringPlatforms.map(({ href }) => href),
  ]),
];
export const SITE_DESCRIPTION =
  "Alexander Fuerst is a UX+AI engineer in Würzburg, Germany, building frontend interfaces, AI automation, data visualizations, and e-commerce experiences.";

export function pageMetadata(
  path: string,
  title: string,
  description: string,
  options: { locale?: Locale; availableLocales?: Locale[] } = {},
): Metadata {
  const locale = options.locale ?? localeFromPath(path);
  title = localizePersonName(title, locale).replace(
    /Fuerst\.one/g,
    "FUERST.ONE",
  );
  description = localizePersonName(description, locale).replace(
    /Fuerst\.one/g,
    "FUERST.ONE",
  );
  const url = `${SITE_URL}${localizedPath(path, locale)}`;
  const languages = languageAlternates(path);
  if (options.availableLocales && !options.availableLocales.includes("de"))
    delete (languages as Partial<typeof languages>).de;
  return {
    title,
    description,
    alternates: { canonical: url, languages },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: locale === "de" ? "de_DE" : "en_US",
      alternateLocale: locale === "de" ? "en_US" : "de_DE",
      url,
      title,
      description,
      images: [
        {
          url: `${SITE_URL}/${locale}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${personName(locale)} — UX+AI Engineer`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE_URL}/${locale}/opengraph-image`],
    },
  };
}

export function personSchema(owner?: CvOwnerPublic, locale: Locale = "en") {
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: personName(locale),
    url: `${SITE_URL}${localizedPath("/", locale)}`,
    jobTitle: owner?.position || "UX+AI Engineer",
    description:
      locale === "de"
        ? "Alexander Fürst entwickelt UX-Interfaces, KI-Automatisierung, Datenvisualisierungen und E-Commerce-Erlebnisse in Würzburg."
        : SITE_DESCRIPTION,
    sameAs: PROFILE_LINKS,
    ...(owner?.city && {
      homeLocation: { "@type": "Place", name: owner.city },
    }),
    ...(owner?.avatarUrl && { image: new URL(owner.avatarUrl, SITE_URL).href }),
  };
}

export function projectSlug(project: Pick<CvProject, "id" | "name">) {
  const saved = (projectSlugs as Record<string, string>)[project.id];
  if (saved) return saved;
  // New Notion records work immediately; published slugs are pinned in the registry.
  const name = project.name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${name || "project"}-${project.id}`;
}

export function projectPath(
  project: Pick<CvProject, "id" | "name"> & Partial<CvProject>,
  locale: Locale = project.contentLocale ?? "en",
) {
  const publishedLocale =
    locale === "de" &&
    (project.contentLocale === "de" ||
      (project.description &&
        project.kpis &&
        hasGermanTranslation(project as CvProject)))
      ? "de"
      : "en";
  return `/${publishedLocale}/projects/${projectSlug(project)}`;
}

export function projectDescription(project: CvProject) {
  return truncateAtSentence(
    flattenRichText(project.description) ||
      `${project.name} — ${project.projectType} project by Alexander Fuerst.`,
    160,
  );
}

export function projectSchema(project: CvProject) {
  return {
    "@type": "CreativeWork",
    "@id": `${SITE_URL}${projectPath(project)}#project`,
    url: `${SITE_URL}${projectPath(project)}`,
    name: project.name,
    inLanguage: project.contentLocale ?? "en",
    description:
      flattenRichText(project.description) || projectDescription(project),
    creator: { "@id": PERSON_ID },
    ...(contentDate(project.updatedAt) && {
      dateModified: contentDate(project.updatedAt),
    }),
    keywords: [
      ...new Set([
        ...project.tools,
        ...project.capabilities,
        ...project.methods,
        ...project.industries,
      ]),
    ],
    ...(project.screenshots?.length && {
      image: project.screenshots.map((url) => new URL(url, SITE_URL).href),
    }),
    ...(project.websiteUrl && { sameAs: project.websiteUrl }),
  };
}

export function caseStudyDescription(
  project: CvProject,
  blocks: CaseStudyBlock[],
) {
  const introduction = blocks
    .filter((block) => block.type === "paragraph")
    .map((block) =>
      flattenRichText({ type: "rich_text", rich_text: block.richText }),
    )
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");
  return introduction
    ? truncateAtSentence(introduction, 160)
    : projectDescription(project);
}

export function caseStudySchema(
  project: CvProject,
  locale: Locale,
  blocks: CaseStudyBlock[],
) {
  const url = `${SITE_URL}${projectPath(project, locale)}/case-study`;
  const modified = contentDate(project.caseStudyUpdatedAt?.[locale]);
  return {
    "@type": "Article",
    "@id": `${url}#article`,
    url,
    headline: project.name,
    description: caseStudyDescription(project, blocks),
    inLanguage: locale,
    author: { "@id": PERSON_ID },
    about: { "@id": `${SITE_URL}${projectPath(project, locale)}#project` },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    isPartOf: { "@id": `${SITE_URL}/#website` },
    ...(modified && { dateModified: modified }),
  };
}

export function serializeJsonLd(data: unknown) {
  // Notion text may contain HTML; it must never terminate the script element.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
