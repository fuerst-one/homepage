"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { EChartsOption, EChartsType } from "echarts";
import type { LabProject, SemanticPair } from "./analysis";
import { projectIdentityLabels } from "./analysis";
import {
  lensSpace,
  medoidClusters,
  projectDistances,
  neighbourEdges,
  clusterCrossings,
  networkCoverage,
  type Lens,
  type WeightedEdge,
} from "./clustering";
import {
  EChart,
  baseOption,
  ChartRecords,
  palette,
  INK,
  ACCENT,
  escapeHtml,
  shortName,
  graphSpringForces,
} from "./chartPrimitives";

export type ClusterTab = "clusters" | "physics" | "crossings";
type Props = {
  view: ClusterTab;
  projects: LabProject[];
  similarities: SemanticPair[];
  onSelect: (label: string, ids: string[]) => void;
  onClearSelection: () => void;
};
type ViewProps = Omit<Props, "view">;
const lensLabels: Record<Lens, string> = {
  tools: "Tools only",
  needs: "Buyer needs only",
  context: "Case context · words only",
};
const lensNotes: Record<Lens, string> = {
  tools:
    "Jaccard distance between recorded tool tags. Languages, needs and prose are excluded.",
  needs:
    "Jaccard distance between recorded buyer-need tags. Tools, domains and prose are excluded.",
  context:
    "Cosine distance between binary TF-IDF vectors of English case summaries only. Lexical similarity, not an embedding model; no stemming. Weights are fitted to the current scope.",
};
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
function LensSelect({
  label,
  value,
  onChange,
  semantic = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  semantic?: boolean;
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {Object.entries(lensLabels).map(([id, text]) => (
          <option key={id} value={id}>
            {text}
          </option>
        ))}
        {semantic && (
          <option value="semantic">Full embeddings · mixed input</option>
        )}
      </select>
    </label>
  );
}
function Heading({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="lab-section-heading">
      <div>
        <p className="lab-kicker">{number} / Different connections</p>
        <h2>{title}</h2>
      </div>
      <p>{children}</p>
    </div>
  );
}
export function ClusterViews({ view, ...props }: Props) {
  if (!props.projects.length) return null;
  if (view === "clusters") return <FocusedClusters {...props} />;
  if (view === "physics") return <PhysicsNetwork {...props} />;
  return <CrossLens {...props} />;
}

function FocusedClusters({ projects, onSelect, onClearSelection }: ViewProps) {
  const [lens, setLens] = useState<Lens>("needs");
  const [k, setK] = useState(5);
  const [display, setDisplay] = useState("matrix");
  const space = useMemo(() => lensSpace(projects, lens), [projects, lens]);
  const groups = useMemo(() => medoidClusters(space, k), [space, k]);
  const projection = useMemo(() => projectDistances(space.distances), [space]);
  const names = new Map(projects.map((p) => [p.id, shortName(p.name)]));
  const bound =
    Math.max(0.1, ...projection.points.flatMap((p) => p.map(Math.abs))) * 1.22;
  const membership = new Map(
    groups.flatMap((g, i) => g.ids.map((id) => [id, i] as const)),
  );
  const option: EChartsOption = {
    ...baseOption,
    grid: { left: 45, right: 45, top: 45, bottom: 45 },
    xAxis: { type: "value", min: -bound, max: bound, show: false },
    yAxis: { type: "value", min: -bound, max: bound, show: false },
    tooltip: {
      ...baseOption.tooltip,
      formatter: (input: unknown) => {
        const p = input as { data: { id: string } };
        const g = groups[membership.get(p.data.id)!];
        return `${escapeHtml(names.get(p.data.id) ?? "")}<br/>Exemplar: ${escapeHtml(names.get(g.medoid) ?? "")}<br/>${g.terms.map(escapeHtml).join(" · ")}`;
      },
    },
    series: [
      {
        type: "scatter",
        symbolSize: 16,
        data: space.ids.map((id, i) => ({
          id,
          name: names.get(id),
          value: projection.points[i],
          symbolSize: groups.some((g) => g.medoid === id) ? 25 : 14,
          itemStyle: {
            color: palette[membership.get(id)! % palette.length],
            borderColor: "#101a15",
            borderWidth: 2,
          },
        })),
        label: {
          show: true,
          position: "top",
          color: INK,
          fontSize: 10,
          formatter: (p) =>
            p.name.length > 18 ? `${p.name.slice(0, 17)}…` : p.name,
        },
        labelLayout: { hideOverlap: true },
        emphasis: { scale: 1.5 },
      },
    ],
  };
  const ordered = groups.flatMap((g) => g.ids);
  const indexes = new Map(space.ids.map((id, i) => [id, i]));
  const matrixOption: EChartsOption = {
    ...baseOption,
    grid: { left: 190, right: 45, top: 155, bottom: 65 },
    xAxis: {
      type: "category",
      data: ordered,
      position: "top",
      axisLabel: {
        interval: 0,
        rotate: 60,
        color: INK,
        fontSize: 9,
        formatter: (id) => (names.get(id) ?? id).slice(0, 20),
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: "category",
      data: ordered,
      inverse: true,
      axisLabel: {
        interval: 0,
        color: INK,
        fontSize: 9,
        formatter: (id) => (names.get(id) ?? id).slice(0, 25),
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    visualMap: {
      min: 0,
      max: 1,
      orient: "horizontal",
      left: 190,
      bottom: 5,
      inRange: { color: ["#14251d", "#366a54", ACCENT] },
      text: ["Identical input", "No overlap"],
      textStyle: { color: INK },
    },
    tooltip: {
      ...baseOption.tooltip,
      formatter: (input: unknown) => {
        const p = input as { data: { ids: string[]; value: number[] } };
        return `${p.data.ids.map((id) => escapeHtml(names.get(id) ?? id)).join(" ↔ ")}<br/>${percent(p.data.value[2])} similarity`;
      },
    },
    series: [
      {
        type: "heatmap",
        data: ordered.flatMap((a, y) =>
          ordered.map((b, x) => ({
            value: [
              x,
              y,
              1 - space.distances[indexes.get(a)!][indexes.get(b)!],
            ],
            ids: [...new Set([a, b])],
            itemStyle: {
              borderColor:
                membership.get(a) === membership.get(b) ? "#66836b" : "#101a15",
              borderWidth: 0.5,
            },
          })),
        ),
        emphasis: { itemStyle: { borderColor: ACCENT, borderWidth: 2 } },
      },
    ],
  };
  return (
    <>
      <Heading number="09" title="One lens at a time.">
        Groups use the original distances from one field. The map is a separate
        2D approximation; the axes have no business meaning.
      </Heading>
      <div className="lab-inline-controls">
        <LensSelect
          label="Cluster lens"
          value={lens}
          onChange={(value) => {
            setLens(value as Lens);
            onClearSelection();
          }}
        />
        <label>
          Display
          <select value={display} onChange={(e) => setDisplay(e.target.value)}>
            <option value="matrix">Exact similarity matrix</option>
            <option value="map">2D approximation</option>
          </select>
        </label>
        <label>
          Requested groups
          <select
            value={k}
            onChange={(e) => {
              setK(Number(e.target.value));
              onClearSelection();
            }}
          >
            {[2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="lab-method">
        {lensNotes[lens]} {space.ids.length} included; {space.excluded.length}{" "}
        without usable input. {groups.length} groups.
      </p>
      {space.ids.length > 0 && display === "matrix" && (
        <div className="lab-chart-scroll">
          <div style={{ minWidth: 1000 }}>
            <EChart
              option={matrixOption}
              style={{ height: Math.max(500, ordered.length * 17 + 220) }}
              onEvents={{
                click: (p: { data: { ids: string[] } }) =>
                  onSelect(
                    p.data.ids.map((id) => names.get(id)).join(" ↔ "),
                    p.data.ids,
                  ),
              }}
            />
          </div>
        </div>
      )}
      {space.ids.length ? (
        <div
          className={
            display === "map" ? "lab-cluster-layout" : "lab-cluster-groups"
          }
        >
          {display === "map" && (
            <div className="lab-cluster-square">
              <EChart
                option={option}
                style={{ width: "100%", height: "100%" }}
                onEvents={{
                  click: (p: { data: { id: string } }) =>
                    onSelect(names.get(p.data.id) ?? "Project", [p.data.id]),
                }}
              />
            </div>
          )}
          <aside className="lab-cluster-legend">
            <p className="lab-kicker">Original-space groups</p>
            {groups.map((g, i) => (
              <button
                key={g.medoid}
                onClick={() =>
                  onSelect(`Group ${i + 1} · ${names.get(g.medoid)}`, g.ids)
                }
              >
                <span style={{ color: palette[i % palette.length] }}>
                  ● Group {i + 1} · {g.ids.length}
                </span>
                <strong>{names.get(g.medoid)}</strong>
                <small>{g.terms.join(" · ")}</small>
              </button>
            ))}
          </aside>
        </div>
      ) : (
        <p className="lab-empty">No recorded inputs for this lens.</p>
      )}
      <div className="lab-notes">
        <p>
          <b>{percent(projection.stress)} projection stress</b> · normalized
          distance error, lower is better. High stress means nearby dots can
          mislead; use group membership and source records. Identical inputs can
          overlap. The matrix shows exact similarities in cluster order, with no
          projection loss. Click a cell to compare its projects.
        </p>
        <p>
          Deterministic k-medoids with best single swaps; a local optimum, not a
          discovered ground truth. Larger dots are actual exemplar projects.
          Colours identify groups within this view only.
        </p>
      </div>
      <ChartRecords
        rows={[
          ...groups.map((g, i) => ({
            label: `Group ${i + 1}: ${names.get(g.medoid)} · ${g.terms.join(" / ")}`,
            ids: g.ids,
          })),
          ...space.ids.map((id) => ({
            label: `Project: ${names.get(id)}`,
            ids: [id],
          })),
          ...(display === "matrix"
            ? ordered.flatMap((a, i) =>
                ordered.slice(i + 1).map((b) => ({
                  label: `${names.get(a)} ↔ ${names.get(b)} · ${percent(1 - space.distances[indexes.get(a)!][indexes.get(b)!])}`,
                  ids: [a, b],
                })),
              )
            : []),
          ...(space.excluded.length
            ? [{ label: "Missing input", ids: space.excluded }]
            : []),
        ]}
        onSelect={onSelect}
      />
    </>
  );
}

function PhysicsNetwork({
  projects,
  similarities,
  onSelect,
  onClearSelection,
}: ViewProps) {
  const [lens, setLens] = useState<Lens | "semantic">("semantic");
  const [k, setK] = useState(2);
  const [minimum, setMinimum] = useState(0.3);
  const [repulsion, setRepulsion] = useState(260);
  const [motion, setMotion] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const [focus, setFocus] = useState("");
  const space = useMemo(
    () => (lens === "semantic" ? null : lensSpace(projects, lens)),
    [projects, lens],
  );
  const ids = useMemo(
    () => space?.ids ?? projects.map((p) => p.id),
    [space, projects],
  );
  const pairs = useMemo<WeightedEdge[]>(
    () =>
      space
        ? space.ids.flatMap((a, i) =>
            space.ids.slice(i + 1).map((b, j) => ({
              a,
              b,
              value: 1 - space.distances[i][i + j + 1],
            })),
          )
        : similarities.map((p) => ({ a: p.a, b: p.b, value: p.cosine })),
    [space, similarities],
  );
  const edges = useMemo(
    () => neighbourEdges(ids, pairs, k, minimum),
    [ids, pairs, k, minimum],
  );
  const map = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  );
  const included = useMemo(() => ids.map((id) => map.get(id)!), [ids, map]);
  const active = ids.includes(focus) ? focus : "";
  const neighbours = edges
    .filter((e) => e.a === active || e.b === active)
    .sort((a, b) => b.value - a.value);
  const coverage = networkCoverage(ids, pairs, edges);
  const isolates = space
    ? ids.filter((id) => !edges.some((e) => e.a === id || e.b === id))
    : coverage.isolates;
  const unavailable = space ? [] : coverage.unavailable;
  const change = (update: () => void) => {
    update();
    setFocus("");
    onClearSelection();
  };
  const inspect = (id: string) => {
    setFocus(id);
    if (id) onSelect(map.get(id)?.name ?? "Project", [id]);
    else onClearSelection();
  };
  return (
    <>
      <Heading number="10" title="Let the connections pull.">
        Springs attract connected projects; repulsion spreads them out. Drag
        nodes, pan and zoom. Click a project to trace its neighbourhood without
        restarting the layout.
      </Heading>
      <div className="lab-inline-controls">
        <LensSelect
          label="Network lens"
          value={lens}
          semantic
          onChange={(value) =>
            change(() => setLens(value as Lens | "semantic"))
          }
        />
        <label>
          Neighbours per project
          <select
            value={k}
            onChange={(e) => change(() => setK(Number(e.target.value)))}
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          Minimum similarity
          <select
            value={minimum}
            onChange={(e) => change(() => setMinimum(Number(e.target.value)))}
          >
            {[0, 0.15, 0.3, 0.45, 0.6, 0.75].map((n) => (
              <option key={n} value={n}>
                {percent(n)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Spread
          <select
            value={repulsion}
            onChange={(e) => setRepulsion(Number(e.target.value))}
          >
            <option value={120}>Compact</option>
            <option value={260}>Balanced</option>
            <option value={520}>Open</option>
          </select>
        </label>
      </div>
      <div className="lab-inline-controls">
        <label>
          Trace project
          <select value={active} onChange={(e) => inspect(e.target.value)}>
            <option value="">All connections</option>
            {included.map((p) => (
              <option key={p.id} value={p.id}>
                {shortName(p.name)}
              </option>
            ))}
          </select>
        </label>
        <label className="lab-checkbox">
          <input
            type="checkbox"
            checked={motion}
            onChange={(e) => setMotion(e.target.checked)}
          />
          Animate relaxation
        </label>
        <button className="lab-action" onClick={() => setEpoch((n) => n + 1)}>
          Restart layout & reset zoom
        </button>
      </div>
      <p className="lab-method">
        {lens === "semantic"
          ? "Existing text embeddings mix title, description, case summary, needs, delivery context and published case prose. Cosine similarity; these inputs cannot be separated retrospectively."
          : lensNotes[lens]}{" "}
        {ids.length} nodes · {edges.length} links · {isolates.length} isolates ·{" "}
        {space
          ? `${space.excluded.length} missing input.`
          : `${unavailable.length} without stored pair comparisons (embedding availability unknown for those projects).`}{" "}
        Links are the union of each project’s strongest qualifying neighbours;
        node degree can exceed the requested count.
      </p>
      <div className="lab-network">
        <PhysicsCanvas
          key={epoch}
          projects={included}
          edges={edges}
          repulsion={repulsion}
          motion={motion}
          focus={active}
          onInspect={inspect}
        />
        <aside className="lab-neighbours">
          <h3>
            {active ? shortName(map.get(active)!.name) : "Follow a thread"}
          </h3>
          <p>
            Node size shows displayed degree; colour shows engagement type.
            Coordinates and spring lengths are navigation, not measured
            distances. Animation starts off; enable it to watch the forces
            settle.
          </p>
          {active && !neighbours.length && (
            <p>
              {unavailable.includes(active)
                ? "No stored pair comparisons for this project; similarity is unknown."
                : "No qualifying links. This project remains visible."}
            </p>
          )}
          {neighbours.map((e) => {
            const id = e.a === active ? e.b : e.a;
            return (
              <button key={id} onClick={() => inspect(id)}>
                <strong>{shortName(map.get(id)!.name)}</strong>
                <span>
                  {percent(e.value)}{" "}
                  {lens === "semantic" || lens === "context"
                    ? "cosine"
                    : "Jaccard"}
                </span>
              </button>
            );
          })}
        </aside>
      </div>
      <ChartRecords
        rows={[
          ...(unavailable.length
            ? [{ label: "No stored pair comparisons", ids: unavailable }]
            : []),
          ...edges.map((e) => ({
            label: `${shortName(map.get(e.a)!.name)} ↔ ${shortName(map.get(e.b)!.name)} · ${percent(e.value)}`,
            ids: [e.a, e.b],
          })),
          ...(isolates.length
            ? [{ label: "Isolated projects", ids: isolates }]
            : []),
          ...(space?.excluded.length
            ? [{ label: "Missing input", ids: space.excluded }]
            : []),
        ]}
        onSelect={onSelect}
      />
    </>
  );
}

/** Focus updates are public highlight actions, never graph option/data updates. */
function applyGraphFocus(
  instance: EChartsType,
  projects: LabProject[],
  focus: string,
) {
  instance.dispatchAction({ type: "downplay", seriesIndex: 0 });
  if (focus)
    instance.dispatchAction({
      type: "highlight",
      seriesIndex: 0,
      dataIndex: projects.findIndex((p) => p.id === focus),
    });
}

export function PhysicsCanvas({
  projects,
  edges,
  repulsion,
  motion,
  focus,
  onInspect,
}: {
  projects: LabProject[];
  edges: WeightedEdge[];
  repulsion: number;
  motion: boolean;
  focus: string;
  onInspect: (id: string) => void;
}) {
  const chart = useRef<EChartsType | null>(null);
  const labels = useMemo(
    () => projectIdentityLabels(projects, shortName),
    [projects],
  );
  const types = useMemo(
    () => [...new Set(projects.map((p) => p.projectType))].sort(),
    [projects],
  );
  const option = useMemo<EChartsOption>(
    () => ({
      ...baseOption,
      aria: {
        enabled: true,
        label: {
          description: `Force network with ${projects.length} projects and ${edges.length} connections. Use Trace project to highlight a neighbourhood, or Chart values and keyboard selection to inspect pairs. Positions have no measurement meaning.`,
        },
      },
      tooltip: {
        ...baseOption.tooltip,
        formatter: (input: unknown) => {
          const p = input as {
            dataType: string;
            data: { id: string; source: string; target: string; value: number };
          };
          const name = (id: string) => escapeHtml(labels.get(id) ?? id);
          return p.dataType === "edge"
            ? `${name(p.data.source)} ↔ ${name(p.data.target)}<br/>${percent(p.data.value)} similarity`
            : `${name(p.data.id)}<br/>${edges.filter((e) => e.a === p.data.id || e.b === p.data.id).length} displayed connections`;
        },
      },
      legend: {
        data: types,
        textStyle: { color: INK },
        selectedMode: false,
        bottom: 0,
      },
      series: [
        {
          id: "physics",
          type: "graph",
          layout: "force",
          roam: true,
          draggable: true,
          zoom: 0.55,
          scaleLimit: { min: 0.2, max: 5 },
          force: graphSpringForces(repulsion, motion),
          categories: types.map((name) => ({ name })),
          data: projects.map((p) => ({
            id: p.id,
            name: p.id,
            value: edges.filter((e) => e.a === p.id || e.b === p.id).length,
            category: types.indexOf(p.projectType),
            symbolSize:
              13 +
              Math.sqrt(
                edges.filter((e) => e.a === p.id || e.b === p.id).length,
              ) *
                6,
            itemStyle: {
              color: palette[types.indexOf(p.projectType) % palette.length],
            },
          })),
          links: edges.map((e) => ({
            source: e.a,
            target: e.b,
            value: e.value,
            lineStyle: { width: 0.7 + 2 * e.value },
          })),
          label: {
            show: true,
            position: "right",
            formatter: (p) => labels.get(p.name) ?? "",
            fontSize: 10,
            color: INK,
          },
          labelLayout: { hideOverlap: true },
          lineStyle: { color: "source", opacity: 0.3, curveness: 0.08 },
          emphasis: {
            focus: "adjacency",
            lineStyle: { opacity: 1, width: 3 },
            label: { show: true, color: ACCENT },
          },
          blur: {
            itemStyle: { opacity: 0.15 },
            lineStyle: { opacity: 0.04 },
            label: { opacity: 0.15 },
          },
        },
      ],
    }),
    [projects, edges, repulsion, motion, types, labels],
  );
  useEffect(() => {
    if (chart.current) applyGraphFocus(chart.current, projects, focus);
  }, [focus, projects, option]);
  const restoreTrace = () =>
    queueMicrotask(() => {
      // ECharts clears adjacency blur after hover/drag. Restore the trace afterwards.
      const instance = chart.current;
      if (focus && instance && !instance.isDisposed())
        applyGraphFocus(instance, projects, focus);
    });
  return (
    <EChart
      option={option}
      style={{ height: 660 }}
      onChartReady={(instance: EChartsType) => {
        chart.current = instance;
        applyGraphFocus(instance, projects, focus);
      }}
      onEvents={{
        mouseout: restoreTrace,
        globalout: restoreTrace,
        click: (p: { dataType: string; data: { id: string } }) => {
          if (p.dataType === "node") onInspect(p.data.id);
        },
      }}
    />
  );
}

function CrossLens({
  projects,
  similarities,
  onSelect,
  onClearSelection,
}: ViewProps) {
  const [left, setLeft] = useState<Lens>("tools"),
    [right, setRight] = useState<Lens>("needs");
  const [k, setK] = useState(5);
  const leftSpace = useMemo(() => lensSpace(projects, left), [projects, left]);
  const rightSpace = useMemo(
    () => lensSpace(projects, right),
    [projects, right],
  );
  const leftGroups = useMemo(
    () => medoidClusters(leftSpace, k),
    [leftSpace, k],
  );
  const rightGroups = useMemo(
    () => medoidClusters(rightSpace, k),
    [rightSpace, k],
  );
  const flow = useMemo(
    () =>
      clusterCrossings(
        projects.map((p) => p.id),
        leftGroups,
        rightGroups,
      ),
    [projects, leftGroups, rightGroups],
  );
  const names = new Map(projects.map((p) => [p.id, shortName(p.name)]));
  const label = (name: string) => {
    const node = flow.nodes.find((n) => n.name === name)!;
    const groups = node.depth === 0 ? leftGroups : rightGroups;
    return node.unknown
      ? "Missing input"
      : `${groups.indexOf(node.group!) + 1}. ${names.get(node.group!.medoid)}`;
  };
  const option: EChartsOption = {
    ...baseOption,
    aria: {
      enabled: true,
      label: {
        description: `Cross-lens flow from ${lensLabels[left]} to ${lensLabels[right]}. Each side contains ${projects.length} projects, including missing inputs. Use Chart values and keyboard selection to inspect group membership and flows.`,
      },
    },
    tooltip: {
      ...baseOption.tooltip,
      formatter: (input: unknown) => {
        const p = input as {
          data: {
            ids: string[];
            name?: string;
            source?: string;
            target?: string;
          };
        };
        return `${p.data.source ? `${escapeHtml(label(p.data.source))} → ${escapeHtml(label(p.data.target!))}` : escapeHtml(label(p.data.name!))}<br/>${p.data.ids.length} projects<br/>${p.data.ids.map((id) => escapeHtml(names.get(id) ?? id)).join("<br/>")}`;
      },
    },
    series: [
      {
        type: "sankey",
        left: 220,
        right: 230,
        top: 30,
        bottom: 30,
        nodeGap: 32,
        nodeWidth: 15,
        draggable: false,
        layoutIterations: 32,
        emphasis: { focus: "adjacency" },
        label: { color: INK, fontSize: 11, formatter: (p) => label(p.name) },
        data: flow.nodes.map((node) => ({
          ...node,
          itemStyle: {
            color: node.unknown
              ? "#6d7b73"
              : palette[
                  (node.depth === 0 ? leftGroups : rightGroups).indexOf(
                    node.group!,
                  ) % palette.length
                ],
          },
          label: {
            position: node.depth === 0 ? ("left" as const) : ("right" as const),
          },
        })),
        links: flow.links.map((e) => ({ ...e, value: e.ids.length })),
        lineStyle: { color: "gradient", opacity: 0.4, curveness: 0.5 },
      },
    ],
  };
  // Compare within-lens ranks rather than subtracting unlike similarity scales.
  const pairs = projects.flatMap((a, i) =>
    projects.slice(i + 1).flatMap((b) => {
      const ai = leftSpace.ids.indexOf(a.id),
        bi = leftSpace.ids.indexOf(b.id),
        ar = rightSpace.ids.indexOf(a.id),
        br = rightSpace.ids.indexOf(b.id);
      if ([ai, bi, ar, br].some((i) => i < 0)) return [];
      return [
        {
          a: a.id,
          b: b.id,
          l: 1 - leftSpace.distances[ai][bi],
          r: 1 - rightSpace.distances[ar][br],
        },
      ];
    }),
  );
  const candidates = pairs
    .filter((p) => p.l === 0 && p.r > 0)
    .sort(
      (a, b) => b.r - a.r || a.a.localeCompare(b.a) || a.b.localeCompare(b.b),
    )
    .slice(0, 8);
  return (
    <>
      <Heading number="11" title="Same projects. New neighbours.">
        Follow each project between independently fitted groups. Wide ribbons
        show reusable connections between a way of building and a kind of
        problem.
      </Heading>
      <div className="lab-inline-controls">
        <LensSelect
          label="Left lens"
          value={left}
          onChange={(v) => {
            setLeft(v as Lens);
            onClearSelection();
          }}
        />
        <LensSelect
          label="Right lens"
          value={right}
          onChange={(v) => {
            setRight(v as Lens);
            onClearSelection();
          }}
        />
        <label>
          Groups per lens
          <select
            value={k}
            onChange={(e) => {
              setK(Number(e.target.value));
              onClearSelection();
            }}
          >
            {[3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="lab-method">
        Left: {lensNotes[left]} Right: {lensNotes[right]} Both sides total{" "}
        {projects.length} projects, including missing inputs. Names identify
        exemplar projects, not inferred themes. Colours are local to each side;
        matching colours do not imply matching groups.{" "}
        {left === right &&
          "Both lenses are identical; this is a useful identity check."}
      </p>
      <div className="lab-chart-scroll">
        <div className="lab-cross-flow">
          <div className="lab-cross-headings">
            <span>{lensLabels[left]}</span>
            <span>{lensLabels[right]}</span>
          </div>
          <EChart
            option={option}
            style={{ height: 650 }}
            onEvents={{
              click: (p: {
                data: {
                  ids: string[];
                  source?: string;
                  target?: string;
                  name?: string;
                };
              }) =>
                onSelect(
                  p.data.source
                    ? `${label(p.data.source)} → ${label(p.data.target!)}`
                    : label(p.data.name!),
                  p.data.ids,
                ),
            }}
          />
        </div>
      </div>
      <ChartRecords
        rows={[
          ...flow.nodes.map((n) => ({
            label: `${n.depth === 0 ? "Left" : "Right"}: ${label(n.name)} · ${n.group?.terms.join(" / ") ?? "unknown"}`,
            ids: n.ids,
          })),
          ...flow.links.map((e) => ({
            label: `${label(e.source)} → ${label(e.target)}`,
            ids: e.ids,
          })),
        ]}
        onSelect={onSelect}
      />
      <h3 className="lab-cross-title">Connections you might overlook</h3>
      <p className="lab-method">
        Pairs with zero recorded similarity on the left and positive similarity
        on the right, ordered by right-lens similarity. These are exploratory
        leads; missing inputs are excluded. Existing full-embedding cosine is
        shown separately where available.
      </p>
      {!candidates.length ? (
        <p className="lab-empty">
          No such pairs in this scope and lens combination.
        </p>
      ) : (
        <div className="lab-chart-table">
          <table>
            <thead>
              <tr>
                <th scope="col">Project pair</th>
                <th scope="col">Left similarity</th>
                <th scope="col">Right similarity</th>
                <th scope="col">Full embedding cosine</th>
                <th scope="col">Inspect</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((p) => {
                const cosine = similarities.find(
                  (e) =>
                    (e.a === p.a && e.b === p.b) ||
                    (e.a === p.b && e.b === p.a),
                )?.cosine;
                return (
                  <tr key={`${p.a}:${p.b}`}>
                    <th scope="row">
                      {names.get(p.a)} ↔ {names.get(p.b)}
                    </th>
                    <td>{percent(p.l)}</td>
                    <td>{percent(p.r)}</td>
                    <td>
                      {cosine === undefined ? "Unknown" : percent(cosine)}
                    </td>
                    <td>
                      <button
                        onClick={() =>
                          onSelect(`${names.get(p.a)} ↔ ${names.get(p.b)}`, [
                            p.a,
                            p.b,
                          ])
                        }
                      >
                        Compare →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
