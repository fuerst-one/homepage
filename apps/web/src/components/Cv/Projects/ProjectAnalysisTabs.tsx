"use client";

import { useLocale } from "../../i18n/LocaleProvider";
import { useId, useMemo, useState } from "react";
import { CvProject } from "@homepage/content/models";
import { ProjectGraph3D } from "./ProjectGraph3D";
import { useProjectListStore } from "./projectListStore";
import { filterProjects, getFilterOptionCounts } from "./Filter/utils";
import { filterConfigs } from "./filterConfigs";
import { FilterConfig } from "./Filter/types";
import { BarChartFilter } from "./Filter/BarChartFilter";
import { PieChartFilter } from "./Filter/PieChartFilter";
import { TreemapFilter } from "./Filter/TreemapFilter";

const GRAPH_TAB_ID = "graph";

type TabId = typeof GRAPH_TAB_ID | string;

export const ProjectAnalysisTabs = ({
  projects,
}: {
  projects: CvProject[];
}) => {
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<TabId>(GRAPH_TAB_ID);
  const filterParams = useProjectListStore((s) => s.filters);
  const filteredProjects = useMemo(
    () => filterProjects(projects, filterParams),
    [projects, filterParams],
  );

  const selectorId = useId();
  const panelId = `${selectorId}-panel`;
  const tabs: { id: TabId; label: string }[] = [
    { id: GRAPH_TAB_ID, label: "3D Scatter" },
    ...filterConfigs.map((c) => ({
      id: c.projectKey,
      label:
        locale === "de"
          ? ((
              {
                clients: "Kunden",
                industries: "Branchen",
                capabilities: "Kompetenzen",
                methods: "Methoden",
                tools: "Tools",
                languages: "Sprachen",
                projectType: "Projekttyp",
                workplace: "Arbeitsort",
              } as Record<string, string>
            )[c.projectKey] ?? c.label)
          : c.label,
    })),
  ];

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
          onChange={(event) => setActiveTab(event.target.value)}
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
        {activeTab === GRAPH_TAB_ID ? (
          <ProjectGraph3D projects={projects} />
        ) : (
          <ChartTabContent
            filterConfig={getFilterConfig(activeTab)}
            projects={filteredProjects}
          />
        )}
      </div>
    </div>
  );
};

const getFilterConfig = (projectKey: string): FilterConfig | null =>
  filterConfigs.find((c) => c.projectKey === projectKey) ?? null;

const ChartTabContent = ({
  filterConfig,
  projects,
}: {
  filterConfig: FilterConfig | null;
  projects: CvProject[];
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

  const { displayType } = filterConfig;
  return (
    <div className="h-full min-h-0 w-full p-2">
      {displayType === "bar" && (
        <BarChartFilter filterConfig={filterConfig} projects={projects} />
      )}
      {displayType === "pie" && (
        <PieChartFilter filterConfig={filterConfig} projects={projects} />
      )}
      {displayType === "treemap" && (
        <TreemapFilter filterConfig={filterConfig} projects={projects} />
      )}
    </div>
  );
};
