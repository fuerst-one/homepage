import type { CvProject } from "@homepage/content/models";
import { SECTORS, sectorColor } from "@homepage/content/projectTaxonomy";
import {
  facetValue,
  getFilterOptionCounts,
  type FacetKey,
} from "./Filter/utils";

/** Every analysis view shares the sector colors so charts and cards read as one system. */
export const FACET_PALETTE = Object.values(SECTORS).map(({ color }) => color);
const UNKNOWN_FACET_COLOR = "#737373";
const LEADING_VALUES_MAX = 3;

/** Ranked over all projects, so a value keeps its color and weight under any filter. */
export type FacetPalette = {
  projectCount: number;
  /** In rank order: most common first. */
  values: Map<string, { color: string; count: number }>;
};

export type LeadingFacetValues = {
  values: { value: string; color: string }[];
  hiddenCount: number;
};

export type ProjectFacet = { view: FacetKey } & LeadingFacetValues;

export function facetPalette(
  projects: CvProject[],
  key: FacetKey,
): FacetPalette {
  const ranked = getFilterOptionCounts(projects, key).sort(
    (a, b) => b.count - a.count || a.itemKey.localeCompare(b.itemKey),
  );
  return {
    projectCount: projects.length,
    values: new Map(
      ranked.map(({ itemKey, count }, rank) => [
        itemKey,
        {
          count,
          color:
            key === "industries"
              ? sectorColor(itemKey)
              : FACET_PALETTE[rank % FACET_PALETTE.length],
        },
      ]),
    ),
  };
}

export const facetColor = (palette: FacetPalette, value: string) =>
  palette.values.get(value)?.color ?? UNKNOWN_FACET_COLOR;

/** Zero for values every project or only one project shares; highest for values a moderate number share. */
function distinctiveness(
  { projectCount, values }: FacetPalette,
  value: string,
) {
  const count = values.get(value)?.count;
  return count ? Math.log(count) * Math.log(projectCount / count) : -Infinity;
}

/** How often each value already led a card further up the list. */
type ShownCounts = Map<string, number>;

export function leadingFacetValues(
  project: CvProject,
  key: FacetKey,
  palette: FacetPalette,
  shown: ShownCounts = new Map(),
): LeadingFacetValues {
  const raw = facetValue(project, key);
  const ranks = new Map(
    [...palette.values.keys()].map((value, rank) => [value, rank]),
  );
  const rank = (value: string) => ranks.get(value) ?? Infinity;
  const timesShown = (value: string) => shown.get(value) ?? 0;
  const sorted = [
    ...new Set(
      (Array.isArray(raw) ? raw : raw ? [raw] : []).filter(
        (value): value is string => typeof value === "string",
      ),
    ),
  ].sort(
    (a, b) =>
      timesShown(a) - timesShown(b) ||
      distinctiveness(palette, b) - distinctiveness(palette, a) ||
      rank(a) - rank(b),
  );
  return {
    values: sorted
      .slice(0, LEADING_VALUES_MAX)
      .map((value) => ({ value, color: facetColor(palette, value) })),
    hiddenCount: Math.max(0, sorted.length - LEADING_VALUES_MAX),
  };
}

/** Cards claim values in list order, so each card leads with what the cards above it have not shown yet. */
export function leadingFacetValuesInList(
  projects: CvProject[],
  key: FacetKey,
  palette: FacetPalette,
) {
  const shown: ShownCounts = new Map();
  return new Map(
    projects.map((project) => {
      const leading = leadingFacetValues(project, key, palette, shown);
      for (const { value } of leading.values)
        shown.set(value, (shown.get(value) ?? 0) + 1);
      return [project.id, leading];
    }),
  );
}
