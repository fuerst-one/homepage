"use client";

import { useLocale } from "../../i18n/LocaleProvider";
import { useId, useMemo } from "react";
import { CvProject } from "@homepage/content/models";
import {
  publishedResultProjects,
  useProjectListStore,
} from "./projectListStore";
import { getFilterOptionCounts, type FacetKey } from "./Filter/utils";
import { chartTypeFor, filterConfigs } from "./filterConfigs";
import { FilterConfig } from "./Filter/types";
import { BarChartFilter } from "./Filter/BarChartFilter";
import { PieChartFilter } from "./Filter/PieChartFilter";
import { TreemapFilter } from "./Filter/TreemapFilter";
import { facetPalette, type FacetPalette } from "./facetColors";

export const ProjectAnalysisTabs = ({
  projects,
}: {
  projects: CvProject[];
}) => {
  const locale = useLocale();
  const activeTab = useProjectListStore((s) => s.facetView);
  const setActiveTab = useProjectListStore((s) => s.setFacetView);
  const palette = useMemo(
    () => facetPalette(projects, activeTab),
    [projects, activeTab],
  );
  const filterParams = useProjectListStore((s) => s.filters);
  const resultIds = useProjectListStore((s) => s.resultIds);
  const filteredProjects = useMemo(
    () => publishedResultProjects(projects, resultIds, filterParams),
    [projects, resultIds, filterParams],
  );

  const selectorId = useId();
  const panelId = `${selectorId}-panel`;
  const tabs = filterConfigs.map((c) => ({
    id: c.projectKey,
    label: locale === "de" ? c.labelDe : c.label,
  }));

  return (
    <div>
      <div className="glass-panel flex items-center border border-white/30 pr-3">
        <label
          htmlFor={selectorId}
          className="shrink-0 pl-3 text-[0.6rem] uppercase tracking-[0.2em] text-neutral-400"
        >
          {locale === "de" ? "Ansicht" : "View"}
        </label>
        <select
          id={selectorId}
          value={activeTab}
          aria-controls={panelId}
          onChange={(event) => setActiveTab(event.target.value as FacetKey)}
          className="min-h-11 min-w-0 flex-1 bg-transparent px-3 py-2 text-xs text-white outline-none [color-scheme:dark] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white"
        >
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.id} className="bg-neutral-950">
              {tab.label}
            </option>
          ))}
        </select>
      </div>
      <div
        role="region"
        id={panelId}
        aria-label={`${locale === "de" ? "Projektanalyse" : "Project analysis"}: ${tabs.find((tab) => tab.id === activeTab)?.label}`}
        className="glass-panel relative -mt-px h-[30vh] w-full overflow-hidden border border-white/30"
      >
        <ChartTabContent
          filterConfig={getFilterConfig(activeTab)}
          projects={filteredProjects}
          palette={palette}
        />
      </div>
    </div>
  );
};

const getFilterConfig = (projectKey: FacetKey): FilterConfig | null =>
  filterConfigs.find((c) => c.projectKey === projectKey) ?? null;

const ChartTabContent = ({
  filterConfig,
  projects,
  palette,
}: {
  filterConfig: FilterConfig | null;
  projects: CvProject[];
  palette: FacetPalette;
}) => {
  const locale = useLocale();
  if (!filterConfig) return null;

  const hasValues =
    getFilterOptionCounts(projects, filterConfig.projectKey).length > 0;
  if (!projects.length || !hasValues) {
    return (
      <div
        className="flex h-full w-full items-center justify-center px-6 text-xs text-neutral-400"
        role="status"
      >
        {!projects.length
          ? locale === "de"
            ? "Keine passenden Projekte. Erweitere die Filter."
            : "No matching projects. Try broadening the filters."
          : filterConfig.projectKey === "methods"
            ? locale === "de"
              ? "Für diese Projekte sind keine Methoden erfasst."
              : "No methods recorded for these projects."
            : locale === "de"
              ? "Für diese Ansicht sind keine Werte erfasst."
              : "No values recorded for this view."}
      </div>
    );
  }

  const displayType = chartTypeFor(filterConfig, palette.values.size);
  return (
    <div className="h-full min-h-0 w-full p-2">
      {displayType === "bar" && (
        <BarChartFilter
          filterConfig={filterConfig}
          projects={projects}
          palette={palette}
        />
      )}
      {displayType === "pie" && (
        <PieChartFilter
          filterConfig={filterConfig}
          projects={projects}
          palette={palette}
        />
      )}
      {displayType === "treemap" && (
        <TreemapFilter
          filterConfig={filterConfig}
          projects={projects}
          palette={palette}
        />
      )}
    </div>
  );
};
