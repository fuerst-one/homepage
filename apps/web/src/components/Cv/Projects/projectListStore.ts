"use client";

import { create } from "zustand";
import type { CvProject } from "@homepage/content/models";
import {
  searchProjectIndex,
  type buildProjectSearchIndex,
} from "../../PlasmaLanding/projectSearch";
import {
  filterProjects,
  type FacetKey,
  type FilterParams,
} from "./Filter/utils";

/** Cluster numbers repeat across Explorer lenses, so the lens is part of a cluster's identity. */
export type ClusterSelection = {
  lens: string;
  index: number;
  ids: string[];
  label: string;
};
export type SemanticMatches = { query: string; ids: string[] };
export type SearchStatus = "idle" | "busy" | "complete" | "error";

export type ProjectListState = {
  filters: FilterParams;
  query: string;
  semantic: SemanticMatches | null;
  searchStatus: SearchStatus;
  cluster: ClusterSelection | null;
  /** Published by the list, which alone holds the projects; null while no list is mounted. */
  resultIds: string[] | null;
  revealId: string | null;
  /** The analysis box view; project cards lead with the same facet. */
  facetView: FacetKey;
  setFilters: (next: FilterParams) => void;
  toggle: (key: string, value: string) => void;
  clearKey: (key: string) => void;
  reset: () => void;
  setQuery: (query: string) => void;
  setSemantic: (semantic: SemanticMatches | null) => void;
  setSearchStatus: (status: SearchStatus) => void;
  toggleCluster: (cluster: ClusterSelection) => void;
  clearCluster: () => void;
  setResultIds: (ids: string[]) => void;
  revealProject: (id: string) => void;
  clearReveal: () => void;
  setFacetView: (view: FacetKey) => void;
  resetListView: () => void;
};

const withoutDefaultFeatured = (filters: FilterParams) => {
  const next = { ...filters };
  delete next.featured;
  return next;
};

export const useProjectListStore = create<ProjectListState>((set, get) => ({
  filters: {
    featured: ["true"],
  },
  query: "",
  semantic: null,
  searchStatus: "idle",
  cluster: null,
  resultIds: null,
  revealId: null,
  facetView: "industries",
  setFilters: (next) => set({ filters: next }),
  toggle: (key, value) => {
    const prev = get().filters;
    const existing = prev[key as keyof FilterParams] ?? [];
    const has = existing.includes(value);
    const updated = has
      ? existing.filter((v) => v !== value)
      : Array.from(new Set([...existing, value])).sort((a, b) =>
          a.localeCompare(b),
        );
    const next: FilterParams = { ...prev };
    if (updated.length) {
      next[key as keyof FilterParams] = updated;
    } else {
      delete next[key as keyof FilterParams];
    }
    set({
      filters: key === "featured" ? next : withoutDefaultFeatured(next),
    });
  },
  clearKey: (key) => {
    const prev = get().filters;
    const next: FilterParams = { ...prev };
    delete next[key as keyof FilterParams];
    set({ filters: next });
  },
  reset: () => set({ filters: {} }),
  setQuery: (query) => set({ query, semantic: null, searchStatus: "idle" }),
  setSemantic: (semantic) =>
    set({ semantic, searchStatus: semantic ? "complete" : "idle" }),
  setSearchStatus: (searchStatus) => set({ searchStatus }),
  toggleCluster: (cluster) => {
    const active = get().cluster;
    if (active?.lens === cluster.lens && active.index === cluster.index)
      return set({ cluster: null });
    set({ cluster, filters: withoutDefaultFeatured(get().filters) });
  },
  clearCluster: () => set({ cluster: null }),
  setResultIds: (resultIds) => set({ resultIds }),
  revealProject: (revealId) => set({ revealId }),
  clearReveal: () => set({ revealId: null }),
  setFacetView: (facetView) => set({ facetView }),
  resetListView: () =>
    set({
      query: "",
      semantic: null,
      searchStatus: "idle",
      cluster: null,
      resultIds: null,
      revealId: null,
      facetView: "industries",
    }),
}));

export function selectProjectResults({
  projects,
  index,
  filters,
  clusterIds,
  query,
  semanticIds = [],
}: {
  projects: CvProject[];
  index: ReturnType<typeof buildProjectSearchIndex>;
  filters: FilterParams;
  clusterIds?: string[];
  query: string;
  semanticIds?: string[];
}) {
  const filtered = filterProjects(projects, filters);
  const eligible = clusterIds
    ? filtered.filter((project) => clusterIds.includes(project.id))
    : filtered;
  if (!query.trim()) return eligible;
  const byId = new Map(eligible.map((project) => [project.id, project]));
  return searchProjectIndex(
    index,
    query,
    undefined,
    semanticIds,
  ).projects.flatMap((match) => {
    const project = byId.get(match.id);
    return project ? [project] : [];
  });
}

export function mutedProjectIds(
  projectIds: string[],
  resultIds: string[] | null,
) {
  if (!resultIds) return [];
  const results = new Set(resultIds);
  return projectIds.filter((id) => !results.has(id));
}

/** For views beside the list: the projects it currently shows, or the facet-filtered set before it reports. */
export function publishedResultProjects(
  projects: CvProject[],
  resultIds: string[] | null,
  filters: FilterParams,
) {
  if (!resultIds) return filterProjects(projects, filters);
  const results = new Set(resultIds);
  return projects.filter((project) => results.has(project.id));
}
