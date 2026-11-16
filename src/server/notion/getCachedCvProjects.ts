import { localizeProject } from "@/lib/localizeContent";
import type { Locale } from "@/lib/i18n";
import { readWebsiteSection } from "./websiteContent";

export const CV_PROJECTS_CACHE_TAG = "cv-projects";

export const getCachedCvProjects = async (locale: Locale = "en") =>
  (await readWebsiteSection("projects")).map((project) =>
    localizeProject(project, locale),
  );
