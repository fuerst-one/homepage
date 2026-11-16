import type { Locale } from "@homepage/content/i18n";
import { readWebsiteSection } from "@homepage/database/websiteContent";

export const CV_PROJECTS_CACHE_TAG = "cv-projects";

export const getCachedCvProjects = async (locale: Locale = "en") =>
  readWebsiteSection("projects", undefined, locale);
