import { CvProject } from "@homepage/content/models";
import countBy from "lodash/countBy";
import { colors } from "../colors";
import { CASE_VOCABULARY } from "@homepage/content/projectCase";
import { matchesLegacyTaxonomy } from "@homepage/content/projectTaxonomy";

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

export const getFilterOptionCounts = (
  projects: CvProject[],
  key: keyof CvProject,
) => {
  const countsByKey = countBy(
    projects.flatMap<unknown>((project) => {
      const value = project[key];
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
    color: colors[key]?.[itemKey]?.hex,
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
      const value = Object.hasOwn(CASE_VOCABULARY, key)
        ? project.matching?.[key as keyof typeof CASE_VOCABULARY]
        : project[key as keyof CvProject];
      return searchValues.some(
        (searchValue) =>
          getIsMatchingProject(value, [searchValue]) ||
          matchesLegacyTaxonomy(project, key, searchValue),
      );
    });
  });
};

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
