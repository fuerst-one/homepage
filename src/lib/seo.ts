import type { Metadata } from "next";
import projectSlugs from "@/data/project-slugs.json";
import type { CvOwnerPublic } from "@/server/notion/getCvOwner";
import type { CvProject } from "@/server/notion/getCvProjects";
import {
  flattenRichText,
  truncateAtSentence,
} from "@/app/cv.pdf/flattenRichText";

// Keep canonical identity independent of local/preview API origins.
export const SITE_URL = "https://fuerst.one";
export const SITE_NAME = "Fuerst.one";
export const PERSON_ID = `${SITE_URL}/#person`;
export const PROFILE_LINKS = [
  "https://github.com/fuerst-one",
  "https://www.linkedin.com/in/fuerst-one/",
];
export const SITE_DESCRIPTION =
  "Alexander Fuerst is a UX+AI engineer in Würzburg, Germany, building frontend interfaces, AI automation, data visualizations, and e-commerce experiences.";

export function pageMetadata(
  path: string,
  title: string,
  description: string,
): Metadata {
  const url = `${SITE_URL}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
      url,
      title,
      description,
      images: [
        {
          url: `${SITE_URL}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: "Alexander Fuerst — UX+AI Engineer",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE_URL}/opengraph-image`],
    },
  };
}

export function personSchema(owner?: CvOwnerPublic) {
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: owner?.name || "Alexander Fuerst",
    alternateName: ["Alexander Fuerst", "Alexander Fürst"],
    url: `${SITE_URL}/`,
    jobTitle: owner?.position || "UX+AI Engineer",
    description: SITE_DESCRIPTION,
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

export function projectPath(project: Pick<CvProject, "id" | "name">) {
  return `/projects/${projectSlug(project)}`;
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
    description:
      flattenRichText(project.description) || projectDescription(project),
    creator: { "@id": PERSON_ID },
    keywords: [
      ...new Set([
        ...project.tools,
        ...project.experiences,
        ...project.industries,
      ]),
    ],
    ...(project.screenshots?.length && {
      image: project.screenshots.map((url) => new URL(url, SITE_URL).href),
    }),
    ...(project.websiteUrl && { sameAs: project.websiteUrl }),
  };
}

export function serializeJsonLd(data: unknown) {
  // Notion text may contain HTML; it must never terminate the script element.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
