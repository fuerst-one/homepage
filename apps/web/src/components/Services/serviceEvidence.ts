import type { CvProject } from "@homepage/content/models";
import { automationCases } from "../../data/automationCases";
import { serviceProjects, type ServiceSlug } from "../../data/services";
import {
  selectServiceVisuals,
  type ServiceVisualOptions,
} from "./serviceVisuals";

// Only explicitly selected public portfolio records belong in a service case study.
// Returning a small view model also keeps client contact details out of the page.
export function selectServiceEvidence(
  projects: CvProject[],
  slug: ServiceSlug,
  projectHref: (project: CvProject) => string,
  options: ServiceVisualOptions = {},
) {
  return serviceProjects[slug].flatMap((id) => {
    const project = projects.find((item) => item.id === id);
    if (!project) return [];
    const story =
      slug === "ai-automation"
        ? (automationCases.find((item) => item.id === project.id) ?? null)
        : null;
    const visuals = selectServiceVisuals(project, slug, options);
    return [
      {
        id: project.id,
        story,
        href: projectHref(project),
        contentLocale: project.contentLocale ?? "en",
        name: project.name.trim(),
        ...visuals,
        screenshot:
          project.screenshots?.[story?.screenshotIndex ?? 0] ||
          project.screenshots?.[0] ||
          null,
        tools: project.tools.slice(0, 6),
        clients: project.clients.map((client) => client.name),
        projectType: project.projectType,
        kpis: project.kpis,
      },
    ];
  });
}
