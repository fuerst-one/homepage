import type { Locale } from "./i18n";

export type ProjectCaseStudySource = {
  caseStudyEn?: string | null;
  caseStudyDe?: string | null;
};

/** A populated language-specific URL is the publication switch. */
export function caseStudyPageId(
  project: ProjectCaseStudySource,
  locale: Locale,
) {
  const value = locale === "de" ? project.caseStudyDe : project.caseStudyEn;
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      ![
        "notion.so",
        "www.notion.so",
        "notion.com",
        "www.notion.com",
        "app.notion.com",
      ].includes(url.hostname)
    )
      return null;
    const id = url.pathname
      .match(/([a-f\d]{32}|[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12})\/?$/i)?.[1]
      ?.replaceAll("-", "")
      .toLowerCase();
    return id
      ? `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`
      : null;
  } catch {
    return null;
  }
}

export function safeCaseStudyLink(value: string | null | undefined) {
  if (!value) return null;
  try {
    return ["https:", "http:", "mailto:"].includes(new URL(value).protocol)
      ? value
      : null;
  } catch {
    return null;
  }
}

/** Only known Notion file hosts may be fetched by the server-side image proxy. */
export function safeCaseStudyImage(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      [
        "prod-files-secure.s3.us-west-2.amazonaws.com",
        "s3.us-west-2.amazonaws.com",
        "secure.notion-static.com",
        "file.notion.so",
      ].includes(url.hostname)
      ? value
      : null;
  } catch {
    return null;
  }
}

export function publicCaseStudyLink(
  value: string | null | undefined,
  projects: Record<string, string>,
) {
  const safe = safeCaseStudyLink(value);
  if (!safe) return null;
  const host = new URL(safe).hostname;
  if (
    [
      "notion.so",
      "www.notion.so",
      "notion.com",
      "www.notion.com",
      "app.notion.com",
    ].includes(host)
  ) {
    const id = caseStudyPageId({ caseStudyEn: safe }, "en");
    return id ? (projects[id] ?? null) : null;
  }
  return safe;
}
