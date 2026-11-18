"use client";

import dynamic from "next/dynamic";
import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowDown,
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
  SPACE_COLORS,
  SPACE_RECIPES,
  type SemanticDataset,
  type SpaceLens,
  type SpaceView,
  type SemanticSpace,
} from "./spaceTypes";
import { SemanticSpaceCharts, type SpaceNode } from "./SemanticSpaceCharts";
import { bubbleDiameter } from "./bubbleSize";
import { projectHoverDetails } from "./projectHover";
import { SpaceClusterGrid } from "./SpaceClusterGrid";
import { describeSpaceAxes } from "./spaceAxes";
import {
  EmbeddingPlayground,
  type ComparisonMode,
} from "./EmbeddingPlayground";
import type { ExperimentComparison } from "./embeddingExperiments";
import { SCALE_FIELDS, type ScaleField } from "./scaleSpace";
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

const LENSES = [
  ...SPACE_RECIPES,
  {
    id: "scale",
    label: "Scale & delivery",
    question: "What scale have I worked at?",
    fields: SCALE_FIELDS.map((f) => f.label),
  },
] as const;

const Space3D = dynamic(() => import("./SemanticSpace3D"), {
  ssr: false,
  loading: () => (
    <div className="vs-loading">Initializing spatial renderer…</div>
  ),
});
const VIEWS = [
  { id: "3d", name: "3D space", icon: Box },
  { id: "2d", name: "2D projection", icon: Maximize2 },
  { id: "network", name: "Neighbour network", icon: GitBranch },
] as const;

class SpaceBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function SemanticSpaceWorkbench({
  data,
  projects,
  selectedId,
  recipe,
  onRecipe,
  view,
  onView,
  onSelect,
  onExplore,
  experimentsEnabled = false,
}: {
  data?: SemanticDataset;
  projects: AtlasProject[];
  selectedId: string;
  recipe: SpaceLens;
  onRecipe: (recipe: SpaceLens) => void;
  view: SpaceView;
  onView: (view: SpaceView) => void;
  onSelect: (id: string) => void;
  onExplore: () => void;
  experimentsEnabled?: boolean;
}) {
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
  const definition = LENSES.find((r) => r.id === recipe)!;
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
    () =>
      space?.ids.flatMap((id, index) => {
        const project = projectById.get(id);
        const group = space.groups.findIndex((g) => g.ids.includes(id));
        return project
          ? [
              {
                id,
                name: project.name,
                label: project.label,
                color: SPACE_COLORS[group] ?? SPACE_COLORS[0],
                wowFactor: project.wowFactor,
                diameter: bubbleDiameter(project.wowFactor),
                hover: projectHoverDetails(
                  project,
                  group,
                  space.groups[group]?.ids.length ?? 0,
                ),
                group,
                xy: space.positions2d[index],
                xyz: space.positions3d[index],
              },
            ]
          : [];
      }) ?? [],
    [space, projectById],
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
    ? `This project is outside this space: ${exclusion.reason.toLowerCase()}.`
    : space && !space.ids.includes(selectedId)
      ? "This project is outside the selected project filter."
      : !space
        ? "Project vectors are not available for this lens yet."
        : undefined;
  const variance = view === "2d" ? space?.variance2d : space?.variance3d;
  const stress = view === "2d" ? space?.stress2d : space?.stress3d;
  const axes = useMemo(
    () =>
      space ? describeSpaceAxes(projects, space, view === "2d" ? 2 : 3) : [],
    [projects, space, view],
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

  return (
    <div className="vs-workbench">
      <div className="vs-recipes" role="group" aria-label="Experience lenses">
        {LENSES.map((item, index) => (
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
              <strong>{item.label}</strong>
              <small>{item.question}</small>
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
            {structured ? "COMPARED AS RECORDED FIELDS" : "EMBEDDED TOGETHER"}
          </span>
          {definition.fields.map((field, i) => (
            <span key={field} className="vs-input-field">
              {i > 0 && <b>+</b>}
              {field}
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
              aria-label="Vector visualization"
            >
              {VIEWS.map(({ id, name, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={view === id}
                  onClick={() => onView(id)}
                >
                  <Icon size={14} />
                  <span>{name}</span>
                </button>
              ))}
            </div>
            <div className="vs-plot-actions">
              {view !== "network" && (
                <button
                  type="button"
                  aria-pressed={hulls}
                  onClick={() => setHulls(!hulls)}
                  title="Toggle cluster envelopes"
                >
                  <Box size={14} />
                  <span>Clusters</span>
                </button>
              )}
              <button
                type="button"
                aria-pressed={labels}
                onClick={() => setLabels(!labels)}
                title="Toggle all project labels"
              >
                <Layers3 size={14} />
                <span>Labels</span>
              </button>
              <button
                type="button"
                aria-label="Reset view"
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
            aria-label={VIEWS.find((v) => v.id === view)?.name}
          >
            {!space ||
            nodes.length < 2 ||
            (recipe === "scale" && !dimensions) ? (
              <div className="vs-loading">
                <Crosshair size={28} />
                <strong>
                  {waiting
                    ? "Recalculating the numeric map…"
                    : recipe === "scale" && scaleError
                      ? scaleError
                      : !space
                        ? "Project vectors are not available yet."
                        : recipe === "scale"
                          ? !scaleFields.length
                            ? "Choose at least one numeric field."
                            : nodes.length < 2
                              ? "Fewer than two projects have comparable values."
                              : "These projects have identical values in the selected fields."
                          : experiment
                            ? "Fewer than two projects have every selected field."
                            : "More current vectors are needed for this lens."}
                </strong>
                <p>
                  The project selector and stories below are still available.
                </p>
              </div>
            ) : view === "3d" ? (
              <SpaceBoundary
                key={reset}
                fallback={
                  <div className="vs-loading">
                    <p>3D rendering is unavailable in this browser.</p>
                    <button type="button" onClick={() => onView("2d")}>
                      Open the 2D projection
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
            {waiting && space && (
              <div className="vs-map-updating" role="status">
                Updating map… <span>Previous result remains visible</span>
              </div>
            )}
            <div className="vs-plot-corner" aria-hidden="true">
              {view === "3d"
                ? "XYZ / ORBIT"
                : view === "2d"
                  ? "XY / PROJECT"
                  : "NN / CONNECT"}
              <span>
                {" "}
                {LENSES.find(
                  (item) => item.id === displayedRecipe,
                )?.label.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="vs-plot-footer">
            <span>
              {view === "3d"
                ? "Drag to orbit · scroll to zoom · click a project"
                : view === "2d"
                  ? "Hover to identify · click a project"
                  : "Drag a node to pull · drag background to pan · scroll to zoom"}
            </span>
            <span>
              <i />{" "}
              {preview
                ? `Previewing cluster ${String(preview.index + 1).padStart(2, "0")}`
                : clusterView
                  ? `Cluster ${String(clusterView.index + 1).padStart(2, "0")} selected`
                  : !selectedId
                    ? "All projects · choose a cluster or a point"
                    : connectionMode === "members"
                      ? "Selected project + other cluster members"
                      : connectionMode === "clusters"
                        ? "Your cluster + connections into other clusters"
                        : "Selected + closest matches"}
            </span>
          </div>
          {space && view !== "network" && (
            <div className="vs-axis-guide" aria-label="Projection directions">
              <p>
                Reading the axes{" "}
                <span>
                  {displayedRecipe === "scale"
                    ? "Measurements associated with each direction · not quality scores"
                    : "Position shows similarity. These directions are not business categories or skill scales."}
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
                          {((space.axes[i] ?? 0) * 100).toFixed(0)}% of
                          variation
                        </span>
                      ) : (
                        <>
                          <span>− {axis.negative ?? "Mixed patterns"}</span>
                          <span aria-hidden="true">↔</span>
                          <span>+ {axis.positive ?? "Mixed patterns"}</span>
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
              ? "Size reflects wow factor · perspective affects apparent size"
              : "Area reflects wow factor (1–10)"}
          </p>
        </div>
        <aside
          className="vs-inspector"
          id="vs-inspector"
          ref={inspectorRef}
          tabIndex={-1}
          aria-label={
            clusterView
              ? `Cluster ${clusterView.index + 1}: ${clusterView.label}`
              : selected
                ? "Selected project and connections"
                : "All clusters"
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
                ? `Back to cluster ${String(selectedGroup + 1).padStart(2, "0")}`
                : "Back to all clusters"}
            </button>
          )}
          <label className="vs-project-select">
            <span>JUMP TO A PROJECT</span>
            <select
              value={selectedId}
              onChange={(event) => selectProject(event.target.value, false)}
            >
              <option value="">All projects · no selection</option>
              {[...projects]
                .sort((a, b) => a.label.localeCompare(b.label))
                .map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.label}
                    {space && !space.ids.includes(project.id)
                      ? " · unmapped"
                      : ""}
                  </option>
                ))}
            </select>
          </label>
          {clusterView ? (
            <SpaceClusterSidebar
              group={clusterView}
              projectById={projectById}
              onSelect={selectProject}
            />
          ) : !selected ? (
            <section className="vs-overview" aria-label="All clusters">
              <p className="vs-kicker">EXPLORE THE RANGE</p>
              <h3>
                {connections?.groups.length ?? 0} clusters. {nodes.length}{" "}
                projects.
              </h3>
              <p>
                Nothing selected. Choose a cluster to explore what connects its
                projects, or select any point on the map.
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
                  <Crosshair size={12} /> SELECTED{" "}
                  {selectedGroup >= 0 && (space?.groups.length ?? 0) > 1 && (
                    <span>
                      CLUSTER {String(selectedGroup + 1).padStart(2, "0")}
                    </span>
                  )}
                </p>
                <h3>{selected?.name}</h3>
                <p className="vs-summary">
                  {selected?.subtitle || selected?.summary}
                </p>
                {selected?.ownership && (
                  <p className="vs-role">
                    <b>My role</b>
                    {selected.ownership}
                    {selected.projectType ? ` · ${selected.projectType}` : ""}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="vs-detail-button"
                onClick={onExplore}
                aria-controls="atlas-project-detail"
              >
                Explore this project <ArrowDown size={15} />
              </button>
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
      {space && (
        <div className="vs-readout">
          <div>
            <span>
              {view === "network" ? "CONNECTION RULE" : "VARIANCE RETAINED"}
            </span>
            <strong>
              {view === "network"
                ? "Up to 3 neighbours / node"
                : `${((variance ?? 0) * 100).toFixed(1)}%`}
            </strong>
            <small>
              {view === "network"
                ? "Undirected union of nearest-neighbour links"
                : `By the first ${view === "2d" ? "two" : "three"} principal components`}
            </small>
          </div>
          <div>
            <span>{view === "network" ? "LAYOUT" : "DISTANCE DISTORTION"}</span>
            <strong>
              {view === "network"
                ? "Force-directed"
                : `${((stress ?? 0) * 100).toFixed(1)}%`}
            </strong>
            <small>
              {view === "network"
                ? "Screen distance does not encode similarity"
                : "Normalized stress · lower is more faithful"}
            </small>
          </div>
          <div>
            <span>MODEL</span>
            <strong>
              {displayedRecipe === "scale"
                ? "Numeric field vectors"
                : structured
                  ? "Recorded field similarity"
                  : (experiment?.model ?? data?.model)?.replace("openai/", "")}
            </strong>
            <small>
              {displayedRecipe === "scale" || structured
                ? "Calculated locally · no model calls"
                : experiment
                  ? "Experiment cached · switching views makes no model calls"
                  : "Prepared in advance · no model calls while browsing"}
            </small>
          </div>
        </div>
      )}
      <details className="vs-method">
        <summary>
          <CircleHelp size={14} /> What determines the position?
        </summary>
        <div>
          {experiment && (
            <p>
              Current experiment:{" "}
              {comparisonMode === "joint"
                ? "one embedding of all selected fields together"
                : "equal-weight concatenation of separately normalized field embeddings"}
              . Both comparison maps include only projects with every selected
              field recorded, so missing values do not shape similarity. Field
              changes remain drafts until Run comparison.
            </p>
          )}
          {recipe === "scale" ? (
            <p>
              The selected measurements form numeric vectors. Complexity uses
              its 1–5 scale; team size, rebuild effort and code size use log(1 +
              value), then the range of the active complete projects. Each
              varying field has equal weight. Both endpoints of a recorded range
              share that field’s weight. Constant fields add no distance and are
              ignored. Missing values are never filled with zero; effort needs a
              recorded rebuild-estimate basis. Filters refit scaling, projection
              and clustering. Numbers describe project context, not personal
              authorship, actual historic effort or quality. Positions are
              principal-component projections, computed with classical
              multidimensional scaling. Axis descriptions use the measurement
              most correlated with that direction.
            </p>
          ) : structured ? (
            <p>
              This lens compares recorded fields with equal weight. Categories
              use normalized indicator vectors: exact shared values make
              projects closer, regardless of how many tags a field contains.
              Contribution also uses team-size ranges: log(1 + size), scaled to
              the current population; both endpoints share one field’s weight.
              Constant fields contribute no distance. Missing required values
              are excluded rather than filled with zero. Working pattern is a
              recorded category, not an estimate of availability or effort.
              Proximity is one minus the mean field dissimilarity. The
              projection uses the corresponding Euclidean distance, √(2 − 2 ×
              proximity).
            </p>
          ) : (
            <p>
              This embedding combines its listed fields into one text per
              project, then embeds that text into{" "}
              {data?.dimensions.toLocaleString("en") ?? "a high number of"}{" "}
              dimensions. Names and client identities are not added as fields.
              Positions in 2D and 3D are principal-component projections of
              normalized vectors (computed with classical multidimensional
              scaling). Projection directions have no inherent business meaning.
              Recorded traits describe clusters with supporting counts instead
              of pretending that opposite ends of an axis are opposing skills.
            </p>
          )}
          <p>
            Only part of the original geometry fits on screen. Use the neighbour
            ranking for similarity in the full space; the projection is an
            overview. Across clusters highlights the selected project’s group
            and its closest project in each other group. The sidebar compares
            recorded tag frequencies between those groups, not inferred causes
            of clustering. Closest matches instead ranks up to five individual
            projects, regardless of cluster. Colours identify medoid clusters
            computed separately for the current data; their numbers are local to
            a map. In 3D, lines connect the selected project to the displayed
            matches. Network lines retain the nearest-neighbour graph and do not
            change with the sidebar mode. Connections do not establish
            collaboration or measured business outcomes.
          </p>
          {space?.clustering && (
            <p>
              Automatic grouping tests feasible counts from 2 to 10, with at
              least two projects per group and three deterministic PAM starts.
              It refits 12 subsets containing 80% of the projects, then picks
              the smallest count within one standard error of the best mean
              resampled silhouette. This is a simplicity heuristic, not a
              confidence interval. Stability is mean adjusted Rand agreement on
              retained projects; it is not accuracy. If no eligible separated
              partition is found, the map remains one group. Current separation:{" "}
              {space.clustering.silhouette?.toFixed(3) ?? "not applicable"};
              stability:{" "}
              {space.clustering.stability?.toFixed(3) ?? "not applicable"}.
            </p>
          )}
          <p>
            Faint convex envelopes surround each cluster in the displayed
            projection, with a small margin for the dots. Envelopes can overlap;
            they do not mark exclusive territories or a confidence interval.
            Turn off Clusters for an unobstructed view.
          </p>
          <p>
            Bubble size uses the recorded wow-factor, a subjective portfolio
            rating from 1 to 10. Circle area scales with the rating; perspective
            also affects apparent size in 3D. Unscored projects use a small
            fallback marker. Visual sizing does not affect embeddings, cluster
            membership or neighbour rankings.
            {experiment?.fields.includes("wowFactor") &&
              " This experiment separately includes Wow factor as an embedding field, so the recorded rating also influences similarity."}
          </p>
          {data && recipe !== "scale" && (
            <p>
              {structured ? "Source refreshed" : "Embedding cache"}:{" "}
              {(structured ? data.sourceRefreshedAt : data.generatedAt)?.slice(
                0,
                10,
              ) ?? "Date not recorded"}
              .
              {structured
                ? "Required fields must be recorded; this map is rebuilt locally when the snapshot is prepared."
                : "Missing or changed embedding inputs are excluded until regenerated."}{" "}
              {space?.excluded.length ?? 0} projects excluded in this lens.
            </p>
          )}
          {!!space?.excluded.length && (
            <ul>
              {space.excluded.map((e) => (
                <li key={e.id}>
                  {projectById.get(e.id)?.label ?? e.id}: {e.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </div>
  );
}
