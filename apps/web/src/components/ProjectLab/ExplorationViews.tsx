"use client";

import { useMemo, useState } from "react";
import type { CustomSeriesRenderItem, EChartsOption } from "echarts";
import type { LabProject, SemanticPair } from "./analysis";
import {
  projectFlow,
  capabilityPairs,
  semanticFamilies,
  coverageShortlist,
  type FamilyNode,
} from "./explorations";
import {
  EChart,
  baseOption,
  ChartRecords,
  palette,
  ACCENT,
  TEAL,
  INK,
  escapeHtml,
  shortName,
} from "./chartPrimitives";

export type ExplorationTab = "flow" | "bundles" | "families" | "shortlist";
type Props = {
  view: ExplorationTab;
  projects: LabProject[];
  similarities: SemanticPair[];
  onSelect: (label: string, ids: string[]) => void;
  onClearSelection: () => void;
};
export function ExplorationViews({ view, ...props }: Props) {
  if (!props.projects.length && view !== "shortlist") return null;
  if (view === "flow") return <DeliveryFlow {...props} />;
  if (view === "bundles") return <SkillPairings {...props} />;
  if (view === "families") return <SemanticFamilies {...props} />;
  return <CaseShortlist {...props} />;
}
type ViewProps = Omit<Props, "view">;
export function ViewHeading({
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
        <p className="lab-kicker">{number} / Another lens</p>
        <h2>{title}</h2>
      </div>
      <p>{children}</p>
    </div>
  );
}
function DeliveryFlow({ projects, onSelect }: ViewProps) {
  const flow = useMemo(() => projectFlow(projects), [projects]);
  const nodes = new Map(flow.nodes.map((node) => [node.id, node]));
  const names = new Map(projects.map((p) => [p.id, p.name]));
  const nodeLabel = (id: string) => nodes.get(id)?.label ?? id;
  const option: EChartsOption = {
    ...baseOption,
    tooltip: {
      ...baseOption.tooltip,
      formatter: (input: unknown) => {
        const p = input as {
          data: {
            ids: string[];
            source?: string;
            target?: string;
            name?: string;
          };
        };
        return `${p.data.ids.length} projects<br/>${p.data.ids.map((id) => escapeHtml(shortName(names.get(id) ?? id))).join("<br/>")}`;
      },
    },
    series: [
      {
        type: "sankey",
        left: 10,
        right: 245,
        top: 24,
        bottom: 20,
        nodeWidth: 16,
        nodeGap: 26,
        draggable: false,
        layoutIterations: 48,
        orient: "horizontal",
        emphasis: { focus: "adjacency" },
        label: {
          color: INK,
          fontSize: 11,
          formatter: (p) => {
            const n = nodes.get(p.name);
            return `${n?.label ?? p.name} (${n?.ids.length ?? 0})`;
          },
        },
        data: flow.nodes.map((node, i) => ({
          name: node.id,
          ids: node.ids,
          depth: node.stage,
          itemStyle: {
            color:
              palette[(node.stage === 0 ? i : node.stage + 1) % palette.length],
          },
        })),
        links: flow.links.map((link) => ({ ...link, value: link.ids.length })),
        lineStyle: { color: "gradient", opacity: 0.35, curveness: 0.5 },
      },
    ],
  };
  return (
    <>
      <ViewHeading number="05" title="How the work takes shape.">
        Follow the same projects from engagement type through ownership to
        outcome provenance. Every column totals {projects.length} projects.
        Flows describe the records; they do not imply that one delivery model
        causes better outcomes.
      </ViewHeading>
      <div className="lab-chart-scroll">
        <div className="lab-flow-chart">
          <div className="lab-flow-headings">
            <span>Engagement type</span>
            <span>Ownership</span>
            <span>Outcome basis</span>
          </div>
          <EChart
            option={option}
            replaceMerge={["series"]}
            style={{ height: 650, minWidth: 1000 }}
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
                    ? `${nodeLabel(p.data.source)} → ${nodeLabel(p.data.target!)}`
                    : nodeLabel(p.data.name!),
                  p.data.ids,
                ),
            }}
          />
        </div>
      </div>
      <ChartRecords
        rows={[
          ...flow.nodes.map((node) => ({
            label: `Category ${node.stage + 1}: ${node.label}`,
            ids: node.ids,
          })),
          ...flow.links.map((link) => ({
            label: `Flow ${link.stage + 1}: ${nodeLabel(link.source)} → ${nodeLabel(link.target)}`,
            ids: link.ids,
          })),
        ]}
        onSelect={onSelect}
      />
      <p className="lab-caption">
        Each band counts distinct projects between adjacent columns. A route
        through an ownership node does not identify an individual project’s
        outcome; inspect the underlying records. Unknown source labels remain
        visible.
      </p>
    </>
  );
}
function SkillPairings({ projects, onSelect }: ViewProps) {
  const [field, setField] = useState<"capabilities" | "buyerNeeds">(
    "capabilities",
  );
  const [minimum, setMinimum] = useState(3);
  const [sort, setSort] = useState("lift");
  const allPairs = useMemo(
    () => capabilityPairs(projects, field, minimum),
    [projects, field, minimum],
  );
  const pairs = (
    sort === "lift"
      ? allPairs
      : allPairs
          .slice()
          .sort((a, b) => b.ids.length - a.ids.length || b.lift - a.lift)
  ).slice(0, 16);
  const option: EChartsOption = {
    ...baseOption,
    grid: { left: 340, right: 180, top: 25, bottom: 60 },
    xAxis: {
      type: "value",
      min: 0,
      minInterval: sort === "lift" ? undefined : 1,
      name:
        sort === "lift"
          ? "Lift versus independent occurrence"
          : "Projects with both labels",
      nameLocation: "middle",
      nameGap: 35,
      axisLabel: {
        color: INK,
        formatter: sort === "lift" ? "{value}×" : "{value}",
      },
      splitLine: { lineStyle: { color: "#26392e" } },
    },
    yAxis: {
      type: "category",
      inverse: true,
      data: pairs.map((p) => `${p.a}\n+ ${p.b}`),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: INK, fontSize: 10, lineHeight: 16 },
    },
    tooltip: {
      ...baseOption.tooltip,
      formatter: (input: unknown) => {
        const p = pairs[(input as { dataIndex: number }).dataIndex];
        return `${escapeHtml(p.a)} + ${escapeHtml(p.b)}<br/>Together: ${p.ids.length} / ${projects.length} projects<br/>${escapeHtml(p.a)}: ${p.supportA} · ${escapeHtml(p.b)}: ${p.supportB}<br/>Lift ${p.lift.toFixed(2)}×`;
      },
    },
    series: [
      {
        type: "bar",
        barMaxWidth: 13,
        itemStyle: { color: TEAL },
        data: pairs.map((p) => ({
          value: sort === "lift" ? p.lift : p.ids.length,
          ids: p.ids,
        })),
        label: {
          show: true,
          position: "right",
          color: INK,
          fontSize: 10,
          formatter: (p) => {
            const pair = pairs[p.dataIndex];
            return `${pair.lift.toFixed(1)}× · ${pair.ids.length} projects`;
          },
        },
        markLine:
          sort === "lift"
            ? {
                symbol: "none",
                silent: true,
                label: { formatter: "1×", color: INK },
                lineStyle: { color: "#78917f", type: "dashed" },
                data: [{ xAxis: 1 }],
              }
            : undefined,
      },
    ],
  };
  return (
    <>
      <ViewHeading number="06" title="Capabilities that travel together.">
        Which pairs repeatedly occur in the same project? Lift compares their
        joint share with the product of their separate shares. A value of 1×
        matches that baseline; higher values mean stronger co-occurrence in this
        portfolio.
      </ViewHeading>
      <div className="lab-inline-controls">
        <label>
          Labels
          <select
            value={field}
            onChange={(e) => setField(e.target.value as typeof field)}
          >
            <option value="capabilities">Capability tags</option>
            <option value="buyerNeeds">Buyer needs</option>
          </select>
        </label>
        <label>
          Minimum joint projects
          <select
            value={minimum}
            onChange={(e) => setMinimum(Number(e.target.value))}
          >
            {[2, 3, 4, 5, 8].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          Order by
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="lift">Stronger association</option>
            <option value="count">More projects</option>
          </select>
        </label>
      </div>
      {!pairs.length ? (
        <p className="lab-empty">
          No pairs meet this minimum in the current scope. Lower the minimum or
          broaden the project filters.
        </p>
      ) : (
        <>
          <div className="lab-chart-scroll">
            <EChart
              option={option}
              replaceMerge={["series"]}
              style={{
                height: Math.max(330, pairs.length * 48 + 90),
                minWidth: 930,
              }}
              onEvents={{
                click: (p: { dataIndex: number }) => {
                  const pair = pairs[p.dataIndex];
                  onSelect(`${pair.a} + ${pair.b}`, pair.ids);
                },
              }}
            />
          </div>
          <ChartRecords
            rows={pairs.map((p) => ({
              label: `${p.a} + ${p.b} · ${p.lift.toFixed(2)}× lift`,
              ids: p.ids,
            }))}
            onSelect={onSelect}
          />
        </>
      )}
      <p className="lab-caption">
        Showing {pairs.length} of {allPairs.length} qualifying pairs,
        recalculated within the global project scope. Rare labels can produce
        high lift: always read the joint count alongside it. These are
        overlapping, descriptive associations with no significance test or
        causal interpretation. Tags under review in the audit remain part of the
        recorded data.
      </p>
    </>
  );
}
function SemanticFamilies({
  projects,
  similarities,
  onSelect,
  onClearSelection,
}: ViewProps) {
  const [cut, setCut] = useState(0.5);
  const tree = useMemo(
    () => semanticFamilies(projects, similarities, cut),
    [projects, similarities, cut],
  );
  const names = new Map(projects.map((p) => [p.id, p.name]));
  const leaves: string[] = [],
    segments: { value: number[]; ids: string[]; distance: number }[] = [];
  const layout = (node: FamilyNode): { x: number; y: number } => {
    if (!node.left || !node.right) {
      const y = leaves.length;
      leaves.push(node.ids[0]);
      return { x: 0, y };
    }
    const a = layout(node.left),
      b = layout(node.right),
      x = node.distance;
    segments.push(
      { value: [a.x, a.y, x, a.y], ids: node.ids, distance: x },
      { value: [x, a.y, x, b.y], ids: node.ids, distance: x },
      { value: [x, b.y, b.x, b.y], ids: node.ids, distance: x },
    );
    return { x, y: (a.y + b.y) / 2 };
  };
  for (const root of tree.roots) layout(root);
  const groupForId = new Map(
    tree.groups.flatMap((group, i) => group.ids.map((id) => [id, i] as const)),
  );
  const maxDistance = Math.max(1, ...tree.roots.map((root) => root.distance));
  const renderBranch: CustomSeriesRenderItem = (_params, api) => {
    const a = api.coord([api.value(0), api.value(1)]),
      b = api.coord([api.value(2), api.value(3)]);
    const segment = segments[_params.dataIndex];
    const group = groupForId.get(segment.ids[0]);
    const same = segment.ids.every((id) => groupForId.get(id) === group);
    return {
      type: "line",
      shape: { x1: a[0], y1: a[1], x2: b[0], y2: b[1] },
      style: {
        stroke: same ? palette[group! % palette.length] : "#506359",
        lineWidth: 1.5,
      },
    };
  };
  const option: EChartsOption = {
    ...baseOption,
    grid: { left: 25, right: 300, top: 75, bottom: 30 },
    xAxis: {
      type: "value",
      min: 0,
      max: maxDistance,
      inverse: true,
      position: "top",
      name: "Cosine distance · 0 = closest",
      nameLocation: "middle",
      nameGap: 38,
      axisLabel: { color: INK },
      splitLine: { lineStyle: { color: "#20332a" } },
    },
    yAxis: {
      type: "value",
      min: -1,
      max: leaves.length,
      interval: 1,
      splitLine: { show: false },
      inverse: true,
      position: "right",
      axisLabel: {
        color: INK,
        fontSize: 10,
        width: 265,
        overflow: "truncate",
        formatter: (index: number) =>
          Number.isInteger(index) && leaves[index]
            ? shortName(names.get(leaves[index]) ?? leaves[index])
            : "",
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    tooltip: {
      ...baseOption.tooltip,
      formatter: (input: unknown) => {
        const p = input as { data: { ids: string[]; distance?: number } };
        return `${p.data.ids.length} project${p.data.ids.length === 1 ? "" : "s"}${p.data.distance === undefined ? "" : ` · merge distance ${p.data.distance.toFixed(3)}`}<br/>${p.data.ids.map((id) => escapeHtml(shortName(names.get(id) ?? id))).join("<br/>")}`;
      },
    },
    series: [
      { type: "custom", renderItem: renderBranch, data: segments, clip: true },
      {
        type: "scatter",
        symbolSize: 7,
        data: leaves.map((id, index) => ({
          value: [0, index],
          ids: [id],
          itemStyle: {
            color: palette[(groupForId.get(id) ?? 0) % palette.length],
          },
        })),
        markLine: {
          silent: true,
          symbol: "none",
          label: { formatter: "Family cut", color: INK },
          lineStyle: { color: ACCENT, type: "dashed" },
          data: [{ xAxis: cut }],
        },
      },
    ],
  };
  return (
    <>
      <ViewHeading number="07" title="A family tree of the work.">
        Average-linkage clustering joins the closest groups using mean cosine
        distance across every project pair between them. The horizontal branch
        position shows the actual merge distance. Move the cut to explore
        broader or narrower families.
      </ViewHeading>
      <div className="lab-inline-controls">
        <label className="lab-range-label">
          Family cut: {cut.toFixed(3)}
          <input
            type="range"
            aria-label="Family cut"
            min="0"
            max={maxDistance}
            step="0.025"
            value={cut}
            onChange={(e) => {
              onClearSelection();
              setCut(Number(e.target.value));
            }}
          />
        </label>
        <p className="lab-scope">
          {tree.groups.length} families ·{" "}
          {tree.groups.filter((g) => g.ids.length === 1).length} single-project
          families
        </p>
      </div>
      {segments.length ? (
        <div className="lab-chart-scroll lab-family-scroll">
          <EChart
            option={option}
            notMerge
            style={{
              height: Math.max(370, leaves.length * 24 + 110),
              minWidth: 900,
            }}
            onEvents={{
              click: (p: { data: { ids: string[] } }) =>
                onSelect("Semantic family selection", p.data.ids),
            }}
          />
        </div>
      ) : (
        <p className="lab-empty">
          No compatible project pairs are available in this scope. Projects
          remain separate; missing comparisons are not treated as distance.
        </p>
      )}
      <div className="lab-family-groups">
        {tree.groups.map((group, i) => (
          <button
            key={group.id}
            style={{ borderLeftColor: palette[i % palette.length] }}
            onClick={() => onSelect(`Semantic family ${i + 1}`, group.ids)}
          >
            <span>
              Family {i + 1} · {group.ids.length}{" "}
              {group.ids.length === 1 ? "project" : "projects"}
            </span>
            <strong>
              {group.ids
                .map((id) => shortName(names.get(id) ?? id))
                .join(" · ")}
            </strong>
          </button>
        ))}
      </div>
      <p className="lab-caption">
        Families are algorithmic groups, not manually validated themes. Their
        labels are project names. Multiple roots indicate unavailable
        comparisons; no cross-root distance is invented. The embeddings contain
        case dimensions and uneven case-study depth. A threshold changes the
        grouping, not the stored similarities. Colours repeat when there are
        more than six families; numbered groups identify membership.
      </p>
    </>
  );
}
function CaseShortlist({ projects, onSelect, onClearSelection }: ViewProps) {
  const allNeeds = useMemo(
    () => [...new Set(projects.flatMap((p) => p.matching.buyerNeeds))].sort(),
    [projects],
  );
  const [selected, setSelected] = useState<string[]>(allNeeds);
  const [publishedOnly, setPublishedOnly] = useState(true);
  const needs = [...new Set([...allNeeds, ...selected])].sort();
  const result = useMemo(
    () => coverageShortlist(projects, selected, publishedOnly),
    [projects, selected, publishedOnly],
  );
  const names = new Map(projects.map((p) => [p.id, p.name]));
  const labels = [
    "Start",
    ...result.steps.map((step) =>
      shortName(names.get(step.projectId) ?? step.projectId),
    ),
  ];
  const option: EChartsOption = {
    ...baseOption,
    grid: { left: 45, right: 35, top: 40, bottom: 120 },
    xAxis: {
      type: "category",
      data: labels,
      axisLabel: {
        color: INK,
        fontSize: 10,
        rotate: 25,
        width: 150,
        overflow: "truncate",
      },
      axisLine: { lineStyle: { color: "#365044" } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: Math.max(1, result.targetNeeds.length),
      minInterval: 1,
      name: "Distinct selected needs covered",
      nameTextStyle: { color: INK, fontSize: 10 },
      axisLabel: { color: INK },
      splitLine: { lineStyle: { color: "#26392e" } },
    },
    tooltip: {
      ...baseOption.tooltip,
      trigger: "axis",
      formatter: (input: unknown) => {
        const index = (input as { dataIndex: number }[])[0]?.dataIndex ?? 0;
        const step = result.steps[index - 1];
        return step
          ? `${escapeHtml(labels[index])}<br/>${step.cumulative} / ${result.targetNeeds.length} needs covered<br/>New: ${step.added.map(escapeHtml).join("<br/>")}`
          : "No projects selected yet";
      },
    },
    series: [
      {
        type: "line",
        step: "end",
        symbolSize: 9,
        data: [0, ...result.steps.map((step) => step.cumulative)],
        lineStyle: { color: ACCENT, width: 2 },
        itemStyle: { color: ACCENT },
        areaStyle: { color: "#c5f77a", opacity: 0.06 },
        label: { show: true, position: "top", color: ACCENT },
        markLine: {
          symbol: "none",
          silent: true,
          label: {
            formatter: `Target: ${result.targetNeeds.length}`,
            position: "insideEndTop",
            color: INK,
          },
          lineStyle: { color: TEAL, type: "dashed" },
          data: [{ yAxis: result.targetNeeds.length }],
        },
      },
    ],
  };
  return (
    <>
      <ViewHeading number="08" title="Build a compact case-study set.">
        Choose the buyer needs to demonstrate. Each step adds the eligible
        project covering the most still-uncovered needs. This greedy shortlist
        is a practical starting point, not a guaranteed smallest set or a
        ranking of project quality.
      </ViewHeading>
      <div className="lab-shortlist-controls">
        <label className="lab-checkbox">
          <input
            type="checkbox"
            checked={publishedOnly}
            onChange={(e) => {
              onClearSelection();
              setPublishedOnly(e.target.checked);
            }}
          />
          Published English case studies only
        </label>
        <div className="lab-shortlist-actions">
          <button
            onClick={() => {
              onClearSelection();
              setSelected(allNeeds);
            }}
          >
            Select all needs in scope
          </button>
          <button
            onClick={() => {
              onClearSelection();
              setSelected([]);
            }}
          >
            Clear needs
          </button>
        </div>
      </div>
      <fieldset className="lab-need-options">
        <legend>Buyer needs</legend>
        {needs.map((need) => (
          <label key={need} className="lab-checkbox">
            <input
              type="checkbox"
              checked={selected.includes(need)}
              onChange={(e) => {
                onClearSelection();
                setSelected((current) =>
                  e.target.checked
                    ? [...current, need]
                    : current.filter((n) => n !== need),
                );
              }}
            />
            {need}
            {!allNeeds.includes(need) && (
              <small>Not present in this scope</small>
            )}
          </label>
        ))}
      </fieldset>
      <div className="lab-shortlist-summary" aria-live="polite">
        <strong>
          {result.steps.length}{" "}
          {result.steps.length === 1 ? "project" : "projects"}
        </strong>
        <span>
          cover {result.covered.length} / {result.targetNeeds.length} selected
          needs
        </span>
        <span>{result.eligibleProjects} eligible projects in scope</span>
      </div>
      {!selected.length ? (
        <p className="lab-empty">
          Select at least one buyer need to build a shortlist.
        </p>
      ) : (
        <>
          <div className="lab-chart-scroll">
            <EChart
              option={option}
              notMerge
              style={{ height: 400, minWidth: 800 }}
              onEvents={{
                click: (p: { dataIndex: number }) => {
                  const step = result.steps[p.dataIndex - 1];
                  if (step)
                    onSelect(
                      `Shortlist: ${shortName(names.get(step.projectId) ?? step.projectId)}`,
                      [step.projectId],
                    );
                },
              }}
            />
          </div>
          <ol className="lab-shortlist-steps">
            {result.steps.map((step, i) => (
              <li key={step.projectId}>
                <button
                  onClick={() =>
                    onSelect(`Shortlist step ${i + 1}`, [step.projectId])
                  }
                >
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>
                      {shortName(names.get(step.projectId) ?? step.projectId)}
                    </strong>
                    <p>
                      Adds {step.added.length}: {step.added.join(" · ")}
                    </p>
                  </div>
                  <b>
                    {step.cumulative} / {result.targetNeeds.length}
                  </b>
                </button>
              </li>
            ))}
          </ol>
          {result.uncovered.length > 0 && (
            <p className="lab-caveat">
              Uncovered by eligible records: {result.uncovered.join(" · ")}.
              This is a portfolio-documentation gap, not proof that the
              capability is absent.
            </p>
          )}
          <button
            className="lab-select-shortlist"
            disabled={!result.steps.length}
            onClick={() =>
              onSelect(
                "Complete case-study shortlist",
                result.steps.map((step) => step.projectId),
              )
            }
          >
            Inspect the complete shortlist ↓
          </button>
        </>
      )}
      <p className="lab-caption">
        Coverage comes from recorded Buyer Needs, not inferred from text. Only
        newly covered needs count at each step; ties use project name, then ID.
        Case-study eligibility requires a published EN body. Selected needs
        persist through global scope changes so exclusions remain explicit. The
        shortlist does not validate claims, ownership or outcome evidence;
        inspect each case before using it in an enquiry.
      </p>
    </>
  );
}
