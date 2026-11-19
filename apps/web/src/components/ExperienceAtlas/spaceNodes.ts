import type { Locale } from "@homepage/content/i18n";
import type { AtlasProject } from "./model";
import type { SpaceNode } from "./SemanticSpaceCharts";
import {
  SPACE_COLORS,
  type SemanticDataset,
  type SemanticSpace,
} from "./spaceTypes";
import { bubbleDiameter } from "./bubbleSize";
import { projectHoverDetails } from "./projectHover";
import { describeSpaceConnections } from "./spaceConnections";
import { buildScaleSpace, SCALE_FIELDS, SPACE_LENSES } from "./scaleSpace";
import { scaleSpaceKey } from "./scaleSpaceCache";

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

let scaleFit: { key: string; space: SemanticSpace } | undefined;

/** Fitting takes most of a second, so server renders reuse it until the measurements change. */
function defaultScaleSpace(projects: AtlasProject[]) {
  const fields = SCALE_FIELDS.map((field) => field.id);
  const key = scaleSpaceKey(projects, fields);
  if (scaleFit?.key !== key)
    scaleFit = { key, space: buildScaleSpace(projects, fields).space };
  return scaleFit.space;
}

/** Every Explorer lens for the compact preview; the numeric lens uses all fields, the Explorer's default. */
export function previewLenses(
  data: SemanticDataset,
  projects: AtlasProject[],
  locale: Locale,
) {
  return SPACE_LENSES.map(({ id, label, question }) => {
    const space =
      id === "scale" ? defaultScaleSpace(projects) : data.spaces[id];
    return {
      id,
      label,
      question,
      nodes: spaceNodes(space, projects, locale),
      groups: describeSpaceConnections(space, projects, "").groups,
    };
  });
}
