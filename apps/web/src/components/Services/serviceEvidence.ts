import type { CvProject } from "@homepage/content/models";
import { serviceProjects, type ServiceSlug } from "../../data/services";

// Only explicitly selected public portfolio records belong in a service case study.
// Returning a small view model also keeps client contact details out of the page.
export function selectServiceEvidence(
  projects: CvProject[],
  slug: ServiceSlug,
  projectHref: (project: CvProject) => string,
) {
  return serviceProjects[slug].flatMap((id) => {
    const project = projects.find((item) => item.id === id);
    if (!project) return [];
    return [
      {
        id: project.id,
        href: projectHref(project),
        contentLocale: project.contentLocale ?? "en",
        name: project.name.trim(),
        screenshot: project.screenshots?.[0] || null,
        tools: project.tools.slice(0, 6),
        clients: project.clients.map((client) => client.name),
        projectType: project.projectType,
        kpis: project.kpis,
      },
    ];
  });
}
