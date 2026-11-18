"use client";

import { useMemo, useState } from "react";
import type { CustomSeriesRenderItem, EChartsOption } from "echarts";
import type { LabProject, SemanticPair } from "./analysis";
import { ViewHeading } from "./ExplorationViews";
import {
  EChart,
  baseOption,
  ChartRecords,
  ACCENT,
  TEAL,
  INK,
  escapeHtml,
  shortName,
} from "./chartPrimitives";
import {
  appealCells,
  evidencePriorities,
  comparableProjects,
  teamIntervals,
  contextCells,
  lifecycleCells,
  rangeLabel,
  validScore,
  type LensCell,
} from "./ownerLenses";

export type OwnerTab =
  "appeal" | "priorities" | "peers" | "context" | "lifecycle";
type Props = {
  view: OwnerTab;
  projects: LabProject[];
  similarities: SemanticPair[];
  fetchedAt: string;
  semanticAt: string;
  onSelect: (label: string, ids: string[]) => void;
  onClearSelection: () => void;
};
type ViewProps = Omit<Props, "view">;
const labels = (values: string[]) => [...new Set(values)];
const words = (value: string, limit: number) => {
  const lines: string[] = [];
  for (const word of value.split(" ")) {
    const last = lines.length - 1;
    if (last < 0 || lines[last].length + word.length + 1 > limit)
      lines.push(word);
    else lines[last] += ` ${word}`;
  }
  return lines.join("\n");
};
const effort = (p: LabProject) =>
  `${rangeLabel(p.assessment?.effortLow, p.assessment?.effortHigh)}${p.assessment?.effortLow != null || p.assessment?.effortHigh != null ? " person-days" : ""}`;
const score = (p: LabProject, field: "wow" | "complexity") => {
  const max = field === "wow" ? 10 : 5,
    n = validScore(p.assessment?.[field], max);
  return n === null ? "Unknown" : `${n}/${max}`;
};

export function OwnerViews({ view, ...props }: Props) {
  if (!props.projects.length) return null;
  return (
    <>
      <p className="lab-source-stamp">
        Notion snapshot · {props.fetchedAt.slice(0, 10)} ·{" "}
        {props.fetchedAt.slice(11, 19)} UTC · {props.projects.length} projects
        in scope
      </p>
      {view === "appeal" && <Appeal {...props} />}
      {view === "priorities" && <EvidencePriorities {...props} />}
      {view === "peers" && <Peers {...props} />}
      {view === "context" && <DeliveryContext {...props} />}
      {view === "lifecycle" && <Lifecycle {...props} />}
    </>
  );
}

function CellChart({
  cells,
  projects,
  onSelect,
  xLabels,
  yLabels,
  xName,
  yName,
  numericY = false,
  heat = false,
}: {
  cells: LensCell[];
  projects: LabProject[];
  onSelect: Props["onSelect"];
  xLabels: string[];
  yLabels: string[];
  xName: string;
  yName: string;
  numericY?: boolean;
  heat?: boolean;
}) {
  const names = new Map(projects.map((p) => [p.id, p.name]));
  if (!cells.length)
    return (
      <p className="lab-empty">No recorded intersections in this scope.</p>
    );
  const maximum = Math.max(1, ...cells.map((c) => c.ids.length));
  const option: EChartsOption = {
    ...baseOption,
    grid: {
      left: numericY ? 75 : 205,
      right: 30,
      top: 30,
      bottom: 75,
      containLabel: false,
    },
    xAxis: {
      type: "category",
      data: xLabels,
      name: xName,
      nameLocation: "middle",
      nameGap: 53,
      axisLabel: {
        color: INK,
        fontSize: 11,
        interval: 0,
        formatter: (value: string) => words(value, 14),
      },
      axisLine: { lineStyle: { color: "#38513f" } },
      splitLine: { show: true, lineStyle: { color: "#23362a" } },
    },
    yAxis: {
      type: "category",
      data: yLabels,
      name: yName,
      nameLocation: "middle",
      nameGap: numericY ? 48 : 180,
      axisLabel: {
        color: INK,
        fontSize: 11,
        formatter: (value: string) => words(value, 19),
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: true, lineStyle: { color: "#23362a" } },
    },
    tooltip: {
      ...baseOption.tooltip,
      formatter: (input: unknown) => {
        const data = (input as { data: { cell: LensCell } }).data.cell;
        return `<b>${escapeHtml(data.x)} × ${escapeHtml(data.y)}</b><br/>${data.ids.length} projects<br/>${data.ids.map((id) => escapeHtml(shortName(names.get(id) ?? id))).join("<br/>")}`;
      },
    },
    ...(heat
      ? {
          visualMap: {
            show: false,
            min: 0,
            max: maximum,
            inRange: { color: ["#243a2a", ACCENT] },
          },
        }
      : {}),
    series: [
      {
        type: heat ? "heatmap" : "scatter",
        data: cells.map((cell) => ({
          value: [
            xLabels.indexOf(cell.x),
            yLabels.indexOf(cell.y),
            cell.ids.length,
          ],
          cell,
          ids: cell.ids,
          ...(heat
            ? {
                label: {
                  color: cell.ids.length / maximum < 0.37 ? "#fff" : "#000",
                },
              }
            : {}),
        })),
        ...(heat
          ? {}
          : {
              symbolSize: (value: unknown) =>
                Math.sqrt((value as number[])[2] / maximum) * 43,
              itemStyle: { color: ACCENT, opacity: 0.85 },
            }),
        label: {
          show: true,
          color: heat ? "#102015" : "#101a15",
          fontSize: 12,
          fontWeight: 600,
          formatter: (p: unknown) =>
            String((p as { value: number[] }).value[2]),
        },
        emphasis: { itemStyle: { color: TEAL }, label: { color: "#000" } },
      },
    ],
  };
  return (
    <>
      <div
        className="lab-chart-scroll"
        role="region"
        aria-label={`${xName} by ${yName} chart`}
        tabIndex={0}
      >
        <EChart
          option={option}
          replaceMerge={["series"]}
          style={{
            height: Math.max(330, yLabels.length * 34 + 175),
            minWidth: Math.max(
              630,
              xLabels.length * 100 + (numericY ? 100 : 230),
            ),
          }}
          onEvents={{
            click: (p: { data: { cell: LensCell } }) =>
              onSelect(
                `${xName} ${p.data.cell.x} × ${yName} ${p.data.cell.y}`,
                p.data.cell.ids,
              ),
          }}
        />
      </div>
      <ChartRecords
        rows={cells.map((c) => ({
          label: `${xName} ${c.x} × ${yName} ${c.y}`,
          ids: c.ids,
        }))}
        onSelect={onSelect}
      />
    </>
  );
}

function Appeal({ projects, onSelect }: ViewProps) {
  const cells = useMemo(() => appealCells(projects), [projects]);
  const unscored = projects.filter(
    (p) => validScore(p.assessment?.wow, 10) === null,
  ).length;
  return (
    <>
      <ViewHeading
        number="13"
        title="Memorable does not have to mean complicated."
      >
        Compare your wow-factor with subjective technical complexity. Each
        circle groups projects with the same two scores; its area and label show
        the count.
      </ViewHeading>
      <CellChart
        cells={cells}
        projects={projects}
        onSelect={onSelect}
        xLabels={[
          "1",
          "2",
          "3",
          "4",
          "5",
          ...(cells.some((c) => c.x === "Unknown") ? ["Unknown"] : []),
        ]}
        yLabels={[
          ...(cells.some((c) => c.y === "Unscored") ? ["Unscored"] : []),
          ...Array.from({ length: 10 }, (_, i) => String(i + 1)),
        ]}
        xName="Subjective complexity (1–5)"
        yName="Wow-factor (1–10)"
        numericY
      />
      <p className="lab-caption">
        {projects.length - unscored}/{projects.length} wow-factor scores
        recorded. These are subjective assessments, not business impact,
        implementation speed or quality measurements. Missing scores stay
        visible as unknown.
      </p>
    </>
  );
}

function EvidencePriorities({
  projects,
  onSelect,
  onClearSelection,
}: ViewProps) {
  const [minimum, setMinimum] = useState(8);
  const result = useMemo(
    () => evidencePriorities(projects, minimum),
    [projects, minimum],
  );
  const outcomes = labels(result.cells.map((c) => c.x));
  return (
    <>
      <ViewHeading number="14" title="Which stories deserve stronger proof?">
        Start with projects you find compelling, then inspect what supports
        their outcomes. An attractive demo and a measured result tell different
        stories.
      </ViewHeading>
      <div className="lab-inline-controls">
        <label>
          Minimum wow-factor{" "}
          <select
            value={minimum}
            onChange={(e) => {
              setMinimum(Number(e.target.value));
              onClearSelection();
            }}
          >
            {Array.from({ length: 10 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}/10
              </option>
            ))}
          </select>
        </label>
        <span>
          {result.projects.length} qualifying projects · {result.unscored}{" "}
          unscored
        </span>
      </div>
      <CellChart
        cells={result.cells}
        projects={projects}
        onSelect={onSelect}
        xLabels={outcomes}
        yLabels={Array.from({ length: 11 - minimum }, (_, i) =>
          String(i + minimum),
        )}
        xName="Recorded outcome basis"
        yName="Wow-factor (1–10)"
        numericY
      />
      <h3>Compelling projects without recorded outcome results</h3>
      <div className="lab-evidence-candidates">
        {result.candidates.map((p) => (
          <article key={p.id}>
            <p className="lab-kicker">
              Wow {score(p, "wow")} · complexity {score(p, "complexity")}
            </p>
            <h3>{shortName(p.name)}</h3>
            <p>{p.outcomeBasis || "Outcome basis unknown"}</p>
            <p>
              {p.caseStudyWords
                ? `${p.caseStudyWords.toLocaleString("en-GB")} words in the published EN case study`
                : "No published EN case study"}
            </p>
            <p>
              {p.evidenceGaps ||
                "Add a dated outcome, the contribution scope and its supporting evidence."}
            </p>
            <button
              className="lab-action"
              onClick={() => onSelect(p.name, [p.id])}
            >
              Inspect evidence →
            </button>
          </article>
        ))}
      </div>
      {!result.candidates.length && (
        <p className="lab-empty">
          No qualifying projects with capability-only or missing outcome
          results. Owner estimates and self-reported results retain their own
          categories above.
        </p>
      )}
      <p className="lab-caption">
        This is a documentation priority, not a verdict on project success.
        Case-study length describes the earlier published text; it is not a
        quality score. An owner-reported measurement has not automatically been
        independently audited.
      </p>
    </>
  );
}

function Peers({
  projects,
  similarities,
  onSelect,
  semanticAt,
  onClearSelection,
}: ViewProps) {
  const [focus, setFocus] = useState(
    projects.find((p) => p.name.includes("World Vision"))?.id ??
      projects[0]?.id ??
      "",
  );
  const [peer, setPeer] = useState("");
  const anchor = projects.find((p) => p.id === focus) ?? projects[0];
  const neighbours = useMemo(
    () => comparableProjects(projects, similarities, anchor.id),
    [projects, similarities, anchor.id],
  );
  const chosen = neighbours.find((n) => n.project.id === peer) ?? neighbours[0];
  const option: EChartsOption = {
    ...baseOption,
    grid: { left: 230, right: 70, top: 20, bottom: 55 },
    xAxis: {
      type: "value",
      name: "Text cosine",
      nameLocation: "middle",
      nameGap: 28,
      min: Math.min(0, ...neighbours.map((n) => n.cosine)),
      max: 1,
      axisLabel: { color: INK },
      splitLine: { lineStyle: { color: "#23362a" } },
    },
    yAxis: {
      type: "category",
      inverse: true,
      data: neighbours.slice(0, 8).map((n) => shortName(n.project.name)),
      axisLabel: { color: INK, width: 210, overflow: "truncate", fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    tooltip: {
      ...baseOption.tooltip,
      formatter: (input: unknown) => {
        const p = (input as { data: { name: string; value: number } }).data;
        return `${escapeHtml(p.name)}<br/>Text cosine ${p.value.toFixed(3)}`;
      },
    },
    series: [
      {
        type: "bar",
        data: neighbours.slice(0, 8).map((n) => ({
          value: n.cosine,
          name: n.project.name,
          id: n.project.id,
          itemStyle: {
            color: n.project.id === chosen?.project.id ? ACCENT : TEAL,
          },
        })),
        barMaxWidth: 18,
        label: {
          show: true,
          position: "right",
          color: INK,
          formatter: (p: unknown) => (p as { value: number }).value.toFixed(3),
        },
      },
    ],
  };
  const rows = chosen
    ? [
        ["Wow-factor", score(anchor, "wow"), score(chosen.project, "wow")],
        [
          "Complexity",
          score(anchor, "complexity"),
          score(chosen.project, "complexity"),
        ],
        [
          "Team bounds",
          rangeLabel(anchor.assessment?.teamLow, anchor.assessment?.teamHigh),
          rangeLabel(
            chosen.project.assessment?.teamLow,
            chosen.project.assessment?.teamHigh,
          ),
        ],
        ["Estimated replacement", effort(anchor), effort(chosen.project)],
        [
          "Recorded effort class",
          anchor.assessment?.effortClass || "Unknown",
          chosen.project.assessment?.effortClass || "Unknown",
        ],
        [
          "Ownership",
          anchor.matching.ownership || "Unknown",
          chosen.project.matching.ownership || "Unknown",
        ],
        [
          "Product type",
          anchor.productTypes.join(" · ") || "Unknown",
          chosen.project.productTypes.join(" · ") || "Unknown",
        ],
        [
          "Buyer needs",
          anchor.matching.buyerNeeds.join(" · ") || "Unknown",
          chosen.project.matching.buyerNeeds.join(" · ") || "Unknown",
        ],
        [
          "Delivery",
          anchor.matching.stages.join(" · ") || "Unknown",
          chosen.project.matching.stages.join(" · ") || "Unknown",
        ],
      ]
    : [];
  return (
    <>
      <ViewHeading
        number="15"
        title="Similar problems. Different delivery realities."
      >
        Find neighbours in the existing case-text embeddings, then compare the
        current project context separately. Similarity is a navigation aid, not
        a price or effort predictor.
      </ViewHeading>
      <div className="lab-inline-controls">
        <label>
          Anchor project{" "}
          <select
            value={anchor.id}
            onChange={(e) => {
              setFocus(e.target.value);
              setPeer("");
              onClearSelection();
            }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {shortName(p.name)}
              </option>
            ))}
          </select>
        </label>
        {chosen && (
          <label>
            Compare with{" "}
            <select
              value={chosen.project.id}
              onChange={(e) => {
                setPeer(e.target.value);
                onClearSelection();
              }}
            >
              {neighbours.map((n) => (
                <option key={n.project.id} value={n.project.id}>
                  {shortName(n.project.name)} · {n.cosine.toFixed(3)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {!chosen ? (
        <p className="lab-empty">
          No embedded neighbour is available in this scope. Expand the global
          project filters.
        </p>
      ) : (
        <>
          <div className="lab-chart-scroll">
            <EChart
              option={option}
              replaceMerge={["series"]}
              style={{
                height: Math.max(270, Math.min(8, neighbours.length) * 38 + 80),
                minWidth: 660,
              }}
              onEvents={{
                click: (p: { data: { id: string } }) => {
                  setPeer(p.data.id);
                  onClearSelection();
                },
              }}
            />
          </div>
          <div className="lab-peer-summary">
            <p>
              <b>Text cosine {chosen.cosine.toFixed(3)}</b> · technology overlap{" "}
              {chosen.technologyOverlap === null
                ? "unknown"
                : `${Math.round(chosen.technologyOverlap * 100)}%`}
            </p>
            <p>
              Shared product types:{" "}
              {chosen.sharedProducts.join(" · ") || "None recorded"}. Shared
              technology:{" "}
              {chosen.sharedTechnology.join(" · ") || "None recorded"}.
            </p>
            <button
              className="lab-action"
              onClick={() =>
                onSelect(
                  `${shortName(anchor.name)} + ${shortName(chosen.project.name)}`,
                  [anchor.id, chosen.project.id],
                )
              }
            >
              Inspect both projects ↓
            </button>
          </div>
          <div
            className="lab-chart-table"
            role="region"
            aria-label="Project context comparison"
            tabIndex={0}
          >
            <table className="lab-peer-table">
              <thead>
                <tr>
                  <th scope="col">Dimension</th>
                  <th scope="col">{shortName(anchor.name)}</th>
                  <th scope="col">{shortName(chosen.project.name)}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, a, b]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    <td>{a}</td>
                    <td>{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <details className="lab-details">
            <summary>Effort assumptions for this comparison</summary>
            {[anchor, chosen.project].map((p) => (
              <p key={p.id}>
                <b>{shortName(p.name)}:</b>{" "}
                {p.assessment?.effortBasis ||
                  "No estimate basis recorded; clarify contribution scope and assumptions before comparing replacement effort."}
              </p>
            ))}
          </details>
        </>
      )}
      <p className="lab-caption">
        Existing embedding text from knowledge sync {semanticAt || "unknown"};
        current Notion labels can be newer. Cosines and tag overlap have
        different scales. Estimated effort concerns contribution scope and
        remains uncertain; no combined similarity/efficiency score is
        calculated.
      </p>
    </>
  );
}

function DeliveryContext({ projects, onSelect, onClearSelection }: ViewProps) {
  const [ownership, setOwnership] = useState("All ownership models");
  const active = projects.some((p) => p.matching.ownership === ownership)
    ? ownership
    : "All ownership models";
  const scoped = useMemo(
    () =>
      projects.filter(
        (p) =>
          active === "All ownership models" || p.matching.ownership === active,
      ),
    [projects, active],
  );
  const teams = useMemo(() => teamIntervals(scoped), [scoped]);
  const patterns = contextCells(scoped, "workingPattern"),
    places = contextCells(scoped, "workplace");
  const render: CustomSeriesRenderItem = (_params, api) => {
    const row = Number(api.value(2)),
      a = api.coord([api.value(0), row]),
      b = api.coord([api.value(1), row]);
    return {
      type: "group",
      children: [
        {
          type: "line",
          shape: { x1: a[0], x2: b[0], y1: a[1], y2: b[1] },
          style: { stroke: ACCENT, lineWidth: 3 },
        },
        {
          type: "circle",
          shape: { cx: a[0], cy: a[1], r: 5 },
          style: { fill: TEAL },
        },
        {
          type: "circle",
          shape: { cx: b[0], cy: b[1], r: 5 },
          style: { fill: ACCENT },
        },
      ],
    };
  };
  const option: EChartsOption = {
    ...baseOption,
    grid: { left: 230, right: 70, top: 20, bottom: 60 },
    xAxis: {
      type: "value",
      min: 0,
      max: Math.max(1, ...teams.rows.map((r) => r.high)) * 1.1,
      name: "Recorded team-size bounds · people",
      nameLocation: "middle",
      nameGap: 35,
      minInterval: 1,
      axisLabel: { color: INK },
      splitLine: { lineStyle: { color: "#23362a" } },
    },
    yAxis: {
      type: "category",
      inverse: true,
      data: teams.rows.map((r) => shortName(r.name)),
      axisLabel: { color: INK, width: 210, overflow: "truncate", fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    dataZoom:
      teams.rows.length > 12
        ? [
            {
              type: "slider",
              yAxisIndex: 0,
              filterMode: "weakFilter",
              right: 5,
              width: 16,
              startValue: 0,
              endValue: 11,
              showDetail: false,
              borderColor: "#2a3d30",
              textStyle: { color: INK },
            },
          ]
        : [],
    tooltip: {
      ...baseOption.tooltip,
      formatter: (input: unknown) => {
        const r = (input as { data: { row: (typeof teams.rows)[number] } }).data
          .row;
        return `${escapeHtml(r.name)}<br/>${rangeLabel(r.low, r.high)} people`;
      },
    },
    series: [
      {
        type: "custom",
        renderItem: render,
        clip: true,
        encode: { x: [0, 1], y: 2 },
        data: teams.rows.map((r, i) => ({ value: [r.low, r.high, i], row: r })),
      },
    ],
  };
  return (
    <>
      <ViewHeading number="16" title="The context around the code.">
        Compare team-size ranges and operating patterns with your role. Team
        size describes the entered project team; it does not measure personal
        contribution or productivity.
      </ViewHeading>
      <div className="lab-inline-controls">
        <label>
          Ownership in this view{" "}
          <select
            value={active}
            onChange={(e) => {
              setOwnership(e.target.value);
              onClearSelection();
            }}
          >
            <option>All ownership models</option>
            {labels(
              projects.map((p) => p.matching.ownership).filter(Boolean),
            ).map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <span>
          {scoped.length} projects · {teams.unknown} incomplete or invalid team
          ranges
        </span>
      </div>
      <h3>Recorded team-size ranges</h3>
      {teams.rows.length ? (
        <div className="lab-chart-scroll">
          <EChart
            option={option}
            replaceMerge={["series", "dataZoom"]}
            style={{
              height: Math.min(590, teams.rows.length * 36 + 100),
              minWidth: 680,
            }}
            onEvents={{
              click: (p: { data: { row: { id: string; name: string } } }) =>
                onSelect(p.data.row.name, [p.data.row.id]),
            }}
          />
        </div>
      ) : (
        <p className="lab-empty">No complete team-size ranges in this scope.</p>
      )}
      <ChartRecords
        rows={teams.rows.map((r) => ({
          label: `${shortName(r.name)} · ${rangeLabel(r.low, r.high)} people`,
          ids: [r.id],
        }))}
        onSelect={onSelect}
      />
      <p className="lab-caption">
        Dots show the entered lower and upper bounds, not a confidence interval.
        Equal bounds give one point. Use the vertical range control to inspect
        further projects. Partial ranges stay in the project records but are
        omitted from this plot.
      </p>
      <h3>Working pattern × ownership</h3>
      <CellChart
        cells={patterns}
        projects={scoped}
        onSelect={onSelect}
        xLabels={labels(patterns.map((c) => c.x))}
        yLabels={labels(patterns.map((c) => c.y))}
        xName="Working pattern"
        yName="Ownership"
        heat
      />
      <h3>Workplace × ownership</h3>
      <CellChart
        cells={places}
        projects={scoped}
        onSelect={onSelect}
        xLabels={labels(places.map((c) => c.x))}
        yLabels={labels(places.map((c) => c.y))}
        xName="Workplace"
        yName="Ownership"
        heat
      />
      <p className="lab-caption">
        Each context matrix counts every scoped project once. Working pattern,
        calendar duration and team size are not multiplied into actual
        person-days. Whole-codebase SLOC is not divided by people to claim
        efficiency.
      </p>
    </>
  );
}

function Lifecycle({ projects, onSelect }: ViewProps) {
  const cells = useMemo(() => lifecycleCells(projects), [projects]);
  const order = [
    "Discovery",
    "Prototype",
    "MVP",
    "Production",
    "Production (restricted access)",
    "Internal use",
    "Improvement",
    "Ongoing maintenance",
    "Retired",
    "Not recorded",
  ];
  const x = labels(cells.map((c) => c.x)).sort((a, b) => {
    const ai = order.indexOf(a),
      bi = order.indexOf(b);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || a.localeCompare(b);
  });
  const y = labels(cells.map((c) => c.y));
  return (
    <>
      <ViewHeading number="17" title="The product’s life. Your involvement.">
        Keep product milestones separate from maintenance responsibility. A
        finished engagement can leave a live product; retired explicitly means
        the product is no longer in use or available.
      </ViewHeading>
      <div className="lab-lifecycle-key">
        <p>
          <b>Production (restricted access)</b>
          <span>Live with private or invited users</span>
        </p>
        <p>
          <b>Retired</b>
          <span>Product no longer in use or available</span>
        </p>
        <p>
          <b>Engagement ended</b>
          <span>Your involvement ended</span>
        </p>
      </div>
      <CellChart
        cells={cells}
        projects={projects}
        onSelect={onSelect}
        xLabels={x}
        yLabels={y}
        xName="Recorded product milestones"
        yName="Maintenance / engagement"
        heat
      />
      <p className="lab-caption">
        Stage tags can overlap: a project can record both Production and
        Retired. The cells count recorded intersections, not current
        active-product totals, chronological transitions or funnel conversion.
        Missing stages remain “Not recorded”; unqualified Production does not
        establish public availability.
      </p>
    </>
  );
}
