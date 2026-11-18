import { readWebsiteSections } from "@homepage/database/websiteContent";
import {
  PROFILE_FACETS,
  type ProfileCatalog,
  type ProfileTerm,
} from "@homepage/content/visitorProfile";
import { projectPath } from "../../lib/seo";

/** Use only the reviewed public publication; never the editorial source record. */
export async function getProfileCatalog(): Promise<ProfileCatalog> {
  const { projects, cases } = await readWebsiteSections(["projects", "cases"]);
  const matching = new Map(cases.map((c) => [c.id, c.caseStudy]));
  const terms = new Map<string, ProfileTerm>();
  const publicProjects = projects.map((project) => {
    const ids: string[] = [];
    for (const facet of PROFILE_FACETS) {
      const source =
        facet === "buyerNeeds" || facet === "stages"
          ? (matching.get(project.id)?.[facet] ?? [])
          : (project[facet] ?? []);
      for (const value of [...new Set(source)]) {
        const id = `${facet}:${value}`;
        terms.set(id, { id, facet, value });
        ids.push(id);
      }
    }
    return {
      id: project.id,
      name: project.name,
      href: projectPath(project, "en"),
      terms: ids,
    };
  });
  return { projects: publicProjects, terms: [...terms.values()] };
}
