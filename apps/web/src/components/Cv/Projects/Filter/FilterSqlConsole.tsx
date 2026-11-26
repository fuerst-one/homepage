"use client";

import { useId, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { useLocale } from "../../../i18n/LocaleProvider";
import { useProjectListStore } from "../projectListStore";
import { recordVisitorInteraction } from "../../../VisitorProfile/profileStore";
import clsx from "clsx";
import { CvProject } from "@homepage/content/models";
import {
  facetValueLabel,
  getScopedFilterOptionCounts,
  type FilterParams,
} from "./utils";
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
  | "buyerNeeds"
  | "ownership"
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
  { key: "buyerNeeds", label: "What do you need?" },
  { key: "ownership", label: "My contribution" },
  { key: "capabilities", label: "Expertise" },
  { key: "industries", label: "Industries" },
  { key: "methods", label: "Methods & principles" },
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
    key: "projectType",
    label: "Project setting",
  },
  {
    key: "tools",
    label: "Technologies",
  },
  {
    key: "languages",
    label: "Languages",
  },
];

const GROUP_LABELS_DE: Record<CliFilterKey, string> = {
  buyerNeeds: "Was brauchst du?",
  ownership: "Mein Beitrag",
  domains: "Anwendungsfälle",
  productTypes: "Produktformate",
  targetMarket: "Zielmarkt",
  usageContext: "Nutzungskontext",
  deliveryModel: "Bereitstellung & Betrieb",
  featured: "Ausgewählt",
  capabilities: "Expertise",
  methods: "Methoden & Prinzipien",
  industries: "Branchen",
  projectType: "Projektrahmen",
  tools: "Technologien",
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
  searchScope,
  resultsCount,
}: {
  filterParams: FilterParams;
  projects: CvProject[];
  searchScope: CvProject[];
  resultsCount: number;
}) => {
  const locale = useLocale();
  const de = locale === "de";
  const setFilters = useProjectListStore((s) => s.setFilters);
  const toggleFilter = useProjectListStore((s) => s.toggle);
  const resetFilters = useProjectListStore((s) => s.reset);
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
      buildCliFilterGroups(projects, searchScope, filterParams).map(
        (group) => ({
          ...group,
          label: de ? GROUP_LABELS_DE[group.key] : group.label,
        }),
      ),
    [projects, searchScope, filterParams, de],
  );

  const handleToggleValue = (key: CliFilterKey, optionValue: string) => {
    if (!normalizedFilters[key]?.includes(optionValue))
      recordVisitorInteraction("filter_selected", `${key}:${optionValue}`);
    toggleFilter(key, optionValue);
  };

  const handleApplyPreset = (preset: CvPreset) => {
    for (const [key, values] of Object.entries(preset.filter))
      for (const value of values ?? [])
        recordVisitorInteraction("filter_selected", `${key}:${value}`);
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
              : facetValueLabel(key as CliFilterKey, value, locale),
      })),
    );
  }, [normalizedFilters, de, locale, projects]);

  const hiddenFilterCount = activePresetId === null ? activeFilters.length : 0;

  const loweredQuery = searchQuery.toLowerCase();
  const optionLabel = (key: CliFilterKey, value: string) =>
    key === "featured"
      ? value === "true"
        ? de
          ? "Ja"
          : "Yes"
        : de
          ? "Nein"
          : "No"
      : facetValueLabel(key, value, locale);
  const renderGroup = ({ key, label, options }: CliFilterGroup) => {
    const activeValues = new Set(normalizedFilters[key] ?? []);
    const maxCount = Math.max(1, ...options.map((option) => option.count));
    const filteredOptions = options.filter(
      (option) =>
        !loweredQuery ||
        activeValues.has(option.value) ||
        [option.value, optionLabel(key, option.value)].some((value) =>
          value.toLowerCase().includes(loweredQuery),
        ),
    );
    const optionList = filteredOptions.length ? (
      <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto pr-1">
        {filteredOptions.map((option) => {
          const isSelected = activeValues.has(option.value);
          return (
            <li key={option.value}>
              <button
                type="button"
                onClick={() => handleToggleValue(key, option.value)}
                disabled={option.count === 0 && !isSelected}
                aria-pressed={isSelected}
                className={clsx(
                  "flex min-h-11 w-full items-stretch overflow-hidden border bg-black text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                  isSelected
                    ? "border-primary text-primary"
                    : "border-white/20 text-neutral-100 hover:border-white",
                  option.count === 0 &&
                    !isSelected &&
                    "cursor-not-allowed opacity-40 hover:border-white/20",
                )}
              >
                <span className="relative flex min-w-0 flex-1 items-center px-3 py-2 text-left">
                  <span
                    aria-hidden="true"
                    className="filter-count-fill absolute inset-y-0 left-0"
                    style={{ width: `${(option.count / maxCount) * 100}%` }}
                  />
                  <span className="relative break-words">
                    {optionLabel(key, option.value)}
                  </span>
                </span>
                <span
                  className={clsx(
                    "flex min-w-11 shrink-0 items-center justify-center border-l px-2 text-xs tabular-nums",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-white/20 bg-black text-neutral-400",
                  )}
                >
                  {isSelected ? (
                    <Check size={18} strokeWidth={2.5} aria-hidden="true" />
                  ) : (
                    option.count
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    ) : (
      <p className="text-xs text-neutral-400">
        {de ? "Keine passenden Werte" : "No matching values"}
      </p>
    );
    return (
      <fieldset
        key={key}
        className="glass-panel mb-3 min-w-0 break-inside-avoid border border-white/20 p-3"
      >
        <legend className="px-1 text-[0.7rem] uppercase tracking-[0.2em] text-neutral-200">
          {label}
        </legend>
        {activeValues.size > 0 && (
          <p className="mb-2 text-[0.65rem] text-neutral-400">
            {activeValues.size} {de ? "ausgewählt" : "selected"}
          </p>
        )}
        {optionList}
      </fieldset>
    );
  };

  return (
    <div className="glass-panel border border-white/20 p-5">
      <div className="project-filter-toolbar">
        <div className="project-filter-toolbar-layout" data-locale={locale}>
          <div className="flex flex-wrap gap-2">
            {CV_PRESET_ORDER.map((id) => {
              const preset = localizePreset(CV_PRESETS[id], locale);
              const isActive = activePresetId === id;
              return (
                <button
                  key={id}
                  type="button"
                  data-project-preset={id}
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
          </div>
          <button
            type="button"
            className="project-filter-more inline-flex items-center justify-center gap-2 border border-dashed border-white/30 bg-black px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-neutral-200 transition hover:border-white hover:text-white"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            aria-controls={panelId}
          >
            {isExpanded
              ? de
                ? "Weniger Filter"
                : "Fewer filters"
              : de
                ? "Weitere Filter"
                : "More filters"}
            {!!hiddenFilterCount && <span>({hiddenFilterCount})</span>}
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
          "mt-5 border-t border-white/20 pt-4",
          !isExpanded && "hidden",
        )}
        aria-hidden={!isExpanded}
      >
        {isExpanded && (
          <>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-xs uppercase tracking-[0.2em] text-neutral-200">
                {de ? "Projekte eingrenzen" : "Narrow the projects"}
              </h3>
              <span className="text-xs text-neutral-400">
                {resultsCount} {de ? "Ergebnisse" : "results"}
              </span>
            </div>
            <p className="mb-3 text-xs leading-relaxed text-neutral-400">
              {de
                ? "Eine Auswahl öffnet das gesamte Portfolio. Die Zahlen berücksichtigen Suche und andere Filter."
                : "Choose a filter to browse the full portfolio. Counts reflect your search and other filters."}
            </p>
            <label className="block text-xs text-neutral-300">
              {de ? "Filterwerte finden" : "Find a filter value"}
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={de ? "Filterwerte …" : "Filter values..."}
                className="mt-2 min-h-11 w-full border border-white/20 bg-black px-3 py-2 text-sm text-neutral-100 outline-none transition focus:border-white"
              />
            </label>
            <div className="mt-4 columns-1 gap-3 md:columns-2">
              {cliFilterGroups.map(renderGroup)}
            </div>
            <details className="mt-4 text-xs text-neutral-400">
              <summary className="min-h-11 cursor-pointer py-3 hover:text-white">
                {de ? "Filterabfrage anzeigen" : "Show filter query"}
              </summary>
              <pre className="glass-panel whitespace-pre-wrap break-words border border-white/20 p-4 text-neutral-200">
                {sqlStatement}
              </pre>
            </details>
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

const buildCliFilterGroups = (
  projects: CvProject[],
  searchScope: CvProject[],
  filters: FilterParams,
): CliFilterGroup[] => {
  return CLI_FILTER_GROUPS.map(({ key, label }) => ({
    key,
    label,
    options: getScopedFilterOptionCounts(
      projects,
      searchScope,
      filters,
      key,
    ).map(({ itemKey, count }) => ({ value: itemKey, count })),
  })).filter((group) => group.options.length > 0);
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
