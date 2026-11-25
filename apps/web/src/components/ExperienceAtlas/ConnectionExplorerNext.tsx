"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, RotateCcw, Link as LinkIcon } from "lucide-react";
import Link from "../i18n/LocalizedLink";
import { PageEyebrow } from "../PageEyebrow";
import { Button } from "../Button";
import { enquiryPath } from "@homepage/content/enquiry";
import type { AtlasProject } from "./model";
import type { SemanticDataset } from "./spaceTypes";
import { atlasText, atlasTerm } from "./atlasCopy";
import { SpaceBoundary } from "./SpaceBoundary";
import { GraphLoadingOverlay } from "./GraphLoadingOverlay";
import { ConnectionAnalysisPanel } from "./ConnectionAnalysisPanel";
import { useConnectionAnalysis } from "./useConnectionAnalysis";
import { useReducedMotion } from "./useReducedMotion";
import { useScaleSpace } from "./useScaleSpace";
import { ScaleSpaceControls } from "./ScaleSpaceControls";
import { SCALE_FIELDS, SPACE_LENSES } from "./scaleSpace";
import { projectLensFacts } from "./projectLensFacts";
import {
  recordVisitorInteraction,
  useVisitorProfileStore,
} from "../VisitorProfile/profileStore";
import {
  carryExplorerSelection,
  useExplorerProfileStay,
} from "../VisitorProfile/useProfileArrivals";
import {
  CONNECTION_FIELDS,
  DEFAULT_CONNECTION_WEIGHTS,
  redistributeConnectionWeight,
  type ConnectionWeights,
} from "./connectionGraph";
import {
  connectionFocus,
  PERSPECTIVE_TRAITS,
  readConnectionNavigation,
  writeConnectionNavigation,
  type ConnectionLens,
  type ConnectionNavigation,
  type FocusMode,
} from "./connectionExplorerState";
import {
  buildExplorerGraph,
  CONNECTION_CONTRAST,
} from "./connectionComparison";
import "./experience-atlas.css";
import "./semantic-space.css";
import "./explore-site.css";
import "./connection-workbench.css";
import "./connection-explorer-next.css";

const Graph3D = dynamic(() => import("./ConnectionExplorerGraph3D"), {
  ssr: false,
  loading: () => (
    <div className="cg-loading" role="status">
      Loading explorer…
    </div>
  ),
});
const CONTRAST = CONNECTION_CONTRAST;

export function ConnectionExplorerNext({
  projects,
  semanticData,
  locale,
  variant = "page",
}: {
  projects: AtlasProject[];
  semanticData: SemanticDataset;
  locale: "en" | "de";
  variant?: "page" | "embedded";
}) {
  const de = locale === "de";
  const t = (s: string) => atlasText(locale, s);
  const embedded = variant === "embedded";
  const query = useSearchParams();
  const state = useMemo(
    () => readConnectionNavigation(query, projects),
    [query, projects],
  );
  // Keep scoring inputs stable when only selection, labels or camera controls change.
  const rawWeights = query.get("weights");
  const weights = useMemo(
    () =>
      readConnectionNavigation(
        new URLSearchParams(rawWeights === null ? {} : { weights: rawWeights }),
        projects,
      ).weights,
    [rawWeights, projects],
  );
  const disabledKey = state.disabled.join(",");
  const disabled = useMemo(
    () => new Set(disabledKey ? disabledKey.split(",") : []),
    [disabledKey],
  );
  const fieldsKey = state.fields.join(",");
  const fields = useMemo(
    () =>
      SCALE_FIELDS.filter((f) => fieldsKey.split(",").includes(f.id)).map(
        (f) => f.id,
      ),
    [fieldsKey],
  );
  const { lens, model, project: selectedId, mode, sector } = state;
  const scaleProjects = useMemo(
    () => projects.filter((p) => !sector || p.industries.includes(sector)),
    [projects, sector],
  );
  const scale = useScaleSpace(scaleProjects, fields);
  const space =
    lens === "manual"
      ? undefined
      : lens === "scale"
        ? scale.result?.space
        : semanticData.spaces[lens];
  const graph = useMemo(
    () =>
      buildExplorerGraph(
        projects,
        space,
        lens,
        model,
        weights,
        fields,
        disabled,
      ),
    [projects, weights, disabled, lens, space, model, fields],
  );
  const traitWeights = useMemo(
    () => (lens === "manual" ? weights : PERSPECTIVE_TRAITS[lens]),
    [lens, weights],
  );
  const nodes = useMemo(
    () =>
      projects.map(({ id, label, presentation }) => ({
        id,
        label,
        accentColor: presentation?.accentColor ?? null,
      })),
    [projects],
  );
  const input = useMemo(
    () => ({
      ids: graph.ids,
      links: graph.links,
      weights,
      contrast: CONTRAST,
      traitWeights,
    }),
    [graph, weights, traitWeights],
  );
  const analysis = useConnectionAnalysis(input);
  const groups = analysis.pending ? undefined : analysis.result?.groups;
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const activeGroup = selectedId
    ? undefined
    : groups?.find((g) => g.id === selectedGroup);
  const focus = useMemo(
    () => connectionFocus(selectedId, mode, graph.links, groups ?? []),
    [selectedId, mode, graph.links, groups],
  );
  const highlighted = activeGroup?.ids ?? focus.highlighted;
  const focusedLinks = useMemo(
    () =>
      !highlighted.length
        ? null
        : graph.links
            .filter(
              (e) =>
                highlighted.includes(e.source) &&
                highlighted.includes(e.target),
            )
            .map((e) => e.id),
    [graph.links, highlighted],
  );
  const [resetView, setResetView] = useState(0);
  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const reducedMotion = useReducedMotion();
  const inspector = useRef<HTMLElement>(null);
  const moveFocus = useRef(false);
  useExplorerProfileStay(selectedId);
  const selected = projects.find((p) => p.id === selectedId);
  const byId = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  );
  const neighbours = graph.candidates.filter(
    (e) => e.source === selectedId || e.target === selectedId,
  );
  const visibleNeighbours =
    mode === "all"
      ? neighbours
      : neighbours.filter((e) =>
          focus.neighbours.includes(
            e.source === selectedId ? e.target : e.source,
          ),
        );
  const fieldLabels: Record<string, string> = {
    needs: de ? "Kundenbedarf" : "Client needs",
    product: t("Product formats"),
    industry: t("Sector"),
    capabilities: t("Expertise"),
    tools: t("Technologies"),
    methods: t("Methods & principles"),
    languages: t("Languages"),
    domains: t("Use cases"),
    ownership: t("Ownership"),
    setting: t("Project setting"),
    pattern: t("Working pattern"),
    team: t("Team size"),
    measurements: de ? "Messwerte" : "Measurements",
    complexity: t("Complexity"),
    effort: t("Rebuild effort"),
    code: t("Codebase size"),
  };
  const navigate = (change: Partial<ConnectionNavigation>, replace = false) => {
    const current = new URL(window.location.href);
    const next = writeConnectionNavigation(current, {
      ...readConnectionNavigation(current.searchParams, projects),
      ...change,
    });
    window.history[replace ? "replaceState" : "pushState"](null, "", next);
    setShareStatus("");
  };
  const select = (id: string, focusDetails = true) => {
    if (id) carryExplorerSelection(id);
    setSelectedGroup(null);
    setInspectionOpen(Boolean(id));
    moveFocus.current = focusDetails;
    navigate({ project: id });
  };
  useEffect(() => {
    if (moveFocus.current) {
      inspector.current?.focus({ preventScroll: true });
      inspector.current?.scrollIntoView({ block: "nearest" });
      moveFocus.current = false;
    }
  }, [selectedId]);
  useEffect(() => setSelectedGroup(null), [lens, model, sector, fieldsKey]);
  const chooseLens = (next: ConnectionLens) => {
    if (next !== lens && next !== "manual")
      recordVisitorInteraction(
        "explorer_lens_selected",
        next === "practice" ? "contribution" : next,
      );
    navigate({ lens: next });
  };
  const tabItems = [
    ...SPACE_LENSES.map((item) => ({
      id: item.id,
      label: t(item.label),
      question: t(item.question),
    })),
    {
      id: "manual" as const,
      label: de ? "Manuelle Gewichtung" : "Manual weights",
      question: de ? "Was soll stärker verbinden?" : "What should matter most?",
    },
  ];
  const definition = tabItems.find((item) => item.id === lens)!;
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const missing = projects.filter((p) => !graph.ids.includes(p.id));
  const facts =
    selected && lens !== "manual"
      ? projectLensFacts(selected, lens, locale, { scaleFields: fields })
      : [];
  const method =
    lens === "manual"
      ? de
        ? "Exakte gemeinsame Merkmale · 100 Punkte Budget."
        : "Exact shared attributes · 100-point budget."
      : de
        ? "Die Rangfolge der Ähnlichkeiten bleibt erhalten; Quadrieren schwächt Hintergrundähnlichkeit. Das Layout passt sich automatisch an: Dichte Nachbarschaften teilen sich ein Anziehungsbudget, und eine weiche Außengrenze hält Ausreißer in Reichweite. Die Grenze wächst mit der Projektanzahl. Positionen und Abstände sind keine exakten Ähnlichkeitswerte."
        : "Similarity rankings are preserved; squaring softens background similarity. Layout adapts automatically: dense neighborhoods share an attraction budget, and a soft outer boundary keeps outliers nearby. The boundary grows with project count. Positions and distances are not exact similarity measurements.";
  const medianStrength = graph.links.length
    ? (graph.links[Math.floor((graph.links.length - 1) / 2)].score +
        graph.links[Math.floor(graph.links.length / 2)].score) /
      2
    : 0;
  const selectCluster = (index: number) => {
    const group = groups?.[index];
    if (!group) return;
    setSelectedGroup(group.id);
    navigate({ project: "" });
    if (lens !== "manual")
      recordVisitorInteraction(
        "explorer_cluster_selected",
        lens === "practice" ? "contribution" : lens,
      );
    const catalog = useVisitorProfileStore.getState().catalog;
    for (const trait of group.traits
      .filter((v) => v.count >= 2 && v.count / group.ids.length >= 0.5)
      .slice(0, 2)) {
      const term = catalog?.terms.find((v) => v.value === trait.value);
      if (term) recordVisitorInteraction("explorer_term_selected", term.id);
    }
    const card = document.getElementById(`cg-cluster-${index}`);
    card?.scrollIntoView({ block: "nearest" });
    card?.focus({ preventScroll: true });
  };
  return (
    <div
      className={`cg-workbench cg-next explore-site${embedded ? " cn-embedded" : ""}`}
      data-connection-explorer={variant}
    >
      {!embedded && (
        <header className="atlas-intro cn-intro">
          <div>
            <PageEyebrow>
              {t("Different fields. Connected experience.")}
            </PageEyebrow>
            <h1 id="atlas-explore-title">{t("Explorer")}</h1>
          </div>
          <div className="atlas-intro-copy">
            <p>
              {t(
                "Change the lens to discover what connects the work. Choose a cluster or project to explore where your next challenge might fit.",
              )}
            </p>
            <span>
              {projects.length} {t("projects")}
              <i aria-hidden="true" />
              {de
                ? "4 Perspektiven + manuelle Gewichtung"
                : "4 perspectives + manual weights"}
              <Link href="/projects" className="atlas-projects-link">
                {t("Browse all projects")} <ArrowUpRight size={13} />
              </Link>
            </span>
          </div>
        </header>
      )}
      <div className="cg-layout glass-panel">
        <section
          className="cg-stage"
          aria-label={
            de
              ? "Interaktiver Verbindungsgraph"
              : "Interactive connection graph"
          }
        >
          <div className="cg-stage-top">
            <span className="cg-live-dot" />
            {definition.label}
            <span className="cg-stage-help">
              {embedded
                ? de
                  ? "Punkte ziehen · Umschalt + Scrollen: zoomen"
                  : "Drag nodes · Shift + scroll to zoom"
                : de
                  ? "Punkte ziehen · Hintergrund bewegen · Scrollen: zoomen"
                  : "Drag nodes · drag background · scroll to zoom"}
            </span>
          </div>
          <div
            className="cn-toolbar"
            aria-label={de ? "Ansicht steuern" : "View controls"}
          >
            <div className="cn-segment">
              <button
                type="button"
                aria-pressed={state.view === "3d"}
                onClick={() => navigate({ view: "3d" })}
              >
                3D
              </button>
              <button
                type="button"
                aria-pressed={state.view === "2d"}
                onClick={() => navigate({ view: "2d" })}
              >
                2D
              </button>
            </div>
            <button
              type="button"
              aria-pressed={state.labels}
              onClick={() => navigate({ labels: !state.labels }, true)}
            >
              {t("Labels")}
            </button>
            <button type="button" onClick={() => setResetView((n) => n + 1)}>
              <RotateCcw size={13} />
              {t("Reset view")}
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  const url = new URL(window.location.href);
                  if (embedded) url.pathname = `/${locale}/explorer`;
                  await navigator.clipboard.writeText(
                    new URL(writeConnectionNavigation(url, state), url.origin)
                      .href,
                  );
                  setShareStatus(de ? "Link kopiert" : "Link copied");
                } catch {
                  setShareStatus(
                    de
                      ? "Kopiere die Adresse aus dem Browser."
                      : "Copy the address from your browser.",
                  );
                }
              }}
            >
              <LinkIcon size={13} />
              {de ? "Teilen" : "Share"}
            </button>
            <span role="status">{shareStatus}</span>
          </div>
          <div
            className="cg-canvas"
            onWheelCapture={
              embedded
                ? (event) => {
                    if (!event.shiftKey) event.stopPropagation();
                  }
                : undefined
            }
          >
            <SpaceBoundary
              fallback={
                <div className="cg-loading">
                  {de
                    ? "Die Projektliste und Analyse unten bleiben verfügbar."
                    : "The project picker and analysis below remain available."}
                </div>
              }
            >
              <Graph3D
                nodes={nodes}
                links={graph.links}
                perspective={lens === "manual" ? "manual" : `${lens}:${model}`}
                projects={projects}
                locale={locale}
                selectedId={selectedId}
                showLinks={state.links}
                showHulls={state.hulls && !analysis.error}
                groups={groups}
                contrast={CONTRAST}
                onSelect={select}
                onClusterSelect={selectCluster}
                labels={state.labels}
                highlightedIds={highlighted}
                visibleLinkIds={focusedLinks}
                resetView={resetView}
                reducedMotion={reducedMotion}
                flat={state.view === "2d"}
              />
            </SpaceBoundary>
            {(analysis.pending || (lens === "scale" && scale.pending)) && (
              <GraphLoadingOverlay
                locale={locale}
                comparingMeasurements={lens === "scale" && scale.pending}
              />
            )}
          </div>
          <div className="cg-stage-bottom">
            <label>
              <input
                type="checkbox"
                checked={state.links}
                onChange={(e) => navigate({ links: e.target.checked }, true)}
              />
              {de ? "Verbindungen" : "Connections"}
            </label>
            <label>
              <input
                type="checkbox"
                checked={state.hulls}
                onChange={(e) => navigate({ hulls: e.target.checked }, true)}
              />
              {de ? "Cluster-Hüllen" : "Cluster hulls"}
            </label>
            <span>
              {reducedMotion
                ? de
                  ? "Bewegung reduziert"
                  : "Reduced motion"
                : de
                  ? "Positionen zeigen Beziehungen, keine Messwerte."
                  : "Positions show relationships, not measurements."}
            </span>
          </div>
        </section>
        <aside className="cg-panel cn-sidebar">
          <div className="cn-sidebar-heading">
            {de ? "01 / PERSPEKTIVE" : "01 / PERSPECTIVE"}
          </div>
          <div
            className="cn-tabs"
            role="tablist"
            aria-orientation="vertical"
            aria-label={t("Experience lenses")}
            onKeyDown={(event) => {
              const index = tabItems.findIndex((item) => item.id === lens);
              let next = index;
              if (event.key === "ArrowDown")
                next = (index + 1) % tabItems.length;
              else if (event.key === "ArrowUp")
                next = (index + tabItems.length - 1) % tabItems.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = tabItems.length - 1;
              else return;
              event.preventDefault();
              chooseLens(tabItems[next].id);
              document.getElementById(`cn-tab-${tabItems[next].id}`)?.focus();
            }}
          >
            {tabItems.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`cn-tab-${item.id}`}
                aria-controls="cn-perspective-panel"
                aria-selected={lens === item.id}
                tabIndex={lens === item.id ? 0 : -1}
                onClick={() => chooseLens(item.id)}
              >
                <span>0{index + 1}</span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.question}</small>
                </span>
                <ArrowUpRight size={14} />
              </button>
            ))}
          </div>
          <section
            className="cn-selection"
            id="vs-inspector"
            ref={inspector}
            tabIndex={-1}
            aria-label={
              de ? "Projektauswahl und Fokus" : "Project selection and focus"
            }
          >
            <label className="cg-project-picker">
              {t("JUMP TO A PROJECT")}
              <select
                value={selectedId}
                onChange={(e) => select(e.target.value, false)}
              >
                <option value="">{t("All projects · no selection")}</option>
                {[...projects]
                  .sort((a, b) => a.label.localeCompare(b.label))
                  .map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.label}
                      {graph.ids.includes(p.id)
                        ? ""
                        : de
                          ? " · nicht vergleichbar"
                          : " · not comparable"}
                    </option>
                  ))}
              </select>
            </label>
            {selected && (
              <>
                <h2>
                  {selected.presentation?.projectHref ? (
                    <Link href={selected.presentation.projectHref}>
                      {selected.label}
                      <ArrowUpRight size={17} />
                    </Link>
                  ) : (
                    selected.label
                  )}
                </h2>
                <p className="cn-project-summary">
                  {selected.presentation?.description || selected.subtitle}
                </p>
                <div
                  className="cn-focus"
                  role="group"
                  aria-label={
                    de ? "Verbindungen hervorheben" : "Highlight connections"
                  }
                >
                  {(
                    ["all", "members", "bridges", "nearest"] as FocusMode[]
                  ).map((value) => (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={mode === value}
                      onClick={() => navigate({ mode: value })}
                    >
                      {
                        {
                          all: de ? "Alle" : "All",
                          members: t("Same cluster "),
                          bridges: t("Across clusters "),
                          nearest: t("Closest matches "),
                        }[value]
                      }
                    </button>
                  ))}
                </div>
                {!!facts.length && (
                  <details>
                    <summary>
                      {de
                        ? "Verglichene Projektmerkmale"
                        : "Compared project attributes"}
                    </summary>
                    <dl>
                      {facts.map((f) => (
                        <div key={f.id}>
                          <dt>{f.label}</dt>
                          <dd>
                            {f.value}
                            {f.note && <small>{f.note}</small>}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                )}
                {!graph.ids.includes(selected.id) && (
                  <p className="cn-notice">
                    {space?.excluded.find((p) => p.id === selected.id)
                      ?.reason ??
                      (de
                        ? "Außerhalb der aktuellen Auswahl."
                        : "Outside the current comparable project set.")}
                  </p>
                )}
                <button
                  className="cn-text-button"
                  type="button"
                  onClick={() => {
                    setInspectionOpen(true);
                    document
                      .getElementById("cn-neighbours")
                      ?.scrollIntoView({ block: "center" });
                  }}
                >
                  {de
                    ? "Verbindungen unten untersuchen"
                    : "Inspect connections below"}{" "}
                  ↓
                </button>
              </>
            )}
            {activeGroup && (
              <button
                type="button"
                className="cn-text-button"
                onClick={() => setSelectedGroup(null)}
              >
                {de ? "Cluster-Fokus aufheben" : "Clear cluster focus"}
              </button>
            )}
          </section>
          <section
            id="cn-perspective-panel"
            role="tabpanel"
            aria-labelledby={`cn-tab-${lens}`}
            className="cg-controls cn-lens-panel"
          >
            {lens === "manual" && <p className="cn-method">{method}</p>}
            {lens === "manual" ? (
              <>
                <div className="cg-budget">
                  <span>{de ? "Gewicht gesamt" : "Total weight"}</span>
                  <output>{total.toFixed(1)} / 100</output>
                  <meter
                    min={0}
                    max={100}
                    value={total}
                    aria-label={de ? "Gewicht gesamt" : "Total weight"}
                  />
                </div>
                <p>
                  {de
                    ? "Über 100 werden andere Felder proportional schwächer. Bei 0 ist ein Feld aus."
                    : "Above 100, other fields lose weight proportionally. At 0, a field is off."}
                </p>
                <div className="cg-fields">
                  {CONNECTION_FIELDS.map((field) => (
                    <div
                      key={field.id}
                      className={`cg-field${weights[field.id] === 0 ? " is-zero" : ""}`}
                    >
                      <div>
                        <label htmlFor={`cn-weight-${field.id}`}>
                          {fieldLabels[field.id]}
                        </label>
                        <output>
                          {weights[field.id] === 0
                            ? de
                              ? "Aus"
                              : "Off"
                            : weights[field.id].toFixed(1)}
                        </output>
                      </div>
                      <input
                        id={`cn-weight-${field.id}`}
                        aria-label={`${fieldLabels[field.id]} ${de ? "Gewicht" : "weight"}`}
                        type="range"
                        min={0}
                        max={100}
                        step="any"
                        value={weights[field.id]}
                        onChange={(e) =>
                          navigate(
                            {
                              weights: redistributeConnectionWeight(
                                weights,
                                field.id,
                                Number(e.target.value),
                              ),
                            },
                            true,
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
                <button
                  className="cg-equal-weights"
                  type="button"
                  onClick={() =>
                    navigate({
                      weights: Object.fromEntries(
                        CONNECTION_FIELDS.map((f) => [
                          f.id,
                          100 / CONNECTION_FIELDS.length,
                        ]),
                      ) as ConnectionWeights,
                    })
                  }
                >
                  {de ? "Gleich gewichten" : "Equal weights"}
                </button>
                <button
                  className="cn-text-button"
                  type="button"
                  onClick={() =>
                    navigate({ weights: { ...DEFAULT_CONNECTION_WEIGHTS } })
                  }
                >
                  {de ? "Standardgewichtung" : "Default weights"}
                </button>
              </>
            ) : lens === "scale" ? (
              <ScaleSpaceControls
                projects={projects}
                activeProjects={scaleProjects}
                fields={fields}
                onFields={(fields) => navigate({ fields })}
                sector={sector}
                onSector={(sector) => navigate({ sector })}
                result={scale.result}
                pending={scale.pending}
                error={scale.error}
                inputLabel={t("COMPARED AS RECORDED FIELDS")}
              />
            ) : (
              <div className="cn-compared-fields">
                <p className="cn-field-label">
                  {t("COMPARED AS RECORDED FIELDS")}
                </p>
                <div className="cn-inputs">
                  {SPACE_LENSES.find((item) => item.id === lens)?.fields.map(
                    (field) => (
                      <span key={field}>{t(field)}</span>
                    ),
                  )}
                </div>
              </div>
            )}
            {!!disabled.size && (
              <button
                type="button"
                className="cn-text-button"
                onClick={() => navigate({ disabled: [] })}
              >
                {de
                  ? `${disabled.size} Verbindungen wieder aktivieren`
                  : `Restore ${disabled.size} disabled connections`}
              </button>
            )}
          </section>
          <details className="cn-calculation">
            <summary>
              {de
                ? "So entstehen die Verbindungen"
                : "How connections are calculated"}
            </summary>
            <div>
              <p>{method}</p>
              <p className="cn-model-metric">
                {graph.links.length}{" "}
                {de ? "aktive Verbindungen" : "active connections"}
                <br />
                {de
                  ? "Mediane Verbindungsstärke"
                  : "Median connection strength"}
                : {(medianStrength * 100).toFixed(1)}%
              </p>
            </div>
          </details>
        </aside>
        <ConnectionAnalysisPanel
          analysis={analysis}
          projects={projects}
          locale={locale}
          selectedId={selectedId}
          onSelect={select}
          inspectionOpen={inspectionOpen}
          onInspectionToggle={setInspectionOpen}
          fieldLabels={fieldLabels}
          calibrated={lens !== "manual" && model === "similarity"}
        >
          <section
            className="cg-inspector"
            id="cn-neighbours"
            aria-label={de ? "Projektverbindungen" : "Project connections"}
          >
            <div className="cg-section-head">
              <span>
                {selected?.label ??
                  (de ? "Projekt wählen" : "Choose a project")}
              </span>
              <span>
                {visibleNeighbours.length} {de ? "Verbindungen" : "connections"}
              </span>
            </div>
            <div className="cg-neighbours">
              {visibleNeighbours.map((edge) => {
                const other = byId.get(
                  edge.source === selectedId ? edge.target : edge.source,
                );
                const shared = Object.entries(edge.shared)
                  .filter(
                    ([field]) =>
                      (traitWeights as Record<string, number>)[field] > 0,
                  )
                  .flatMap(([field, values]) =>
                    values.map(
                      (value) =>
                        `${fieldLabels[field] ?? field}: ${atlasTerm(locale, value)}`,
                    ),
                  );
                return (
                  <article
                    key={edge.id}
                    className={`cg-neighbour${disabled.has(edge.id) ? "" : " is-active"}`}
                  >
                    <div>
                      <button
                        className="cn-neighbour-title"
                        type="button"
                        onClick={() => select(other!.id)}
                      >
                        {other?.label}
                        <ArrowUpRight size={12} />
                      </button>
                      <span>
                        {Math.round(edge.score * 100)}%
                        {edge.comparisonScore !== undefined && (
                          <small className="cn-raw-score">
                            {Math.round(edge.comparisonScore * 100)}%{" "}
                            {de ? "ursprünglich" : "original"}
                          </small>
                        )}
                      </span>
                    </div>
                    <p>
                      {shared.slice(0, 3).join(" · ") ||
                        (lens === "engineering" && model === "similarity"
                          ? de
                            ? "Semantisch ähnlich; keine identischen erfassten Tags."
                            : "Semantically similar; no identical recorded tags."
                          : de
                            ? "Ähnlichkeit der verglichenen Messwerte."
                            : "Similarity of the compared measurements.")}
                    </p>
                    <button
                      type="button"
                      aria-pressed={disabled.has(edge.id)}
                      onClick={() =>
                        navigate({
                          disabled: disabled.has(edge.id)
                            ? state.disabled.filter((id) => id !== edge.id)
                            : [...state.disabled, edge.id],
                        })
                      }
                    >
                      {disabled.has(edge.id)
                        ? de
                          ? "Aktivieren"
                          : "Enable link"
                        : de
                          ? "Deaktivieren"
                          : "Disable link"}
                    </button>
                  </article>
                );
              })}
            </div>
            {!visibleNeighbours.length && (
              <p className="cg-empty">
                {de
                  ? "Keine Verbindungen in diesem Fokus. Wähle Alle oder eine andere Perspektive."
                  : "No connections in this focus. Choose All or another perspective."}
              </p>
            )}
          </section>
        </ConnectionAnalysisPanel>
      </div>
      {lens !== "manual" && missing.length > 0 && (
        <details className="cn-excluded">
          <summary>
            {missing.length}{" "}
            {de
              ? "Projekte außerhalb dieser Perspektive"
              : "projects outside this perspective"}
          </summary>
          <p>
            {de
              ? "Fehlende oder herausgefilterte Daten sind keine Ausreißer. Diese Punkte bleiben im Netz sichtbar."
              : "Missing or filtered data is not an outlier. These points remain visible in the graph."}
          </p>
          <ul>
            {missing.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => select(p.id)}>
                  {p.label}
                </button>
                <span>
                  {space?.excluded.find((e) => e.id === p.id)?.reason ??
                    (de
                      ? "Außerhalb der Auswahl"
                      : "Outside the selected project set")}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
      {!embedded && (
        <section className="cn-enquiry">
          <div>
            <PageEyebrow>{t("Bring your field into the picture")}</PageEyebrow>
            <h2>
              {t("Where does your ")}
              <br />
              {t("challenge fit?")}
            </h2>
          </div>
          <div className="cn-enquiry-copy">
            <p>
              {t(
                "A familiar problem, a new industry, or a product that connects several worlds. Let’s explore what your project needs.",
              )}
            </p>
            <Button
              variant="cta"
              arrow
              href={enquiryPath(
                selected ? { source: "project", projectId: selected.id } : {},
                locale,
              )}
              prefetch={false}
            >
              {t("Discuss your project ")}
            </Button>
          </div>
        </section>
      )}
      <p className="cg-method">
        {de
          ? "Ähnlichkeit beschreibt erfasste Merkmale, keine Eignung oder tatsächliche Zusammenarbeit. Alle Kräfte bleiben aktiv, auch bei ausgeblendeten Linien oder fokussierter Ansicht."
          : "Similarity describes recorded attributes, not suitability or actual collaboration. All forces stay active when lines are hidden or the view is focused."}
      </p>
    </div>
  );
}
