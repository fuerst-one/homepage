"use client";

import { useLocale } from "../../i18n/LocaleProvider";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { CvProject } from "@homepage/content/models";
import { FilterSqlConsole } from "./Filter/FilterSqlConsole";
import { ProjectCard } from "./ProjectCard";
import { ProjectCollapse } from "./ProjectCollapse";
import { ProjectDetailDialog } from "./ProjectDetailDialog";
import { FiltersUrlSync } from "./FiltersUrlSync";
import { useProjectListStore } from "./projectListStore";
import {
  CV_PRESETS,
  findActivePreset,
  normalizeFilters,
  localizePreset,
} from "../cvPresets";
import { useProjectFocusStore } from "./projectFocusStore";
import { useProjectListSearch } from "./useProjectListSearch";
import { ProjectListSearch } from "./ProjectListSearch";
import { useProjectsInView } from "./useProjectsInView";
import { facetPalette, type ProjectFacet } from "./facetColors";

const SLICE_DEFAULT = 8;

export function ProjectsClientView({
  projects,
  semanticEnabled = false,
}: {
  projects: CvProject[];
  semanticEnabled?: boolean;
}) {
  const locale = useLocale();
  const filterParams = useProjectListStore((s) => s.filters);
  const setHovered = useProjectFocusStore((s) => s.setHoveredProjectId);

  const cluster = useProjectListStore((s) => s.cluster);
  const clearCluster = useProjectListStore((s) => s.clearCluster);
  const revealId = useProjectListStore((s) => s.revealId);
  const facetView = useProjectListStore((s) => s.facetView);
  const facet = useMemo(
    () => ({ view: facetView, palette: facetPalette(projects, facetView) }),
    [projects, facetView],
  );
  const clearReveal = useProjectListStore((s) => s.clearReveal);

  const search = useProjectListSearch(projects, semanticEnabled);
  const filteredProjects = search.results;
  const searching = !!search.query.trim();

  const headline = useMemo(() => {
    if (filteredProjects.length === 0) {
      return locale === "de"
        ? "Keine passenden Projekte – probiere weniger Suchwörter oder Filter."
        : "No matching projects — try fewer search words or filters.";
    }
    if (searching)
      return locale === "de"
        ? `${filteredProjects.length} Projekte passen zu deiner Suche.`
        : `${filteredProjects.length} projects match your search.`;
    if (cluster)
      return locale === "de"
        ? `${filteredProjects.length} Projekte im Cluster „${cluster.label}“.`
        : `${filteredProjects.length} projects in the “${cluster.label}” cluster.`;
    const activePresetId = findActivePreset(normalizeFilters(filterParams));
    if (activePresetId) {
      return localizePreset(CV_PRESETS[activePresetId], locale).headline;
    }
    return locale === "de"
      ? `${filteredProjects.length} Projekte passen zu deinem Filter.`
      : `${filteredProjects.length} projects matching your filter.`;
  }, [filteredProjects.length, filterParams, locale, searching, cluster]);

  const featuredProjects = searching
    ? filteredProjects
    : filteredProjects.slice(0, SLICE_DEFAULT);
  const otherProjects = searching ? [] : filteredProjects.slice(SLICE_DEFAULT);
  const hasOtherProjects = otherProjects.length > 0;

  const [expanded, setExpanded] = useState(false);
  if (expanded && !hasOtherProjects) setExpanded(false);
  if (!expanded && otherProjects.some((project) => project.id === revealId))
    setExpanded(true);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!revealId) return;
    list.current
      ?.querySelector(`[data-project-search-result="${CSS.escape(revealId)}"]`)
      ?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "center",
      });
    clearReveal();
  }, [revealId, clearReveal]);
  useEffect(() => () => setHovered(null), [setHovered]);
  useProjectsInView(
    list,
    (expanded ? filteredProjects : featuredProjects)
      .map((project) => project.id)
      .join(),
  );

  return (
    <>
      <Suspense fallback={null}>
        <FiltersUrlSync />
      </Suspense>
      <ProjectDetailDialog projects={projects} />
      <div>
        <ProjectListSearch search={search} />
        <div className="mb-8">
          <FilterSqlConsole
            filterParams={filterParams}
            projects={projects}
            resultsCount={filteredProjects.length}
          />
        </div>
        <div className="mb-12 space-y-5">
          {cluster && (
            <button
              type="button"
              data-project-cluster-clear
              onClick={clearCluster}
              className="inline-flex min-h-11 items-center gap-2 border border-white/30 bg-black/60 px-3 text-xs text-neutral-200 transition hover:border-white hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              Cluster: {cluster.label}
              <X aria-hidden="true" size={14} strokeWidth={1.5} />
              <span className="sr-only">
                {locale === "de"
                  ? "Cluster-Filter entfernen"
                  : "Clear cluster filter"}
              </span>
            </button>
          )}
          <h2 className="text-xl font-medium leading-snug text-white">
            {headline}
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-neutral-400">
            {locale === "de"
              ? "Entdecke ausgewählte Projekte mit durchdachter Gestaltung und technischer Tiefe. Mit den Analysewerkzeugen kannst du Projekte filtern, vergleichen und die Zusammenarbeit, Technologien und Ergebnisse dahinter erkunden."
              : "Explore a curated collection of recent projects, each showcasing thoughtful design and technical depth. Use the analysis tools to filter, compare, and discover the collaborations, technologies, and results that drive real impact."}
          </p>
        </div>
        <div ref={list} className="space-y-6">
          {featuredProjects.map((project) => (
            <ProjectCardWithHover
              key={project.id}
              project={project}
              facet={facet}
              onHoverChange={(hovered) =>
                setHovered(hovered ? project.id : null)
              }
            />
          ))}
          {hasOtherProjects && (
            <ProjectCollapse
              expanded={expanded}
              onExpand={() => setExpanded(true)}
            >
              {otherProjects.map((project) => (
                <ProjectCardWithHover
                  key={project.id}
                  project={project}
                  facet={facet}
                  onHoverChange={(hovered) =>
                    setHovered(hovered ? project.id : null)
                  }
                />
              ))}
            </ProjectCollapse>
          )}
        </div>
      </div>
    </>
  );
}

const ProjectCardWithHover = ({
  project,
  facet,
  onHoverChange,
}: {
  project: CvProject;
  facet: ProjectFacet;
  onHoverChange: (hovered: boolean) => void;
}) => (
  <div
    data-project-search-result={project.id}
    onPointerEnter={() => onHoverChange(true)}
    onPointerLeave={() => onHoverChange(false)}
  >
    <ProjectCard project={project} facet={facet} />
  </div>
);
