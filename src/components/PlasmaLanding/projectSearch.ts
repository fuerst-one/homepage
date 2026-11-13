import type { ProjectListItem } from "@/server/api/projectListItem";
import { getKeywordIconShape, getProjectIconShape } from "./iconCatalog";
const FILTER_GROUPS = [
  { field: "tools", label: "Tool", shape: 4 },
  { field: "experiences", label: "Expertise", shape: 2 },
  { field: "industries", label: "Industry", shape: 0 },
  { field: "languages", label: "Language", shape: 4 },
  { field: "projectType", label: "Project type", shape: 2 },
  { field: "workplace", label: "Workplace", shape: 2 },
  { field: "clients", label: "Client", shape: 1 },
  { field: "featured", label: "Selection", shape: 0 },
] as const;
type SearchField = (typeof FILTER_GROUPS)[number]["field"];
export type SearchFilter = {
  field: SearchField;
  value: string;
};
export type SearchProject = {
  id: string;
  name: string;
  href: string;
  summary: string;
  shape: number;
  facets: Record<SearchField, string[]>;
};
export type SearchSuggestion = {
  id: string;
  kind: "keyword" | "project";
  label: string;
  category: string;
  count: number;
  shape: number;
  caption: string;
  filter?: SearchFilter;
  href?: string;
};
export type ProjectSearchIndex = {
  projects: SearchProject[];
  keywords: SearchSuggestion[];
};
const normalize = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[._/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const STOP_WORDS = new Set([
  "show",
  "me",
  "your",
  "projects",
  "project",
  "with",
  "using",
  "and",
  "in",
  "for",
  "the",
]);
const matchRank = (value: string, term: string) => {
  const normalized = normalize(value);
  const words = normalized.split(" ");
  if (normalized === term) return 0;
  if (normalized.startsWith(term)) return 1;
  if (words.some((word) => word.startsWith(term))) return 2;
  if (term.length > 1 && words.map((word) => word[0]).join("") === term)
    return 2;
  if (term.length >= 3 && normalized.includes(term)) return 3;
  return Infinity;
};
/** Uses the existing public project API; private Notion fields never enter this index. */
export const buildProjectSearchIndex = (
  items: ProjectListItem[],
): ProjectSearchIndex => {
  const projects: SearchProject[] = items.map((item) => {
    const pathname = new URL(item.webUrl, "https://fuerst.one").pathname;
    const href = /^\/projects\//.test(pathname) ? pathname : "/cv";
    return {
      id: item.id,
      name: item.name,
      href,
      shape: getProjectIconShape(item.icon),
      summary: item.oneLineSummary,
      facets: {
        tools: item.tools,
        experiences: item.experiences,
        industries: item.industries,
        languages: item.languages,
        projectType: [item.projectType],
        workplace: [item.workplace],
        clients: item.clientNames,
        featured: [item.featured ? "Featured" : "Not featured"],
      },
    };
  });
  const keywords: SearchSuggestion[] = [];
  for (const group of FILTER_GROUPS) {
    const label = group.label;
    const counts = new Map<string, number>();
    for (const project of projects) {
      for (const value of new Set(
        project.facets[group.field].filter(Boolean),
      )) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
    }
    for (const [value, count] of counts) {
      keywords.push({
        id: `${group.field}:${value}`,
        kind: "keyword",
        label: value,
        category: label,
        count,
        shape: getKeywordIconShape(group.field, value, group.shape),
        caption: `${count} ${count === 1 ? "project" : "projects"} · ${label.toLowerCase()}: ${value}`,
        filter: { field: group.field, value },
      });
    }
  }
  return { projects, keywords };
};
export const searchProjectIndex = (
  index: ProjectSearchIndex,
  query: string,
  filter?: SearchFilter,
) => {
  const normalized = normalize(query);
  const terms = normalized
    .split(" ")
    .filter((term) => term && !STOP_WORDS.has(term));
  if (!terms.length)
    return {
      projects: [] as SearchProject[],
      suggestions: [] as SearchSuggestion[],
    };
  const selectedFilter =
    filter ??
    index.keywords.find(
      (keyword) =>
        keyword.filter?.field === "featured" &&
        normalize(keyword.label) === normalized,
    )?.filter;
  const projects = index.projects
    .filter((project) => {
      if (selectedFilter)
        return project.facets[selectedFilter.field].includes(
          selectedFilter.value,
        );
      const values = [
        project.name,
        project.summary,
        ...Object.values(project.facets).flat(),
      ];
      return terms.every((term) =>
        values.some((value) => Number.isFinite(matchRank(value, term))),
      );
    })
    .sort((a, b) => {
      const nameRank = (project: SearchProject) =>
        terms.reduce((rank, term) => rank + matchRank(project.name, term), 0);
      const aRank = nameRank(a);
      const bRank = nameRank(b);
      return aRank === bRank ? 0 : aRank - bRank;
    });
  const keywords = index.keywords
    .map((keyword) => ({
      keyword,
      rank: terms.reduce(
        (rank, term) => rank + matchRank(keyword.label, term),
        0,
      ),
    }))
    .filter((item) => Number.isFinite(item.rank))
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        b.keyword.count - a.keyword.count ||
        a.keyword.label.localeCompare(b.keyword.label),
    )
    .slice(0, 12)
    .map((item) => item.keyword);
  const projectSuggestions: SearchSuggestion[] = projects
    .slice(0, 6)
    .map((project) => ({
      id: `project:${project.id}`,
      kind: "project",
      label: project.name,
      category: "Project",
      count: 1,
      shape: project.shape,
      caption: project.summary || project.name,
      href: project.href,
    }));
  return { projects, suggestions: [...keywords, ...projectSuggestions] };
};
