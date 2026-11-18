import type { Locale } from "@homepage/content/i18n";
import { readWebsiteSection } from "@homepage/database/websiteContent";
import { withProjectEditorialFacts } from "@homepage/content/projectEditorial";

export const CV_PROJECTS_CACHE_TAG = "cv-projects";

export const getCachedCvProjects = async (locale: Locale = "en") =>
  (await readWebsiteSection("projects", undefined, locale)).map(
    withProjectEditorialFacts,
  );
