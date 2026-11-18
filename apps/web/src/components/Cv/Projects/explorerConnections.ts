import type { CvProject } from "@homepage/content/models";
import type { Locale } from "@homepage/content/i18n";
import { hasGermanTranslation } from "@homepage/content/localizeContent";
import type { AtlasProject } from "../../ExperienceAtlas/model";

type ConnectionSource = Pick<AtlasProject, "id" | "related" | "industries">;

/** Keep the Explorer's recorded connections, but only link to published pages. */
export function explorerConnections(
  id: string,
  projects: CvProject[],
  atlas: ConnectionSource[],
  locale: Locale,
) {
  const visible = new Map(
    projects
      .filter((project) => locale !== "de" || hasGermanTranslation(project))
      .map((project) => [project.id, project]),
  );
  if (!visible.has(id)) return [];
  const byId = new Map(atlas.map((project) => [project.id, project]));
  const seen = new Set([id]);
  return (byId.get(id)?.related ?? [])
    .flatMap(({ id: otherId, reasons }) => {
      const project = visible.get(otherId);
      if (!project || seen.has(otherId)) return [];
      seen.add(otherId);
      return [
        { project, reasons, industries: byId.get(otherId)?.industries ?? [] },
      ];
    })
    .slice(0, 3);
}
