"use client";

import { projectLensFacts } from "./projectLensFacts";
import { useAtlasCopy } from "./useAtlasCopy";
import Link from "../i18n/LocalizedLink";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Box,
  CircleHelp,
  Crosshair,
  GitBranch,
  Layers3,
  Maximize2,
  RotateCcw,
} from "lucide-react";
import type { AtlasProject } from "./model";
import {
  type SemanticDataset,
  type SpaceLens,
  type SpaceView,
  type SemanticSpace,
} from "./spaceTypes";
import { SemanticSpaceCharts, type SpaceNode } from "./SemanticSpaceCharts";
import { spaceNodes } from "./spaceNodes";
import { SpaceBoundary } from "./SpaceBoundary";
import { SpaceClusterGrid } from "./SpaceClusterGrid";
import { describeSpaceAxes } from "./spaceAxes";
import {
  EmbeddingPlayground,
  type ComparisonMode,
} from "./EmbeddingPlayground";
import type { ExperimentComparison } from "./embeddingExperiments";
import { SCALE_FIELDS, SPACE_LENSES, type ScaleField } from "./scaleSpace";
import { useScaleSpace } from "./useScaleSpace";
import { ScaleSpaceControls } from "./ScaleSpaceControls";
import { createSpaceViewport } from "./spaceViewport";
import {
  describeSpaceConnections,
  spaceHighlightIds,
  type ConnectionMode,
} from "./spaceConnections";
import {
  SpaceConnectionSidebar,
  SpaceClusterSidebar,
} from "./SpaceConnectionSidebar";
import "./semantic-space.css";

function SpaceLoading() {
  const { t } = useAtlasCopy();
  return (
    <div className="vs-loading">{t("Initializing spatial renderer…")}</div>
  );
}
const Space3D = dynamic(() => import("./SemanticSpace3D"), {
  ssr: false,
  loading: SpaceLoading,
});
const VIEWS = [
  { id: "3d", name: "3D space", icon: Box },
  { id: "2d", name: "2D projection", icon: Maximize2 },
  { id: "network", name: "Neighbour network", icon: GitBranch },
] as const;

export function SemanticSpaceWorkbench({
  data,
  projects,
  selectedId,
  recipe,
  onRecipe,
  view,
  onView,
  onSelect,
  experimentsEnabled = false,
  wheelZoomRequiresShift = false,
}: {
  data?: SemanticDataset;
  projects: AtlasProject[];
  selectedId: string;
  recipe: SpaceLens;
  onRecipe: (recipe: SpaceLens) => void;
  view: SpaceView;
  onView: (view: SpaceView) => void;
  onSelect: (id: string) => void;
  experimentsEnabled?: boolean;
  wheelZoomRequiresShift?: boolean;
}) {
  const { locale, t, term } = useAtlasCopy();
  const [labels, setLabels] = useState(false);
  const [hulls, setHulls] = useState(true);
  const [reset, setReset] = useState(0);
  const [connectionMode, setConnectionMode] =
    useState<ConnectionMode>("members");
  const [selectedCluster, setSelectedCluster] = useState<{
    space: SemanticSpace;
    index: number;
  } | null>(null);
  const [hoveredCluster, setHoveredCluster] = useState<{
    space: SemanticSpace;
    selectedId: string;
    group: number;
  } | null>(null);
  const [focusedCluster, setFocusedCluster] = useState<{
    space: SemanticSpace;
    selectedId: string;
    group: number;
  } | null>(null);
  const viewport = useRef(createSpaceViewport());
  const [experiment, setExperiment] = useState<ExperimentComparison>();
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("joint");
  useEffect(() => {
    // URL navigation and browser history should reset the same lens-local state.
    setSelectedCluster(null);
    setExperiment(undefined);
    setComparisonMode("joint");
  }, [recipe]);
  const [scaleFields, setScaleFields] = useState<ScaleField[]>(
    SCALE_FIELDS.map((f) => f.id),
  );
  const [scaleSector, setScaleSector] = useState("");
  const scaleProjects = useMemo(
    () =>
      projects.filter(
        (p) => !scaleSector || p.industries.includes(scaleSector),
      ),
    [projects, scaleSector],
  );
  const {
    result: scaleResult,
    pending: scalePending,
    error: scaleError,
  } = useScaleSpace(scaleProjects, scaleFields);
  const definition = SPACE_LENSES.find((r) => r.id === recipe)!;
  const requestedSpace =
    recipe === "scale"
      ? scaleResult?.space
      : (experiment?.[comparisonMode].space ?? data?.spaces[recipe]);
  const requestedDimensions =
    recipe === "scale"
      ? scaleResult?.dimensions
      : experiment && comparisonMode === "blend"
        ? experiment.dimensions * experiment.fields.length
        : (experiment?.dimensions ??
          requestedSpace?.dimensions ??
          data?.dimensions);
  const [previousMap, setPreviousMap] = useState<{
    space: SemanticSpace;
    dimensions?: number;
    recipe: SpaceLens;
  }>();
  useEffect(() => {
    if (requestedSpace)
      setPreviousMap({
        space: requestedSpace,
        dimensions: requestedDimensions,
        recipe,
      });
  }, [requestedSpace, requestedDimensions, recipe]);
  const waiting = recipe === "scale" && scalePending;
  const space = requestedSpace ?? (waiting ? previousMap?.space : undefined);
  const dimensions = requestedSpace
    ? requestedDimensions
    : waiting
      ? previousMap?.dimensions
      : undefined;
  const displayedRecipe = requestedSpace
    ? recipe
    : waiting
      ? (previousMap?.recipe ?? recipe)
      : recipe;
  const projectById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  );
  const selected = projectById.get(selectedId);
  const nodes = useMemo<SpaceNode[]>(
    () => (space ? spaceNodes(space, projects, locale) : []),
    [space, projects, locale],
  );
  const connections = useMemo(
    () =>
      space ? describeSpaceConnections(space, projects, selectedId) : undefined,
    [space, projects, selectedId],
  );
  useEffect(() => {
    // Preview controls can unmount without a blur/leave event after selection.
    setHoveredCluster(null);
    setFocusedCluster(null);
  }, [space, selectedId]);
  useEffect(() => {
    setSelectedCluster(null);
  }, [space]);
  useEffect(() => {
    if (selectedId) setSelectedCluster(null);
  }, [selectedId]);
  const clusterView =
    selectedCluster && selectedCluster.space === space && !selectedId
      ? connections?.groups[selectedCluster.index]
      : undefined;
  const inspectorRef = useRef<HTMLElement>(null);
  const focusInspector = useRef(false);
  useEffect(() => {
    if (focusInspector.current) {
      inspectorRef.current?.focus({
        preventScroll: window.matchMedia("(min-width: 801px)").matches,
      });
      focusInspector.current = false;
    }
  }, [selectedId, selectedCluster]);
  const previewGroup =
    (hoveredCluster?.space === space &&
    hoveredCluster?.selectedId === selectedId
      ? hoveredCluster.group
      : undefined) ??
    (focusedCluster?.space === space &&
    focusedCluster?.selectedId === selectedId
      ? focusedCluster.group
      : undefined) ??
    null;
  const preview =
    previewGroup === null ? undefined : connections?.groups[previewGroup];
  const highlightedIds = connections
    ? clusterView
      ? (connections.groups[previewGroup ?? clusterView.index]?.ids ?? [])
      : spaceHighlightIds(connections, connectionMode, previewGroup)
    : [];
  const connectionIds =
    connections && !clusterView
      ? (connectionMode === "clusters"
          ? connections.bridges
          : connectionMode === "members"
            ? connections.members
            : connections.nearest
        )
          .filter(
            (item) =>
              previewGroup === null ||
              connections.groups[previewGroup]?.ids.includes(item.id),
          )
          .map((item) => item.id)
      : [];
  const activeGroup =
    previewGroup ??
    clusterView?.index ??
    (connectionMode !== "nearest" ? (connections?.selectedGroup ?? -1) : -1);
  const onClusterHover = (group: number | null) =>
    setHoveredCluster((current) =>
      space && group !== null
        ? current?.space === space &&
          current.selectedId === selectedId &&
          current.group === group
          ? current
          : { space, selectedId, group }
        : null,
    );
  const onClusterFocus = (group: number | null) =>
    setFocusedCluster(
      space && group !== null ? { space, selectedId, group } : null,
    );
  const exclusion = space?.excluded.find((p) => p.id === selectedId);
  const selectedGroup = connections?.selectedGroup ?? -1;
  const emptyReason = exclusion
    ? `${t("This project is outside this space:")} ${term(exclusion.reason)}.`
    : space && !space.ids.includes(selectedId)
      ? t("This project is outside the selected project filter.")
      : !space
        ? t("Project vectors are not available for this lens yet.")
        : undefined;
  const variance = view === "2d" ? space?.variance2d : space?.variance3d;
  const stress = view === "2d" ? space?.stress2d : space?.stress3d;
  const axes = useMemo(
    () =>
      space
        ? describeSpaceAxes(projects, space, view === "2d" ? 2 : 3).map(
            (axis) => ({
              ...axis,
              label: axis.label ? t(axis.label) : undefined,
              negative: t(axis.negative ?? "Mixed patterns"),
              positive: t(axis.positive ?? "Mixed patterns"),
            }),
          )
        : [],
    [projects, space, view, t],
  );
  const structured = space?.representation === "structured";
  const selectCluster = (index: number) => {
    if (!space || !connections?.groups[index]) return;
    focusInspector.current = true;
    setSelectedCluster({ space, index });
    onSelect("");
    onClusterHover(null);
    onClusterFocus(null);
  };
  const selectProject = (id: string, moveFocus = true) => {
    focusInspector.current = moveFocus;
    setSelectedCluster(null);
    onClusterHover(null);
    onClusterFocus(null);
    onSelect(id);
  };
  const clearSelection = () => selectProject("");
  const selectedFacts = selected
    ? projectLensFacts(selected, displayedRecipe, locale, {
        fields: displayedRecipe === recipe ? experiment?.fields : undefined,
        scaleFields,
      })
    : [];

  return (
    <div className="vs-workbench glass-panel">
      <div
        className="vs-recipes"
        role="group"
        aria-label={t("Experience lenses")}
      >
        {SPACE_LENSES.map((item, index) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={recipe === item.id}
            onClick={() => {
              onRecipe(item.id);
              setSelectedCluster(null);
              setExperiment(undefined);
              setComparisonMode("joint");
            }}
          >
            <span>0{index + 1}</span>
            <div>
              <strong>{t(item.label)}</strong>
              <small>{t(item.question)}</small>
            </div>
            <ArrowUpRight size={16} />
          </button>
        ))}
      </div>
      {recipe === "scale" ? (
        <ScaleSpaceControls
          projects={projects}
          activeProjects={scaleProjects}
          fields={scaleFields}
          onFields={setScaleFields}
          sector={scaleSector}
          onSector={setScaleSector}
          result={scaleResult}
          pending={scalePending}
          error={scaleError}
        />
      ) : experimentsEnabled ? (
        <EmbeddingPlayground
          key={recipe}
          recipe={recipe}
          projects={projects}
          result={experiment}
          mode={comparisonMode}
          onMode={setComparisonMode}
          onReset={() => {
            setExperiment(undefined);
            setComparisonMode("joint");
          }}
          onResult={(result) => {
            setExperiment(result);
            setComparisonMode("joint");
          }}
        />
      ) : (
        <div className="vs-input-strip">
          <span>
            {structured
              ? t("COMPARED AS RECORDED FIELDS")
              : t("EMBEDDED TOGETHER")}
          </span>
          {definition.fields.map((field, i) => (
            <span key={t(field)} className="vs-input-field">
              {i > 0 && <b>+</b>}
              {t(field)}
            </span>
          ))}
        </div>
      )}
      <div className="vs-stage">
        <div className="vs-visual">
          <div className="vs-plot-toolbar">
            <div
              className="vs-views"
              role="group"
              aria-label={t("Vector visualization")}
            >
              {VIEWS.map(({ id, name, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={view === id}
                  onClick={() => onView(id)}
                >
                  <Icon size={14} />
                  <span>{t(name)}</span>
                </button>
              ))}
            </div>
            <div className="vs-plot-actions">
              {view !== "network" && (
                <button
                  type="button"
                  aria-pressed={hulls}
                  onClick={() => setHulls(!hulls)}
                  title={t("Toggle cluster envelopes")}
                >
                  <Box size={14} />
                  <span>{t("Clusters")}</span>
                </button>
              )}
              <button
                type="button"
                aria-pressed={labels}
                onClick={() => setLabels(!labels)}
                title={t("Toggle all project labels")}
              >
                <Layers3 size={14} />
                <span>{t("Labels")}</span>
              </button>
              <button
                type="button"
                aria-label={t("Reset view")}
                onClick={() => {
                  viewport.current = createSpaceViewport();
                  setReset((n) => n + 1);
                }}
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>
          <div
            className="vs-canvas"
            role="group"
            aria-label={t(VIEWS.find((v) => v.id === view)?.name ?? "")}
            onWheelCapture={
              wheelZoomRequiresShift
                ? (event) => {
                    // Keep the browser's scroll default, but bypass map zoom handlers.
                    if (!event.shiftKey) event.stopPropagation();
                  }
                : undefined
            }
          >
            {!space ||
            nodes.length < 2 ||
            (recipe === "scale" && !dimensions) ? (
              <div className="vs-loading">
                <Crosshair size={28} />
                <strong>
                  {waiting
                    ? t("Recalculating the numeric map…")
                    : recipe === "scale" && scaleError
                      ? scaleError
                      : !space
                        ? t("Project vectors are not available yet.")
                        : recipe === "scale"
                          ? !scaleFields.length
                            ? t("Choose at least one numeric field.")
                            : nodes.length < 2
                              ? t(
                                  "Fewer than two projects have comparable values.",
                                )
                              : t(
                                  "These projects have identical values in the selected fields.",
                                )
                          : experiment
                            ? t(
                                "Fewer than two projects have every selected field.",
                              )
                            : t(
                                "More current vectors are needed for this lens.",
                              )}
                </strong>
                <p>
                  {t(
                    "Choose a project with the picker below, then open its title in the sidebar. ",
                  )}
                </p>
              </div>
            ) : view === "3d" ? (
              <SpaceBoundary
                key={reset}
                fallback={
                  <div className="vs-loading">
                    <p>{t("3D rendering is unavailable in this browser.")}</p>
                    <button type="button" onClick={() => onView("2d")}>
                      {t("Open the 2D projection ")}
                    </button>
                  </div>
                }
              >
                <Space3D
                  groups={connections?.groups ?? []}
                  viewport={viewport}
                  nodes={nodes}
                  axes={axes}
                  hulls={hulls && space.groups.length > 1}
                  selectedId={clusterView ? "" : selectedId}
                  neighbours={connectionIds}
                  highlightedIds={highlightedIds}
                  activeGroup={activeGroup}
                  clusterSelected={Boolean(clusterView)}
                  labels={labels}
                  onSelect={selectProject}
                  onClusterSelect={selectCluster}
                />
              </SpaceBoundary>
            ) : (
              <SemanticSpaceCharts
                groups={connections?.groups ?? []}
                viewport={viewport}
                key={`${view}-${reset}`}
                nodes={nodes}
                axes={axes}
                hulls={hulls && space.groups.length > 1}
                space={space}
                selectedId={clusterView ? "" : selectedId}
                neighbours={connectionIds}
                highlightedIds={highlightedIds}
                activeGroup={activeGroup}
                clusterSelected={Boolean(clusterView)}
                view={view}
                labels={labels}
                onSelect={selectProject}
                onClusterSelect={selectCluster}
              />
            )}
            <label className="vs-project-select glass-panel">
              <span>{t("JUMP TO A PROJECT")}</span>
              <select
                aria-controls="vs-inspector"
                value={selectedId}
                onChange={(event) => selectProject(event.target.value, false)}
              >
                <option value="">{t("All projects · no selection")}</option>
                {[...projects]
                  .sort((a, b) => a.label.localeCompare(b.label))
                  .map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.label}
                      {space && !space.ids.includes(project.id)
                        ? t(" · unmapped")
                        : ""}
                    </option>
                  ))}
              </select>
            </label>
            {waiting && space && (
              <div className="vs-map-updating" role="status">
                {t("Updating map… ")}
                <span>{t("Previous result remains visible")}</span>
              </div>
            )}
            <div className="vs-plot-corner" aria-hidden="true">
              {view === "3d"
                ? t("XYZ / ORBIT")
                : view === "2d"
                  ? t("XY / PROJECT")
                  : t("NN / CONNECT")}
              <span>
                {" "}
                {t(
                  SPACE_LENSES.find((item) => item.id === displayedRecipe)
                    ?.label ?? "",
                ).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="vs-plot-footer">
            <span>
              {view === "3d"
                ? t(
                    wheelZoomRequiresShift
                      ? "Drag to orbit · Shift + scroll to zoom · click a project"
                      : "Drag to orbit · scroll to zoom · click a project",
                  )
                : view === "2d"
                  ? t("Hover to identify · click a project")
                  : t(
                      wheelZoomRequiresShift
                        ? "Drag a node to pull · drag background to pan · Shift + scroll to zoom"
                        : "Drag a node to pull · drag background to pan · scroll to zoom",
                    )}
            </span>
            <span>
              <i />{" "}
              {preview
                ? `${t("Previewing cluster")} ${String(preview.index + 1).padStart(2, "0")}`
                : clusterView
                  ? `${t("Cluster")} ${String(clusterView.index + 1).padStart(2, "0")} ${t("selected")}`
                  : !selectedId
                    ? t("All projects · choose a cluster or a point")
                    : connectionMode === "members"
                      ? t("Selected project + other cluster members")
                      : connectionMode === "clusters"
                        ? t("Your cluster + connections into other clusters")
                        : t("Selected + closest matches")}
            </span>
          </div>
          {space && view !== "network" && (
            <div
              className="vs-axis-guide"
              aria-label={t("Projection directions")}
            >
              <p>
                {t("Reading the axes")}{" "}
                <span>
                  {displayedRecipe === "scale"
                    ? t(
                        "Measurements associated with each direction · not quality scores",
                      )
                    : t(
                        "Position shows similarity. These directions are not business categories or skill scales.",
                      )}
                </span>
              </p>
              <dl>
                {axes.map((axis, i) => (
                  <div key={i}>
                    <dt>{"XYZ"[i]}</dt>
                    <dd>
                      {axis.label ? (
                        <span>
                          {axis.label} ·{" "}
                          {((space.axes[i] ?? 0) * 100).toFixed(0)}
                          {t("% of variation ")}
                        </span>
                      ) : (
                        <>
                          <span>− {axis.negative ?? t("Mixed patterns")}</span>
                          <span aria-hidden="true">↔</span>
                          <span>+ {axis.positive ?? t("Mixed patterns")}</span>
                        </>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          <p className="vs-size-note">
            {view === "3d"
              ? t(
                  "Size reflects wow factor · perspective affects apparent size",
                )
              : t("Area reflects wow factor (1–10)")}
          </p>
        </div>
        <aside
          className="vs-inspector"
          id="vs-inspector"
          ref={inspectorRef}
          tabIndex={-1}
          aria-label={
            clusterView
              ? `${t("Cluster")} ${clusterView.index + 1}: ${term(clusterView.label)}`
              : selected
                ? t("Selected project and connections")
                : t("All clusters")
          }
        >
          {(clusterView || selected) && (
            <button
              type="button"
              className="vs-back-cluster"
              onClick={() =>
                selected && selectedGroup >= 0
                  ? selectCluster(selectedGroup)
                  : clearSelection()
              }
            >
              <ArrowLeft size={14} />
              {selected && selectedGroup >= 0
                ? `${t("Back to cluster")} ${String(selectedGroup + 1).padStart(2, "0")}`
                : t("Back to all clusters")}
            </button>
          )}

          {clusterView ? (
            <SpaceClusterSidebar
              group={clusterView}
              projectById={projectById}
              onSelect={selectProject}
            />
          ) : !selected ? (
            <section className="vs-overview" aria-label={t("All clusters")}>
              <p className="vs-kicker">{t("EXPLORE THE RANGE")}</p>
              <h3>
                {connections?.groups.length ?? 0} {t("clusters. ")}
                {nodes.length} {t("projects. ")}
              </h3>
              <p>
                {t(
                  "Nothing selected. Choose a cluster to explore what connects its projects, or select any point on the map. ",
                )}
              </p>
              {connections && (
                <SpaceClusterGrid
                  groups={connections.groups}
                  activeGroup={activeGroup}
                  onSelect={selectCluster}
                />
              )}
            </section>
          ) : (
            <>
              <div className="vs-selected" aria-live="polite">
                <p className="vs-kicker">
                  <Crosshair size={12} /> {t("SELECTED")}{" "}
                  {selectedGroup >= 0 && (space?.groups.length ?? 0) > 1 && (
                    <span>
                      {t("CLUSTER ")}
                      {String(selectedGroup + 1).padStart(2, "0")}
                    </span>
                  )}
                </p>
                <h3>
                  {selected.presentation?.projectHref ? (
                    <Link
                      className="vs-project-title-link"
                      href={selected.presentation.projectHref}
                      aria-label={`${selected.label} · ${t("View full project")}`}
                    >
                      {selected.name}
                      <ArrowUpRight size={20} aria-hidden="true" />
                    </Link>
                  ) : (
                    selected.name
                  )}
                </h3>
                <dl
                  className="vs-project-facts"
                  aria-label={t("Inputs for this view")}
                >
                  {selectedFacts.map((fact) => (
                    <div key={fact.id}>
                      <dt>{fact.label}</dt>
                      <dd>
                        {fact.value}
                        {fact.note && <small>{fact.note}</small>}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
              <SpaceConnectionSidebar
                model={connections}
                mode={connectionMode}
                onMode={(mode) => {
                  setConnectionMode(mode);
                  onClusterHover(null);
                  onClusterFocus(null);
                }}
                projectById={projectById}
                numeric={displayedRecipe === "scale"}
                structured={structured}
                emptyReason={emptyReason}
                onSelect={selectProject}
                onHover={onClusterHover}
                onFocus={onClusterFocus}
              />
            </>
          )}
        </aside>
      </div>
      <details className="vs-method">
        <summary>
          <CircleHelp size={14} /> {t("What determines the position? ")}
        </summary>
        {space && (
          <div className="vs-readout">
            <div>
              <span>
                {view === "network"
                  ? t("CONNECTION RULE")
                  : t("VARIANCE RETAINED")}
              </span>
              <strong>
                {view === "network"
                  ? t("Up to 3 neighbours / node")
                  : `${((variance ?? 0) * 100).toFixed(1)}%`}
              </strong>
              <small>
                {view === "network"
                  ? t("Undirected union of nearest-neighbour links")
                  : t(
                      view === "2d"
                        ? "By the first two principal components"
                        : "By the first three principal components",
                    )}
              </small>
            </div>
            <div>
              <span>
                {view === "network" ? t("LAYOUT") : t("DISTANCE DISTORTION")}
              </span>
              <strong>
                {view === "network"
                  ? t("Force-directed")
                  : `${((stress ?? 0) * 100).toFixed(1)}%`}
              </strong>
              <small>
                {view === "network"
                  ? t("Screen distance does not encode similarity")
                  : t("Normalized stress · lower is more faithful")}
              </small>
            </div>
            <div>
              <span>{t("MODEL")}</span>
              <strong>
                {displayedRecipe === "scale"
                  ? t("Numeric field vectors")
                  : structured
                    ? t("Recorded field similarity")
                    : (experiment?.model ?? data?.model)?.replace(
                        "openai/",
                        "",
                      )}
              </strong>
              <small>
                {displayedRecipe === "scale" || structured
                  ? t("Calculated locally · no model calls")
                  : experiment
                    ? t(
                        "Experiment cached · switching views makes no model calls",
                      )
                    : t("Prepared in advance · no model calls while browsing")}
              </small>
            </div>
          </div>
        )}
        <div>
          {experiment && (
            <p>
              {t("Current experiment:")}{" "}
              {comparisonMode === "joint"
                ? t("one embedding of all selected fields together")
                : t(
                    "equal-weight concatenation of separately normalized field embeddings",
                  )}
              {t(
                ". Both comparison maps include only projects with every selected field recorded, so missing values do not shape similarity. Field changes remain drafts until Run comparison. ",
              )}
            </p>
          )}
          {recipe === "scale" ? (
            <p>
              {t(
                "The selected measurements form numeric vectors. Complexity uses its 1–5 scale; team size, rebuild effort and code size use log(1 + value), then the range of the active complete projects. Each varying field has equal weight. Both endpoints of a recorded range share that field’s weight. Constant fields add no distance and are ignored. Missing values are never filled with zero; effort needs a recorded rebuild-estimate basis. Filters refit scaling, projection and clustering. Numbers describe project context, not personal authorship, actual historic effort or quality. Positions are principal-component projections, computed with classical multidimensional scaling. Axis descriptions use the measurement most correlated with that direction. ",
              )}
            </p>
          ) : structured ? (
            <p>
              {t(
                "This lens compares recorded fields with equal weight. Categories use normalized indicator vectors: exact shared values make projects closer, regardless of how many tags a field contains. Contribution also uses team-size ranges: log(1 + size), scaled to the current population; both endpoints share one field’s weight. Constant fields contribute no distance. Missing required values are excluded rather than filled with zero. Working pattern is a recorded category, not an estimate of availability or effort. Proximity is one minus the mean field dissimilarity. The projection uses the corresponding Euclidean distance, √(2 − 2 × proximity). ",
              )}
            </p>
          ) : (
            <p>
              {t(
                "This embedding combines its listed fields into one text per project, then embeds that text into",
              )}{" "}
              {data?.dimensions.toLocaleString(locale) ?? t("a high number of")}{" "}
              {t(
                "dimensions. Names and client identities are not added as fields. Positions in 2D and 3D are principal-component projections of normalized vectors (computed with classical multidimensional scaling). Projection directions have no inherent business meaning. Recorded traits describe clusters with supporting counts instead of pretending that opposite ends of an axis are opposing skills. ",
              )}
            </p>
          )}
          <p>
            {t(
              "Only part of the original geometry fits on screen. Use the neighbour ranking for similarity in the full space; the projection is an overview. Across clusters highlights the selected project’s group and its closest project in each other group. The sidebar compares recorded tag frequencies between those groups, not inferred causes of clustering. Closest matches instead ranks up to five individual projects, regardless of cluster. Colours identify medoid clusters computed separately for the current data; their numbers are local to a map. In 3D, lines connect the selected project to the displayed matches. Network lines retain the nearest-neighbour graph and do not change with the sidebar mode. Connections do not establish collaboration or measured business outcomes. ",
            )}
          </p>
          {space?.clustering && (
            <p>
              {t(
                "Automatic grouping tests feasible counts from 2 to 10, with at least two projects per group and three deterministic PAM starts. It refits 12 subsets containing 80% of the projects, then picks the smallest count within one standard error of the best mean resampled silhouette. This is a simplicity heuristic, not a confidence interval. Stability is mean adjusted Rand agreement on retained projects; it is not accuracy. If no eligible separated partition is found, the map remains one group. Current separation:",
              )}{" "}
              {space.clustering.silhouette?.toFixed(3) ?? t("not applicable")}
              {t("; stability:")}{" "}
              {space.clustering.stability?.toFixed(3) ?? t("not applicable")}.
            </p>
          )}
          <p>
            {t(
              "Faint convex envelopes surround each cluster in the displayed projection, with a small margin for the dots. Envelopes can overlap; they do not mark exclusive territories or a confidence interval. Turn off Clusters for an unobstructed view. ",
            )}
          </p>
          <p>
            {t(
              "Bubble size uses the recorded wow-factor, a subjective portfolio rating from 1 to 10. Circle area scales with the rating; perspective also affects apparent size in 3D. Unscored projects use a small fallback marker. Visual sizing does not affect embeddings, cluster membership or neighbour rankings. ",
            )}
            {experiment?.fields.includes("wowFactor") &&
              t(
                " This experiment separately includes Wow factor as an embedding field, so the recorded rating also influences similarity.",
              )}
          </p>
          {data && recipe !== "scale" && (
            <p>
              {structured ? t("Source refreshed") : t("Embedding cache")}:{" "}
              {(structured ? data.sourceRefreshedAt : data.generatedAt)?.slice(
                0,
                10,
              ) ?? t("Date not recorded")}
              .
              {structured
                ? t(
                    "Required fields must be recorded; this map is rebuilt locally when the snapshot is prepared.",
                  )
                : t(
                    "Missing or changed embedding inputs are excluded until regenerated.",
                  )}{" "}
              {space?.excluded.length ?? 0}{" "}
              {t("projects excluded in this lens. ")}
            </p>
          )}
          {!!space?.excluded.length && (
            <ul>
              {space.excluded.map((e) => (
                <li key={e.id}>
                  {projectById.get(e.id)?.label ?? e.id}: {term(e.reason)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </div>
  );
}
