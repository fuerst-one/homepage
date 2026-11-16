import { CvProject } from "@/server/notion/getCvProjects";

export const getProjectLogoSources = (project: CvProject): string[] => {
  const explicitLogos = (project.logo ?? []).filter(Boolean);

  const uniqueLogos = Array.from(new Set(explicitLogos));

  if (uniqueLogos.length > 0) {
    return uniqueLogos;
  }

  return [];
};
