"use client";

import { useMemo, useRef, useState } from "react";
import type { EChartsOption } from "echarts";
import type { LabProject, SemanticPair } from "./analysis";
import { projectIdentityLabels } from "./analysis";
import {
  PairComparison,
  CrossLensLeads,
  revealComparison,
} from "./ProjectComparison";
import { ViewHeading } from "./ExplorationViews";
import {
  BLOCKS,
  PRESETS,
  PRESET_LABELS,
  fingerprint,
  compareFingerprints,
  combinedSpace,
  type Weights,
  type Fingerprint,
} from "./vectorSpaces";
import {
  EChart,
  baseOption,
  ChartRecords,
  palette,
  INK,
  ACCENT,
  escapeHtml,
  shortName,
} from "./chartPrimitives";

export type VectorTab = "vectors";
type Props = {
  view: VectorTab;
  projects: LabProject[];
  similarities: SemanticPair[];
  onSelect: (label: string, ids: string[]) => void;
  onClearSelection: () => void;
};
const pct = (n: number | null) =>
  n === null ? "Unknown" : `${Math.round(n * 100)}%`;
const blockColor = (i: number) =>
  [
    palette[0],
    palette[1],
    palette[2],
    palette[3],
    palette[4],
    palette[5],
    "#8ebc84",
    "#94b5b5",
    "#b5a48d",
    "#9a9eaa",
  ][i];
type Ranked = ReturnType<typeof compareFingerprints> & {
  id: string;
  semantic: number | null;
  semanticRank: number | null;
};

export function VectorViews({
  projects,
  similarities,
  onSelect,
  onClearSelection,
}: Props) {
  const [weights, setWeights] = useState<Weights>({ ...PRESETS.balanced });
  const [preset, setPreset] = useState("balanced");
  const [anchor, setAnchor] = useState(
    projects.find((p) => p.name.startsWith("Playlist-Stats"))?.id ?? "",
  );
  const [candidate, setCandidate] = useState("");
  const [showMatrix, setShowMatrix] = useState(false);
  const comparisonHeading = useRef<HTMLHeadingElement>(null);
  const rows = useMemo(() => projects.map(fingerprint), [projects]);
  const rowMap = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  const names = useMemo(
    () => projectIdentityLabels(projects, shortName),
    [projects],
  );
  const active = rowMap.has(anchor) ? anchor : (projects[0]?.id ?? "");
  const source = rowMap.get(active);
  const ranking = useMemo<Ranked[]>(() => {
    if (!source) return [];
    const semantic = similarities
      .filter((p) => p.a === active || p.b === active)
      .sort((a, b) => b.cosine - a.cosine);
    return rows
      .filter((r) => r.id !== active)
      .map((row) => {
        const index = semantic.findIndex(
          (p) => p.a === row.id || p.b === row.id,
        );
        return {
          id: row.id,
          ...compareFingerprints(source, row, weights),
          semantic: index < 0 ? null : semantic[index].cosine,
          semanticRank: index < 0 ? null : index + 1,
        };
      })
      .sort(
        (a, b) => (b.score ?? -1) - (a.score ?? -1) || a.id.localeCompare(b.id),
      );
  }, [source, similarities, active, rows, weights]);
  const compared = ranking.find((r) => r.id === candidate) ?? ranking[0];
  const space = useMemo(
    () => combinedSpace(projects, weights, 0.5),
    [projects, weights],
  );
  const budget = BLOCKS.reduce((sum, block) => sum + weights[block.id], 0);
  const inspect = (id: string) => {
    setCandidate(id);
    onSelect(`${names.get(active)} ↔ ${names.get(id)}`, [active, id]);
  };
  if (!projects.length) return null;
  return (
    <>
      <ViewHeading number="04" title="What makes these projects alike?">
        Compare the recorded overlap first. Adjust the field weights to inspect
        how architecture, functions and context change the ranking. Use the
        Experience atlas for maps and networks.
      </ViewHeading>
      <div className="lab-inline-controls">
        <label>
          Similarity recipe
          <select
            value={preset}
            onChange={(e) => {
              setPreset(e.target.value);
              setWeights({ ...PRESETS[e.target.value] });
              onClearSelection();
            }}
          >
            {preset === "custom" && (
              <option value="custom">Custom weights</option>
            )}
            {Object.keys(PRESETS).map((key) => (
              <option key={key} value={key}>
                {PRESET_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
        <label>
          First project
          <select
            value={active}
            onChange={(e) => {
              setAnchor(e.target.value);
              setCandidate("");
              onClearSelection();
            }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {names.get(p.id)}
              </option>
            ))}
          </select>
        </label>
        {compared && (
          <label>
            Compare with
            <select
              value={compared.id}
              onChange={(e) => inspect(e.target.value)}
            >
              {ranking.map((r, i) => (
                <option key={r.id} value={r.id}>
                  {i + 1}. {names.get(r.id)} · {pct(r.score)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {source && compared && (
        <>
          <PairComparison
            a={projects.find((p) => p.id === active)!}
            b={projects.find((p) => p.id === compared.id)!}
            headingRef={comparisonHeading}
          />
          <CrossLensLeads
            projects={projects}
            anchorId={active}
            onCompare={(id) => {
              inspect(id);
              revealComparison(comparisonHeading.current);
            }}
          />
        </>
      )}
      <details className="lab-details lab-weight-details">
        <summary>
          Adjust field weights ·{" "}
          {budget ? `${budget} budget units` : "all weights off"}
        </summary>
        <div className="lab-weight-grid">
          {BLOCKS.map((block, i) => (
            <label key={block.id} title={block.fields}>
              <span>
                <i style={{ background: blockColor(i) }} />
                {block.label}
                <strong>
                  {budget ? Math.round((weights[block.id] / budget) * 100) : 0}%
                </strong>
              </span>
              <input
                aria-label={`${block.label} weight`}
                type="range"
                min="0"
                max="10"
                step="1"
                value={weights[block.id]}
                onChange={(e) => {
                  setPreset("custom");
                  setWeights({
                    ...weights,
                    [block.id]: Number(e.target.value),
                  });
                  onClearSelection();
                }}
              />
              <small>
                {block.fields} · {weights[block.id]} units
              </small>
            </label>
          ))}
        </div>
      </details>
      <p className="lab-method">
        The weighted score combines normalized fields with a fixed budget.
        Missing input contributes zero, with shared-input coverage shown
        separately. Tool importance uses explicit defaults rather than measured
        project centrality. Counts in the comparison above are unweighted.
      </p>
      {!budget && (
        <p className="lab-empty" role="status">
          All weights are off. Choose a recipe or enable a field to compare
          projects.
        </p>
      )}
      <RankingChart ranking={ranking} names={names} onInspect={inspect} />
      <p className="lab-method">
        Bars show additive score contributions, not probabilities or measured
        suitability.
      </p>
      {source && compared && (
        <details className="lab-details">
          <summary>Weighted score breakdown & source receipts</summary>
          <PairReceipt
            a={source}
            b={rowMap.get(compared.id)!}
            result={compared}
            names={names}
          />
        </details>
      )}
      <details className="lab-details">
        <summary>All {ranking.length} neighbours</summary>
        <div className="lab-chart-table">
          <table>
            <thead>
              <tr>
                <th scope="col">Neighbour / rank</th>
                <th scope="col">Weighted score</th>
                <th scope="col">Shared-input coverage</th>
                <th scope="col">Inspect</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => (
                <tr key={r.id}>
                  <th scope="row">
                    {i + 1}. {names.get(r.id)}
                  </th>
                  <td>{pct(r.score)}</td>
                  <td>{pct(r.coverage)}</td>
                  <td>
                    <button onClick={() => inspect(r.id)}>Compare →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <button
        type="button"
        className="lab-action"
        aria-expanded={showMatrix}
        onClick={() => setShowMatrix(!showMatrix)}
      >
        {showMatrix ? "Hide" : "Show"} exact weighted similarity matrix
      </button>
      {showMatrix && (
        <SimilarityMatrix
          space={space}
          ids={space.ids}
          rows={rowMap}
          weights={weights}
          names={names}
          onSelect={onSelect}
        />
      )}
      {showMatrix && (
        <p className="lab-method">
          {space.ids.length} projects meet 50% input coverage;{" "}
          {space.excluded.length} excluded. This matrix uses the same weights as
          the ranking.
        </p>
      )}
      <KindLedger projects={projects} rows={rows} onSelect={onSelect} />
    </>
  );
}

function RankingChart({
  ranking,
  names,
  onInspect,
}: {
  ranking: Ranked[];
  names: Map<string, string>;
  onInspect: (id: string) => void;
}) {
  const top = ranking.filter((r) => r.score !== null).slice(0, 10);
  const option: EChartsOption = {
    ...baseOption,
    grid: { left: 180, right: 45, top: 55, bottom: 65 },
    legend: {
      type: "scroll",
      textStyle: { color: INK },
      top: 0,
      data: BLOCKS.map((b) => b.label),
    },
    xAxis: {
      type: "value",
      min: 0,
      max: 1,
      name: "Combined score",
      nameLocation: "middle",
      nameGap: 32,
      axisLabel: { formatter: (v) => pct(v), color: INK },
      splitLine: { lineStyle: { color: "#293e31" } },
    },
    yAxis: {
      type: "category",
      inverse: true,
      data: top.map((r) => names.get(r.id) ?? r.id),
      axisLabel: { color: INK, width: 160, overflow: "truncate" },
    },
    tooltip: {
      ...baseOption.tooltip,
      formatter: (input) => {
        const p = input as { dataIndex: number; seriesName: string },
          r = top[p.dataIndex];
        const part = r.parts.find(
          (b) => BLOCKS.find((x) => x.id === b.id)?.label === p.seriesName,
        );
        return `${escapeHtml(names.get(r.id) ?? r.id)}<br/>${escapeHtml(p.seriesName)}: ${pct(part?.contribution ?? 0)} contribution<br/>Combined: ${pct(r.score)} · coverage: ${pct(r.coverage)}`;
      },
    },
    series: BLOCKS.map((b, i) => ({
      name: b.label,
      type: "bar",
      stack: "score",
      barMaxWidth: 24,
      itemStyle: { color: blockColor(i) },
      data: top.map((r) => r.parts.find((p) => p.id === b.id)!.contribution),
    })),
  };
  return (
    <div className="lab-chart-scroll">
      <div style={{ minWidth: 620 }}>
        <EChart
          option={option}
          style={{ height: 490 }}
          notMerge
          onEvents={{
            click: (p: { dataIndex: number }) => {
              if (top[p.dataIndex]) onInspect(top[p.dataIndex].id);
            },
          }}
        />
      </div>
    </div>
  );
}

function PairReceipt({
  a,
  b,
  result,
  names,
}: {
  a: Fingerprint;
  b: Fingerprint;
  result: Ranked;
  names: Map<string, string>;
}) {
  return (
    <section className="lab-pair-receipt" aria-label="Similarity explanation">
      <p className="lab-kicker">
        Score receipt / {pct(result.score)} combined / {pct(result.coverage)}{" "}
        coverage
      </p>
      <h3>
        {names.get(a.id)} ↔ {names.get(b.id)}
      </h3>
      {result.semantic !== null && (
        <p>
          Original mixed-text cosine: {pct(result.semantic)}
          {result.semanticRank
            ? ` / neighbour rank #${result.semanticRank}`
            : ""}
          . This is a separate scale.
        </p>
      )}
      <p>
        Application kinds: <strong>{a.kind.label}</strong> /{" "}
        <strong>{b.kind.label}</strong>.{" "}
        {a.kind.inferred || b.kind.inferred
          ? "Includes inferred drafts."
          : "Recorded labels."}
      </p>
      <div className="lab-chart-table">
        <table>
          <thead>
            <tr>
              <th scope="col">Space / budget</th>
              <th scope="col">Within-field cosine</th>
              <th scope="col">Score contribution</th>
              <th scope="col">Shared features</th>
            </tr>
          </thead>
          <tbody>
            {result.parts.map((p, i) => (
              <tr key={p.id}>
                <th scope="row">
                  <span
                    className="lab-vector-dot"
                    style={{ background: blockColor(i) }}
                  />
                  {BLOCKS[i].label} / {pct(p.share)}
                </th>
                <td>{pct(p.similarity)}</td>
                <td>{pct(p.contribution)}</td>
                <td>
                  {p.shared.map((t) => t.label).join(" · ") ||
                    (p.available ? "No shared feature" : "Input unavailable")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details className="lab-details">
        <summary>Inspect features, role weights & source receipts</summary>
        <p className="lab-method">
          Tool amplitudes are defaults, not audited per-project importance.
          Framework ancestry is discounted; styling and generic helpers receive
          less amplitude. A value is normalized inside its field before the
          field budget applies. Graphics, data and editor libraries keep full
          default amplitude because they can define a product. Unknown tools
          also retain full amplitude for review.
        </p>
        <div className="lab-feature-columns">
          {[a, b].map((row) => (
            <div key={row.id}>
              <h4>{names.get(row.id)}</h4>
              {BLOCKS.map((block) => (
                <section key={block.id}>
                  <h5>{block.label}</h5>
                  {row.blocks[block.id].length ? (
                    <ul>
                      {row.blocks[block.id].map((f) => (
                        <li key={f.key}>
                          <strong>{f.label}</strong> × {f.amplitude}
                          <small>{f.source}</small>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="lab-method">No input / no rule match</p>
                  )}
                </section>
              ))}
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}

function SimilarityMatrix({
  space,
  ids,
  rows,
  weights,
  names,
  onSelect,
}: {
  space: ReturnType<typeof combinedSpace>;
  ids: string[];
  rows: Map<string, Fingerprint>;
  weights: Weights;
  names: Map<string, string>;
  onSelect: Props["onSelect"];
}) {
  const ordered = ids;
  const cells = ordered.flatMap((a, x) =>
    ordered.map((b, y) => ({
      value: [
        x,
        y,
        a === b
          ? 1
          : (compareFingerprints(rows.get(a)!, rows.get(b)!, weights).score ??
            -1),
      ],
      a,
      b,
    })),
  );
  const option: EChartsOption = {
    ...baseOption,
    grid: { left: 150, right: 20, top: 145, bottom: 60 },
    xAxis: {
      type: "category",
      position: "top",
      data: ordered.map((id) => names.get(id) ?? id),
      axisLabel: {
        rotate: 65,
        interval: 0,
        color: INK,
        fontSize: 9,
        width: 125,
        overflow: "truncate",
      },
    },
    yAxis: {
      type: "category",
      inverse: true,
      data: ordered.map((id) => names.get(id) ?? id),
      axisLabel: {
        interval: 0,
        color: INK,
        fontSize: 9,
        width: 140,
        overflow: "truncate",
      },
    },
    visualMap: {
      min: 0,
      max: 1,
      orient: "horizontal",
      left: 150,
      bottom: 0,
      inRange: { color: ["#16281f", "#4b8068", ACCENT] },
      textStyle: { color: INK },
    },
    tooltip: {
      ...baseOption.tooltip,
      formatter: (input: unknown) => {
        const p = input as { data: { a: string; b: string; value: number[] } };
        return `${escapeHtml(names.get(p.data.a) ?? "")} ↔ ${escapeHtml(names.get(p.data.b) ?? "")}<br/>${p.data.a === p.data.b ? "Self (reference diagonal)" : pct(p.data.value[2] < 0 ? null : p.data.value[2])}`;
      },
    },
    series: [
      {
        type: "heatmap",
        data: cells.map((c) => ({
          ...c,
          itemStyle: c.value[2] < 0 ? { color: "#4d4d4d" } : undefined,
        })),
        itemStyle: { borderWidth: 1, borderColor: "#101a15" },
      },
    ],
  };
  return (
    <>
      <p className="lab-method">
        {space.ids.length} × {space.ids.length} exact comparisons, ordered by
        project. Gray means no comparable enabled input. The self diagonal is a
        reference of 100%, not an imputation of missing features.
      </p>
      <div className="lab-chart-scroll">
        <div style={{ minWidth: 850 }}>
          <EChart
            option={option}
            notMerge
            style={{ height: Math.max(520, ordered.length * 16 + 220) }}
            onEvents={{
              click: (p: { data: { a: string; b: string } }) =>
                onSelect(`${names.get(p.data.a)} ↔ ${names.get(p.data.b)}`, [
                  ...new Set([p.data.a, p.data.b]),
                ]),
            }}
          />
        </div>
      </div>
      <ChartRecords
        rows={cells
          .filter((c) => c.a < c.b)
          .map((c) => ({
            label: `${names.get(c.a)} ↔ ${names.get(c.b)}: ${pct(c.value[2] < 0 ? null : c.value[2])}`,
            ids: [c.a, c.b],
          }))}
        onSelect={onSelect}
      />
    </>
  );
}

function KindLedger({
  projects,
  rows,
  onSelect,
}: {
  projects: LabProject[];
  rows: Fingerprint[];
  onSelect: Props["onSelect"];
}) {
  const map = new Map(rows.map((r) => [r.id, r]));
  return (
    <details className="lab-details">
      <summary>
        Application kinds · {rows.filter((r) => !r.kind.inferred).length}{" "}
        recorded · {rows.filter((r) => r.kind.inferred).length} drafts
      </summary>
      <p className="lab-method">
        Name and Short Description are read separately from Notion. The Short
        Description is the recorded application-kind label here; broader
        families and functions remain rule-derived. If that field is blank, an
        explicitly marked draft comes from Case Context. Product type remains
        the broad format (Web app, Mobile app, Game…). Nothing here writes to
        Notion.
      </p>
      <div className="lab-chart-table">
        <table>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Short Description / kind</th>
              <th scope="col">Status / basis</th>
              <th scope="col">Inspect</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => {
              const kind = map.get(p.id)!.kind;
              return (
                <tr key={p.id}>
                  <th scope="row">{shortName(p.name)}</th>
                  <td>{kind.label}</td>
                  <td>
                    <details>
                      <summary>
                        {kind.inferred ? "Inferred draft" : "Recorded"}
                      </summary>
                      {kind.basis}
                    </details>
                  </td>
                  <td>
                    <button
                      className="lab-action"
                      onClick={() => onSelect(p.name, [p.id])}
                      aria-label={`Inspect application kind for ${shortName(p.name)}`}
                    >
                      Inspect →
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}
