"use client";

import { useId, useMemo, useState } from "react";
import { useLocale } from "../../../i18n/LocaleProvider";
import { useFiltersStore } from "../filtersStore";
import clsx from "clsx";
import { caseLabel } from "@homepage/content/projectCase";
import {
  sectorLabel,
  projectDeliveryModels,
} from "@homepage/content/projectTaxonomy";
import { CvProject } from "@homepage/content/models";
import { FilterParams, filterProjects } from "./utils";
import {
  CV_PRESETS,
  localizePreset,
  CV_PRESET_ORDER,
  CvPreset,
  findActivePreset,
  normalizeFilters,
  NormalizedFilters,
} from "../../cvPresets";

const ARRAY_COLUMNS: (keyof FilterParams)[] = [
  "industries",
  "productTypes",
  "targetMarket",
  "usageContext",
  "deliveryModel",
  "deliveryModels",
  "capabilities",
  "methods",
  "tools",
  "languages",
  "buyerNeeds",
  "stages",
  "domains",
  "aiCapabilities",
  "aiUsage",
];

type CliFilterKey =
  | "capabilities"
  | "methods"
  | "industries"
  | "projectType"
  | "tools"
  | "languages"
  | "featured"
  | "productTypes"
  | "targetMarket"
  | "usageContext"
  | "deliveryModel"
  | "domains";

type CliFilterOption = {
  value: string;
  count: number;
};

type CliFilterGroup = {
  key: CliFilterKey;
  label: string;
  options: CliFilterOption[];
};

const CLI_FILTER_GROUPS: Pick<CliFilterGroup, "key" | "label">[] = [
  { key: "methods", label: "Methods" },
  { key: "domains", label: "Use cases" },
  { key: "productTypes", label: "Product formats" },
  { key: "targetMarket", label: "Customer market" },
  { key: "usageContext", label: "Usage context" },
  { key: "deliveryModel", label: "Delivery & operation" },
  {
    key: "featured",
    label: "Featured",
  },
  {
    key: "capabilities",
    label: "Capabilities",
  },
  {
    key: "industries",
    label: "Industries",
  },
  {
    key: "projectType",
    label: "Project types",
  },
  {
    key: "tools",
    label: "Tools",
  },
  {
    key: "languages",
    label: "Languages",
  },
];

const GROUP_LABELS_DE: Record<CliFilterKey, string> = {
  domains: "Anwendungsfälle",
  productTypes: "Produktformate",
  targetMarket: "Zielmarkt",
  usageContext: "Nutzungskontext",
  deliveryModel: "Bereitstellung & Betrieb",
  featured: "Ausgewählt",
  capabilities: "Kompetenzen",
  methods: "Methoden",
  industries: "Branchen",
  projectType: "Projekttypen",
  tools: "Tools",
  languages: "Sprachen",
};

const EXTRA_FILTER_LABELS: Record<string, [string, string]> = {
  deliveryModels: ["Delivery & operation", "Bereitstellung & Betrieb"],
  id: ["Project", "Projekt"],
  buyerNeeds: ["Buyer need", "Bedarf"],
  stages: ["Delivery stage", "Umsetzungsstand"],
  domains: ["Use case", "Anwendungsfall"],
  aiCapabilities: ["AI capability", "KI-Funktion"],
  aiUsage: ["AI use", "KI-Einsatz"],
  ownership: ["Contribution", "Verantwortung"],
  maintenance: ["Engagement", "Zusammenarbeit"],
  workplace: ["Workplace", "Arbeitsort"],
};

const CLI_FILTER_LABEL_LOOKUP = Object.fromEntries(
  CLI_FILTER_GROUPS.map(({ key, label }) => [key, label]),
) as Record<CliFilterKey, string>;

export const FilterSqlConsole = ({
  filterParams,
  projects,
}: {
  filterParams: FilterParams;
  projects: CvProject[];
}) => {
  const locale = useLocale();
  const de = locale === "de";
  const setFilters = useFiltersStore((s) => s.setFilters);
  const resetFilters = useFiltersStore((s) => s.reset);
  const [searchQuery, setSearchQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const panelId = useId();

  const normalizedFilters = useMemo(
    () => normalizeFilters(filterParams),
    [filterParams],
  );

  const sqlStatement = useMemo(
    () => buildSqlStatement(normalizedFilters),
    [normalizedFilters],
  );

  const cliFilterGroups = useMemo(
    () =>
      buildCliFilterGroups(projects).map((group) => ({
        ...group,
        label: de ? GROUP_LABELS_DE[group.key] : group.label,
      })),
    [projects, de],
  );

  const resultsCount = useMemo(
    () => filterProjects(projects, filterParams).length,
    [projects, filterParams],
  );

  const handleToggleValue = (key: CliFilterKey, optionValue: string) => {
    const nextFilters: NormalizedFilters = Object.fromEntries(
      Object.entries(normalizedFilters).map(([currentKey, values]) => [
        currentKey,
        [...values],
      ]),
    );

    const currentValues = nextFilters[key] ?? [];
    const isSelected = currentValues.includes(optionValue);

    if (isSelected) {
      nextFilters[key] = currentValues.filter((value) => value !== optionValue);
      if (!nextFilters[key]?.length) {
        delete nextFilters[key];
      }
    } else {
      nextFilters[key] = Array.from(
        new Set([...currentValues, optionValue]),
      ).sort((a, b) => a.localeCompare(b));
    }

    setFilters(nextFilters as FilterParams);
  };

  const handleApplyPreset = (preset: CvPreset) => {
    setFilters(preset.filter);
  };

  const activePresetId = useMemo(
    () => findActivePreset(normalizedFilters),
    [normalizedFilters],
  );

  const activeFilters = useMemo(() => {
    return Object.entries(normalizedFilters).flatMap(([key, values]) =>
      values.map((value) => ({
        key,
        label:
          (de
            ? GROUP_LABELS_DE[key as CliFilterKey]
            : CLI_FILTER_LABEL_LOOKUP[key as CliFilterKey]) ??
          EXTRA_FILTER_LABELS[key]?.[de ? 1 : 0] ??
          key.replace(/([a-z0-9])([A-Z])/g, "$1 $2"),
        value,
        displayValue:
          key === "id"
            ? (projects.find((project) => project.id === value)?.name ??
              (de ? "Ausgewähltes Projekt" : "Selected project"))
            : key === "featured"
              ? value === "true"
                ? de
                  ? "Ja"
                  : "Yes"
                : de
                  ? "Nein"
                  : "No"
              : key === "industries"
                ? sectorLabel(value, locale)
                : caseLabel(value, locale),
      })),
    );
  }, [normalizedFilters, de, locale, projects]);

  const loweredQuery = searchQuery.toLowerCase();

  return (
    <div className="glass-panel border border-white/20 p-5">
      <div className="flex flex-wrap items-center gap-2">
        {CV_PRESET_ORDER.map((id) => {
          const preset = localizePreset(CV_PRESETS[id], locale);
          const isActive = activePresetId === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              aria-pressed={isActive}
              title={preset.description}
              className={clsx(
                "border px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] transition",
                isActive
                  ? "border-white bg-white/10 text-white"
                  : "border-white/30 bg-black text-neutral-200 hover:border-white hover:text-white",
              )}
            >
              {preset.label}
            </button>
          );
        })}
        <button
          type="button"
          className="inline-flex items-center gap-2 border border-white/30 bg-black px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-neutral-200 transition hover:border-white hover:text-white"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          aria-controls={panelId}
        >
          {isExpanded ? (de ? "Schließen" : "Close") : "Filter"}
          {!!activeFilters.length && <span>({activeFilters.length})</span>}
          <span
            className={clsx(
              "transition-transform",
              isExpanded ? "rotate-180" : "rotate-0",
            )}
            aria-hidden="true"
          >
            ▾
          </span>
        </button>
      </div>
      <span
        className="sr-only"
        role="status"
        aria-label={de ? "Projektergebnisse" : "Project results"}
      >
        {resultsCount} {de ? "Ergebnisse" : "results"}
      </span>
      {activePresetId === null && (
        <div
          className="filter-active-summary mt-4 flex flex-wrap items-center gap-2 border-t border-white/20 pt-4 text-xs text-neutral-300"
          role="region"
          aria-label={de ? "Aktive Filter" : "Active filters"}
        >
          <span className="text-[0.65rem] uppercase tracking-[0.2em] text-neutral-400">
            {activeFilters.length
              ? de
                ? "Aktive Filter"
                : "Active filters"
              : de
                ? "Alle Projekte"
                : "All projects"}
          </span>
          {activeFilters.map(({ key, label, value, displayValue }) => (
            <button
              key={`${key}-${value}`}
              type="button"
              aria-label={`${de ? "Entfernen" : "Remove"} ${label}: ${displayValue}`}
              className="inline-flex min-h-11 max-w-full items-center gap-2 border border-white/40 bg-white/5 px-3 py-1.5 text-left text-xs text-neutral-100 transition hover:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              onClick={() => {
                const next = { ...filterParams };
                const filterKey = key as keyof FilterParams;
                const remaining = next[filterKey]?.filter(
                  (item) => item !== value,
                );
                if (remaining?.length) next[filterKey] = remaining;
                else delete next[filterKey];
                setFilters(next);
              }}
            >
              <span className="min-w-0 break-words">
                {label}: <span className="text-white">{displayValue}</span>
              </span>
              <span aria-hidden="true">×</span>
            </button>
          ))}
          <span className="whitespace-nowrap text-[0.65rem] text-neutral-400">
            {resultsCount} {de ? "Ergebnisse" : "results"}
          </span>
          {!!activeFilters.length && (
            <button
              type="button"
              data-clear-filters
              onClick={resetFilters}
              className="min-h-11 px-2 text-xs text-neutral-300 underline underline-offset-4 hover:text-white"
            >
              {de ? "Alle Filter löschen" : "Clear all filters"}
            </button>
          )}
        </div>
      )}
      <div
        id={panelId}
        className={clsx(
          "mt-3 border-t border-white/20 pt-3",
          !isExpanded && "hidden",
        )}
        aria-hidden={!isExpanded}
      >
        {isExpanded && (
          <>
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xs uppercase tracking-[0.2em] text-neutral-300">
                {de ? "Projekte filtern" : "Project query console"}
              </h3>
              <div className="flex items-center gap-2">
                <span className="bg-black px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-neutral-200">
                  {resultsCount} {de ? "Ergebnisse" : "results"}
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 border border-white/30 bg-black px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-neutral-200 transition hover:border-white hover:text-white"
                  onClick={() => {
                    resetFilters();
                  }}
                >
                  {de ? "Filter zurücksetzen" : "Reset filters"}
                </button>
              </div>
            </div>
            <div className="glass-panel mt-4 border border-white/20 p-4 text-[0.8rem] leading-relaxed text-neutral-100">
              <span className="mr-2 text-neutral-500">&gt;</span>
              <pre className="inline whitespace-pre-wrap break-words text-neutral-100">
                {sqlStatement}
              </pre>
            </div>
            <label className="block text-[0.65rem] uppercase tracking-[0.2em] text-neutral-400">
              {de ? "Datensatz durchsuchen" : "Search dataset"}
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={de ? "Filterwerte …" : "Filter values..."}
                className="mt-2 w-full border border-white/20 bg-black px-3 py-2 text-sm text-neutral-100 outline-none transition focus:border-white"
              />
            </label>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {cliFilterGroups.map(({ key, label, options }) => {
                const activeValues = new Set(normalizedFilters[key] ?? []);
                const filteredOptions = options.filter((option) => {
                  if (!loweredQuery) {
                    return true;
                  }
                  if (activeValues.has(option.value)) {
                    return true;
                  }
                  const label =
                    key === "industries"
                      ? sectorLabel(option.value, locale)
                      : caseLabel(option.value, locale);
                  return [option.value, label].some((value) =>
                    value.toLowerCase().includes(loweredQuery),
                  );
                });

                return (
                  <div
                    key={key}
                    className="glass-panel border border-white/20 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between text-[0.7rem] uppercase tracking-[0.3em] text-neutral-300">
                      <span>{label}</span>
                      <span className="text-neutral-500">
                        {activeValues.size > 0
                          ? `${activeValues.size} ${de ? "ausgewählt" : "selected"}`
                          : "--"}
                      </span>
                    </div>
                    {filteredOptions.length ? (
                      <ul className="flex max-h-48 flex-col gap-2 overflow-y-auto pr-1">
                        {filteredOptions.map((option) => {
                          const isSelected = activeValues.has(option.value);
                          return (
                            <li key={`${key}-${option.value}`}>
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleValue(key, option.value)
                                }
                                className={clsx(
                                  "flex w-full items-center justify-between border px-3 py-2 text-sm transition",
                                  "border-white/20 bg-black text-neutral-100 hover:border-white",
                                  isSelected &&
                                    "border-white bg-white/10 text-white",
                                )}
                                aria-pressed={isSelected}
                              >
                                <span className="flex items-center gap-2">
                                  <span className="text-neutral-200">
                                    {isSelected ? "▣" : "▢"}
                                  </span>
                                  <span className="whitespace-normal break-words text-left">
                                    {key === "industries"
                                      ? sectorLabel(option.value, locale)
                                      : caseLabel(option.value, locale)}
                                  </span>
                                </span>
                                <span className="text-[0.65rem] text-neutral-500">
                                  {option.count}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-[0.7rem] text-neutral-500">
                        {de ? "Keine Treffer" : "No matches"}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const buildSqlStatement = (filters: NormalizedFilters) => {
  const entries = Object.entries(filters).filter(([, values]) => values.length);

  if (!entries.length) {
    return "SELECT *\nFROM projects;";
  }

  const whereClauses = entries.map(([key, values]) => {
    const column = formatColumnName(key);
    const formattedValues = values.map(formatSqlValue);
    const isArrayColumn = ARRAY_COLUMNS.includes(key as keyof FilterParams);

    if (isArrayColumn) {
      return `${column} && ARRAY[${formattedValues.join(", ")}]`;
    }

    if (formattedValues.length === 1) {
      return `${column} = ${formattedValues[0]}`;
    }

    return `${column} IN (${formattedValues.join(", ")})`;
  });

  return `SELECT *\nFROM projects\nWHERE ${whereClauses.join("\n  AND ")};`;
};

const buildCliFilterGroups = (projects: CvProject[]): CliFilterGroup[] => {
  return CLI_FILTER_GROUPS.map(({ key, label }) => ({
    key,
    label,
    options: buildOptionsForKey(projects, key),
  })).filter((group) => group.options.length > 0);
};

const buildOptionsForKey = (
  projects: CvProject[],
  key: CliFilterKey,
): CliFilterOption[] => {
  const counts = new Map<string, number>();

  projects.forEach((project) => {
    const value =
      key === "domains"
        ? project.matching?.domains
        : key === "deliveryModel"
          ? projectDeliveryModels(project)
          : project[key];

    if (Array.isArray(value)) {
      [...new Set(value.filter(Boolean))].forEach((item) => {
        const normalized = item.trim();
        if (!normalized) {
          return;
        }
        counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
      });
      return;
    }

    if (typeof value === "boolean") {
      const normalized = value.toString();
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
      return;
    }

    if (typeof value === "string" && value.trim()) {
      const normalized = value.trim();
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  });

  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => {
      if (b.count === a.count) {
        return a.value.localeCompare(b.value);
      }
      return b.count - a.count;
    });
};

const formatColumnName = (column: string) => {
  return column
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/\s+/g, "_")
    .toLowerCase();
};

const formatSqlValue = (value: string) => {
  const lower = value.toLowerCase();
  if (lower === "true" || lower === "false") {
    return lower.toUpperCase();
  }
  const escaped = value.replace(/'/g, "''");
  return `'${escaped}'`;
};
