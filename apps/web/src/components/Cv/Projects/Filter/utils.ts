import { CvProject } from "@homepage/content/models";
import type { Locale } from "@homepage/content/i18n";
import countBy from "lodash/countBy";
import { colors } from "../colors";
import { atlasTerm } from "../../../ExperienceAtlas/atlasCopy";
import { CASE_VOCABULARY, caseLabel } from "@homepage/content/projectCase";
import {
  matchesLegacyTaxonomy,
  projectDeliveryModels,
  sectorLabel,
} from "@homepage/content/projectTaxonomy";

type FilterKey =
  | keyof Omit<
      CvProject,
      | "description"
      | "kpis"
      | "clients"
      | "descriptionDe"
      | "kpisDe"
      | "germanReady"
      | "contentLocale"
      | "caseStudyEn"
      | "caseStudyDe"
      | "matching"
    >
  | keyof typeof CASE_VOCABULARY;
export type FilterParams = Partial<Record<FilterKey, string[]>>;
/** Project fields plus the case facets that live on the project's case data. */
export type FacetKey = keyof CvProject | keyof typeof CASE_VOCABULARY;

export function facetValue(project: CvProject, key: FacetKey): unknown {
  if (Object.hasOwn(CASE_VOCABULARY, key))
    return project.matching?.[key as keyof typeof CASE_VOCABULARY];
  if (key === "deliveryModel" || key === "deliveryModels")
    return projectDeliveryModels(project);
  return project[key as keyof CvProject];
}

/** Values stay stored in English; German readers see the shared vocabulary translations. */
export const facetValueLabel = (
  key: FacetKey,
  value: string,
  locale: Locale,
) =>
  key === "industries"
    ? sectorLabel(value, locale)
    : key === "productTypes"
      ? atlasTerm(locale, value)
      : caseLabel(value, locale);

export const getFilterOptionCounts = (projects: CvProject[], key: FacetKey) => {
  const countsByKey = countBy(
    projects.flatMap<unknown>((project) => {
      const value = facetValue(project, key);
      return Array.isArray(value)
        ? [...new Set<unknown>(value)]
        : value == null
          ? []
          : [value];
    }),
  );
  const countsSorted = Object.entries(countsByKey).sort((a, b) => b[1] - a[1]);
  return countsSorted.map(([itemKey, count]) => ({
    itemKey,
    count,
    color: colors[key as keyof CvProject]?.[itemKey]?.hex,
  }));
};

export const filterProjects = (
  projects: CvProject[],
  searchParams: FilterParams,
) => {
  return projects.filter((project) => {
    return Object.keys(searchParams).every((_key) => {
      const key = _key as FilterKey;
      const searchValues = searchParams[key];
      if (!searchValues?.length) {
        return true;
      }
      const value = facetValue(project, key);
      return searchValues.some(
        (searchValue) =>
          getIsMatchingProject(value, [searchValue]) ||
          matchesLegacyTaxonomy(project, key, searchValue),
      );
    });
  });
};

/** A category link opens the directory with that category selected. */
export function projectFacetHref(
  key: "buyerNeeds" | "capabilities" | "industries" | "methods",
  value: string,
  locale: Locale,
) {
  return `/${locale}/projects?${new URLSearchParams({ [key]: value })}`;
}

const getIsMatchingProject = (
  projectValue: unknown,
  searchValues: string[],
) => {
  return searchValues.some((searchValue) => {
    if (Array.isArray(projectValue)) {
      return projectValue.some((projectValue) => {
        return compareValues(projectValue, searchValue);
      });
    }
    return compareValues(projectValue, searchValue);
  });
};

const compareValues = (projectValue: unknown, searchValue: string) => {
  return (
    (typeof projectValue === "string" ||
      typeof projectValue === "number" ||
      typeof projectValue === "boolean") &&
    projectValue.toString().toLowerCase() === searchValue.toLowerCase()
  );
};
