import type { CvProject } from "@homepage/content/models";
import { SECTORS, sectorColor } from "@homepage/content/projectTaxonomy";
import { getFilterOptionCounts } from "./Filter/utils";

/** Every analysis view shares the sector colors so charts and cards read as one system. */
export const FACET_PALETTE = Object.values(SECTORS).map(({ color }) => color);
export const UNRANKED_FACET_COLOR = "#737373";
const LEADING_VALUES_MAX = 3;

/** Value → color, in rank order; ranked over all projects so a value keeps its color under any filter. */
export type FacetPalette = Map<string, string>;

export function facetPalette(
  projects: CvProject[],
  key: keyof CvProject,
): FacetPalette {
  const ranked = getFilterOptionCounts(projects, key).sort(
    (a, b) => b.count - a.count || a.itemKey.localeCompare(b.itemKey),
  );
  return new Map(
    ranked.map(({ itemKey }, rank) => [
      itemKey,
      key === "industries"
        ? sectorColor(itemKey)
        : (FACET_PALETTE[rank] ?? UNRANKED_FACET_COLOR),
    ]),
  );
}

export const facetColor = (palette: FacetPalette, value: string) =>
  palette.get(value) ?? UNRANKED_FACET_COLOR;

export function leadingFacetValues(
  project: CvProject,
  key: keyof CvProject,
  palette: FacetPalette,
) {
  const raw = project[key];
  const values = [
    ...new Set(
      (Array.isArray(raw) ? raw : raw ? [raw] : []).filter(
        (value): value is string => typeof value === "string",
      ),
    ),
  ];
  const ranks = new Map(
    [...palette.keys()].map((value, rank) => [value, rank]),
  );
  const rank = (value: string) => ranks.get(value) ?? Infinity;
  const sorted = values.sort((a, b) => rank(a) - rank(b));
  return {
    values: sorted
      .slice(0, LEADING_VALUES_MAX)
      .map((value) => ({ value, color: facetColor(palette, value) })),
    hiddenCount: Math.max(0, sorted.length - LEADING_VALUES_MAX),
  };
}

export type ProjectFacet = { view: keyof CvProject; palette: FacetPalette };
