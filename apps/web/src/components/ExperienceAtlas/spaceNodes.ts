import type { Locale } from "@homepage/content/i18n";
import type { AtlasProject } from "./model";
import type { SpaceNode } from "./SemanticSpaceCharts";
import { SPACE_COLORS, type SemanticSpace } from "./spaceTypes";
import { bubbleDiameter } from "./bubbleSize";
import { projectHoverDetails } from "./projectHover";

/** The full Explorer and its preview share positions, clusters and hover facts. */
export function spaceNodes(
  space: SemanticSpace,
  projects: AtlasProject[],
  locale: Locale,
): SpaceNode[] {
  const byId = new Map(projects.map((project) => [project.id, project]));
  return space.ids.flatMap((id, index) => {
    const project = byId.get(id);
    if (!project) return [];
    const group = space.groups.findIndex((item) => item.ids.includes(id));
    return [
      {
        id,
        name: project.name,
        label: project.label,
        color: SPACE_COLORS[group] ?? SPACE_COLORS[0],
        wowFactor: project.wowFactor,
        diameter: bubbleDiameter(project.wowFactor),
        hover: projectHoverDetails(
          project,
          group,
          space.groups[group]?.ids.length ?? 0,
          locale,
        ),
        group,
        xy: space.positions2d[index],
        xyz: space.positions3d[index],
      },
    ];
  });
}
