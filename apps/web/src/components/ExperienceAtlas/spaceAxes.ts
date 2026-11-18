import type { AtlasProject } from "./model";
import type { SemanticSpace, SpaceLens } from "./spaceTypes";

export type AxisDescription = {
  negative: string | null;
  positive: string | null;
  label?: string;
};

export function spaceProjectTerms(project: AtlasProject, recipe: SpaceLens) {
  if (recipe === "scale") return [];
  return [
    ...new Set(
      (recipe === "engineering"
        ? [...project.tools, ...project.languages]
        : recipe === "practice"
          ? [
              project.ownership,
              project.projectType,
              project.scale?.workingPattern ?? "",
            ]
          : [...project.productTypes, ...project.matching.domains]
      ).filter(Boolean),
    ),
  ];
}

/** Projection directions have no inherent business meaning. Keep measured scale labels. */
export function describeSpaceAxes(
  _projects: AtlasProject[],
  space: SemanticSpace,
  dimensions: 2 | 3,
): AxisDescription[] {
  if (space.axisLabels) return space.axisLabels.slice(0, dimensions);
  return Array.from({ length: dimensions }, (_, i) => ({
    negative: null,
    positive: null,
    label: `Direction ${i + 1}`,
  }));
}

export function axisEndLabel(term: string | null, maxLength = 22) {
  if (!term) return "Mixed patterns";
  return term.length > maxLength
    ? `${term.slice(0, maxLength - 1).trimEnd()}…`
    : term;
}
