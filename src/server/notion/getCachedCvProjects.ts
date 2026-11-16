import { localizeProject } from "@/lib/localizeContent";
import type { Locale } from "@/lib/i18n";
import { unstable_cache } from "next/cache";
import { getCvProjects } from "./getCvProjects";

export const CV_PROJECTS_CACHE_TAG = "cv-projects";

const getCachedProjectSource = unstable_cache(
  () => getCvProjects(),
  ["cv-projects-merged-i18n-v2"],
  { tags: [CV_PROJECTS_CACHE_TAG], revalidate: 3600 },
);

export const getCachedCvProjects = async (locale: Locale = "en") =>
  (await getCachedProjectSource()).map((project) =>
    localizeProject(project, locale),
  );
