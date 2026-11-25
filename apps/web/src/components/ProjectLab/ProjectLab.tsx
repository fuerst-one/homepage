"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "../i18n/LocalizedLink";
import { PageEyebrow } from "../PageEyebrow";
import type { EChartsOption } from "echarts";
import {
  crossTab,
  labSummary,
  needTimeline,
  outcomeCategories,
  type LabProject,
  type LabSnapshot,
} from "./analysis";
import {
  EChart,
  INK,
  ACCENT,
  TEAL,
  palette,
  shortName,
  escapeHtml,
  baseOption,
  ChartRecords,
} from "./chartPrimitives";
import { ExplorationViews, type ExplorationTab } from "./ExplorationViews";
import {
  ResearchView,
  ResearchDetails,
  type ResearchDataset,
} from "./ResearchView";
import "./project-lab.css";
import { labTabs } from "./navigation";
import type { OwnerTab } from "./OwnerViews";
import type { VectorTab } from "./VectorViews";
const VectorViews = dynamic(() =>
  import("./VectorViews").then((m) => m.VectorViews),
);
const OwnerViews = dynamic(() =>
  import("./OwnerViews").then((m) => m.OwnerViews),
);

const countLabels = (
  projects: LabProject[],
  field: "buyerNeeds" | "domains" | "aiCapabilities" | "stages",
) =>
  [...new Set(projects.flatMap((p) => p.matching[field]))].sort(
    (a, b) =>
      projects.filter((p) => p.matching[field].includes(b)).length -
        projects.filter((p) => p.matching[field].includes(a)).length ||
      a.localeCompare(b),
  );
type Tab = ReturnType<typeof labTabs>[number]["id"];
const tabs = labTabs(false);

export function ProjectLab({
  snapshot,
  research,
  publicView = false,
}: {
  snapshot: LabSnapshot;
  research?: ResearchDataset;
  publicView?: boolean;
}) {
  const visibleTabs = labTabs(publicView);
  const [tab, setTab] = useState<Tab>("coverage");
  const [type, setType] = useState("All projects");
  const [coverageMode, setCoverageMode] = useState("needs");
  const [since, setSince] = useState("All years");
  const [selection, setSelection] = useState<{
    label: string;
    ids: string[];
  } | null>(null);
  const [auditKind, setAuditKind] = useState("All findings");
  const currentResearch = useMemo(
    () =>
      research
        ? {
            ...research,
            projects: research.projects.map((row) => ({
              ...row,
              current: snapshot.projects.find((p) => p.id === row.id)
                ?.assessment,
              currentReadAt: snapshot.metadata.notionFetchedAt,
            })),
          }
        : undefined,
    [research, snapshot.projects, snapshot.metadata.notionFetchedAt],
  );
  const projects = useMemo(
    () =>
      snapshot.projects.filter(
        (p) =>
          (type === "All projects" || p.projectType === type) &&
          (since === "All years" ||
            Number(p.startDate.slice(0, 4)) >= Number(since)),
      ),
    [snapshot.projects, type, since],
  );
  const ids = useMemo(() => new Set(projects.map((p) => p.id)), [projects]);
  const semanticPairs = useMemo(
    () => snapshot.similarities.filter((p) => ids.has(p.a) && ids.has(p.b)),
    [snapshot.similarities, ids],
  );
  const summary = labSummary(projects);
  const projectMap = useMemo(
    () => new Map(snapshot.projects.map((p) => [p.id, p])),
    [snapshot.projects],
  );
  const changeScope = (update: () => void) => {
    update();
    setSelection(null);
  };
  const select = (label: string, selected: string[]) =>
    setSelection({ label, ids: selected });
  const cells = useMemo(
    () =>
      coverageMode === "ai"
        ? crossTab(projects, "aiCapabilities", "stages")
        : crossTab(projects, "buyerNeeds", "domains"),
    [projects, coverageMode],
  );
  const needs = countLabels(projects, "buyerNeeds");
  const matrixRows = countLabels(
    projects,
    coverageMode === "ai" ? "aiCapabilities" : "buyerNeeds",
  );
  const matrixColumns = countLabels(
    projects,
    coverageMode === "ai" ? "stages" : "domains",
  );
  const timeline = useMemo(() => needTimeline(projects), [projects]);
  const years = Array.from(
    {
      length:
        Math.max(0, ...timeline.map((c) => c.year)) -
        Math.min(Infinity, ...timeline.map((c) => c.year)) +
        1,
    },
    (_, i) => Math.min(...timeline.map((c) => c.year)) + i,
  );
  const findings = snapshot.findings.filter(
    (f) =>
      ids.has(f.projectId) &&
      (auditKind === "All findings" || f.kind === auditKind),
  );
  const visibleProjects = selection
    ? projects.filter((p) => selection.ids.includes(p.id))
    : projects;
  const tooltipNames = (projectIds: string[]) =>
    projectIds
      .map((id) => escapeHtml(shortName(projectMap.get(id)?.name ?? id)))
      .join("<br/>");

  const matrixOption: EChartsOption = {
    ...baseOption,
    grid: { left: 280, right: 25, top: 160, bottom: 65 },
    xAxis: {
      type: "category",
      data: matrixColumns,
      position: "top",
      axisLabel: { rotate: 40, color: INK, fontSize: 10 },
      axisLine: { show: false },
      axisTick: { show: false },
      splitArea: { show: true, areaStyle: { color: ["#14201c", "#17241e"] } },
    },
    yAxis: {
      type: "category",
      data: matrixRows,
      inverse: true,
      axisLabel: { color: INK, fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    visualMap: {
      min: 0,
      max: Math.max(1, ...cells.map((c) => c.ids.length)),
      calculable: false,
      orient: "horizontal",
      left: 280,
      bottom: 5,
      inRange: { color: ["#1d3025", "#4d8157", ACCENT] },
      text: ["More projects", "Fewer"],
      textStyle: { color: INK },
    },
    tooltip: {
      ...baseOption.tooltip,
      formatter: (input: unknown) => {
        const p = input as { data: { value: number[]; ids: string[] } };
        return `${p.data.value[2]} project${p.data.value[2] === 1 ? "" : "s"}<br/>${tooltipNames(p.data.ids)}`;
      },
    },
    series: [
      {
        type: "heatmap",
        data: matrixRows.flatMap((row, y) =>
          matrixColumns.map((column, x) => {
            const cell = cells.find(
              (c) => c.row === row && c.column === column,
            );
            return {
              value: [x, y, cell?.ids.length ?? 0],
              ids: cell?.ids ?? [],
              itemStyle: cell ? undefined : { color: "#132019" },
            };
          }),
        ),
        label: {
          show: true,
          formatter: (p) =>
            Number((p.value as number[])[2]) > 0
              ? String((p.value as number[])[2])
              : "",
          color: "#f7ffed",
        },
        itemStyle: { borderWidth: 3, borderColor: "#101a15" },
        emphasis: { itemStyle: { borderColor: ACCENT, borderWidth: 2 } },
      },
    ],
  };
  const timelineOption: EChartsOption = {
    ...baseOption,
    grid: { left: 280, right: 25, top: 40, bottom: 70 },
    xAxis: {
      type: "category",
      data: years,
      axisLabel: { color: INK },
      axisLine: { lineStyle: { color: "#365044" } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "category",
      data: needs,
      inverse: true,
      axisLabel: { color: INK },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    visualMap: {
      min: 0,
      max: Math.max(1, ...timeline.map((c) => c.ids.length)),
      orient: "horizontal",
      left: 280,
      bottom: 5,
      inRange: { color: ["#16302e", "#287e7a", TEAL] },
      text: ["More starts", "Fewer"],
      textStyle: { color: INK },
    },
    tooltip: {
      ...baseOption.tooltip,
      formatter: (input: unknown) => {
        const p = input as { data: { value: number[]; ids: string[] } };
        return `${years[p.data.value[0]]} · ${p.data.value[2]} project starts<br/>${tooltipNames(p.data.ids)}`;
      },
    },
    series: [
      {
        type: "heatmap",
        data: needs.flatMap((need, y) =>
          years.map((year, x) => {
            const cell = timeline.find(
              (c) => c.need === need && c.year === year,
            );
            return {
              value: [x, y, cell?.ids.length ?? 0],
              ids: cell?.ids ?? [],
              itemStyle: cell ? undefined : { color: "#132019" },
            };
          }),
        ),
        label: {
          show: true,
          formatter: (p) =>
            Number((p.value as number[])[2]) > 0
              ? String((p.value as number[])[2])
              : "",
          color: "#fff",
        },
        itemStyle: { borderColor: "#101a15", borderWidth: 3 },
      },
    ],
  };
  const bases = outcomeCategories(projects);
  const evidenceTypes = [...new Set(projects.map((p) => p.projectType))].sort();
  const evidenceOption: EChartsOption = {
    ...baseOption,
    grid: { left: 95, right: 30, top: 20, bottom: 40 },
    tooltip: {
      ...baseOption.tooltip,
      trigger: "item",
      formatter: (input: unknown) => {
        const p = input as { seriesName: string; name: string; value: number };
        return `${escapeHtml(p.seriesName)}<br/>${escapeHtml(p.name)} · ${p.value} projects`;
      },
    },
    xAxis: {
      type: "value",
      min: 0,
      minInterval: 1,
      splitLine: { lineStyle: { color: "#26392e" } },
      axisLabel: { color: INK },
    },
    yAxis: {
      type: "category",
      data: evidenceTypes,
      axisLabel: { color: INK },
      axisTick: { show: false },
      axisLine: { show: false },
    },
    series: bases.map((basis, i) => ({
      name: basis,
      type: "bar",
      stack: "projects",
      barMaxWidth: 38,
      itemStyle: { color: palette[i % palette.length] },
      label: {
        show: true,
        formatter: (p) => (p.value ? String(p.value) : ""),
        color: "#101a15",
      },
      data: evidenceTypes.map(
        (type) =>
          projects.filter(
            (p) =>
              p.projectType === type &&
              (p.outcomeBasis || "No outcome recorded") === basis,
          ).length,
      ),
    })),
  };

  return (
    <div className="project-lab">
      <header className="lab-header">
        <div>
          {!publicView && (
            <>
              <Link className="lab-back" href="/projects" prefetch={false}>
                ← Portfolio
              </Link>
              {" · "}
              <Link className="lab-back" href="/explorer" prefetch={false}>
                Experience atlas ↗
              </Link>
            </>
          )}
          <PageEyebrow>Patterns across the portfolio</PageEyebrow>
          <h1>Research lab</h1>
          <p className="lab-intro">
            A closer look at the projects: problems solved, recurring
            capabilities, and the evidence behind the stories.
          </p>
        </div>
        <div className="lab-stamp">
          <span>{publicView ? "PORTFOLIO EXPLORER" : "LOCAL EXPERIMENT"}</span>
          <strong>
            {snapshot.projects.length} projects. <br />
            Different lenses.
          </strong>
          <p>
            Notion + case studies + recorded project fields
            <br />
            Snapshot{" "}
            {new Date(snapshot.metadata.exportedAt).toISOString().slice(0, 10)}
          </p>
          <a href="#lab-method">Sources & methods ↓</a>
        </div>
      </header>
      <section className="lab-toolbar" aria-label="Project scope">
        <label>
          Project type
          <select
            value={type}
            onChange={(e) => changeScope(() => setType(e.target.value))}
          >
            <option>All projects</option>
            {[...new Set(snapshot.projects.map((p) => p.projectType))]
              .sort()
              .map((t) => (
                <option key={t}>{t}</option>
              ))}
          </select>
        </label>
        <label>
          Started since
          <select
            value={since}
            onChange={(e) => changeScope(() => setSince(e.target.value))}
          >
            <option>All years</option>
            {[2015, 2018, 2020, 2023, 2024, 2025, 2026].map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        <span className="lab-scope" aria-live="polite">
          {projects.length} / {snapshot.projects.length} projects in view
        </span>
        {(type !== "All projects" || since !== "All years") && (
          <button
            onClick={() =>
              changeScope(() => {
                setType("All projects");
                setSince("All years");
              })
            }
          >
            Reset scope
          </button>
        )}
      </section>
      <section className="lab-stats" aria-label="Snapshot overview">
        {[
          [summary.projects, "Projects in scope"],
          [summary.caseStudies, "Published case studies"],
          publicView
            ? [
                new Set(projects.flatMap((p) => p.industries ?? [])).size,
                "Industries",
              ]
            : [summary.ownerConfirmed, "Contribution confirmed"],
          publicView
            ? [
                new Set(projects.flatMap((p) => [...p.tools, ...p.languages]))
                  .size,
                "Technologies",
              ]
            : [summary.measuredOutcomes, "Owner-measured outcomes"],
        ].map(([value, label]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>
      <p className="lab-method">
        <Link href="/en/explorer">Explore the Experience atlas ↗</Link> for
        project maps, clusters and networks. Use this lab for coverage,
        recurring skills, timelines and weighted comparisons.
      </p>
      <details className="lab-details">
        <summary>
          Outcome evidence coverage · {projects.length} projects
        </summary>
        <p className="lab-method">
          Recorded provenance, not an assessment of project success. Missing
          outcomes are documentation gaps.
        </p>
        <div className="comparison-leads">
          <div>
            {bases.map((basis) => {
              const members = projects
                .filter(
                  (p) => (p.outcomeBasis || "No outcome recorded") === basis,
                )
                .map((p) => p.id);
              return (
                <button
                  type="button"
                  key={basis}
                  onClick={() => select(basis, members)}
                >
                  <strong>{basis}</strong>
                  <span>{members.length} projects · Inspect →</span>
                </button>
              );
            })}
          </div>
        </div>
      </details>
      <nav className="lab-tabs" aria-label="Analysis views">
        {visibleTabs.map((item, i) => (
          <button
            key={item.id}
            aria-pressed={tab === item.id}
            onClick={() => {
              setTab(item.id);
              setSelection(null);
            }}
          >
            <span>{String(i + 1).padStart(2, "0")}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <section
        className="lab-view"
        aria-label={tabs.find((t) => t.id === tab)?.label}
      >
        {snapshot.metadata.comparisonPublicationRefreshedAt && (
          <p className="lab-method">
            Portfolio snapshot; original text-embedding comparison retained from
            the stored publication of{" "}
            {snapshot.metadata.comparisonPublicationRefreshedAt}. Structured
            comparisons use the current snapshot fields. The Experience atlas
            uses separate embeddings prepared from those fields.
          </p>
        )}
        {tab === "vectors" && (
          <VectorViews
            view={tab as VectorTab}
            projects={projects}
            similarities={semanticPairs}
            onSelect={select}
            onClearSelection={() => setSelection(null)}
          />
        )}
        {tab === "research" && (
          <ResearchView
            projects={projects}
            dataset={currentResearch}
            onSelect={select}
          />
        )}
        {["appeal", "priorities", "peers", "context", "lifecycle"].includes(
          tab,
        ) && (
          <OwnerViews
            view={tab as OwnerTab}
            projects={projects}
            similarities={semanticPairs}
            fetchedAt={snapshot.metadata.notionFetchedAt}
            semanticAt={snapshot.metadata.knowledgeSyncedAt}
            onSelect={select}
            onClearSelection={() => setSelection(null)}
          />
        )}
        {["bundles", "shortlist"].includes(tab) && (
          <ExplorationViews
            view={tab as ExplorationTab}
            projects={projects}
            similarities={semanticPairs}
            onSelect={select}
            onClearSelection={() => setSelection(null)}
          />
        )}
        {!projects.length ? (
          <p className="lab-empty">
            No projects in this scope. Reset the filters to explore the full
            collection.
          </p>
        ) : (
          <>
            {tab === "coverage" && (
              <>
                <div className="lab-section-heading">
                  <div>
                    <p className="lab-kicker">01 / Recurring problems</p>
                    <h2>
                      {coverageMode === "ai"
                        ? "AI capability meets delivery reality."
                        : "Same need. Different worlds."}
                    </h2>
                  </div>
                  <p>
                    {coverageMode === "ai"
                      ? "Recorded AI capabilities by delivery stage. Internal tools, prototypes and production stay distinct. Projects with no stage are omitted from the matrix; blank AI labels are not evidence of no AI."
                      : "Distinct projects at each need × use-case intersection. A project can appear in several cells; cells are not additive. Click a cell to inspect the work."}
                  </p>
                </div>
                <div className="lab-inline-controls">
                  <label>
                    Compare
                    <select
                      value={coverageMode}
                      onChange={(e) => {
                        setCoverageMode(e.target.value);
                        setSelection(null);
                      }}
                    >
                      <option value="needs">Buyer needs × use cases</option>
                      <option value="ai">
                        AI capabilities × delivery stages
                      </option>
                    </select>
                  </label>
                </div>
                <div className="lab-chart-scroll">
                  {matrixRows.length && matrixColumns.length ? (
                    <>
                      <EChart
                        option={matrixOption}
                        style={{
                          height: Math.max(600, matrixRows.length * 31 + 230),
                          minWidth: 1000,
                        }}
                        onEvents={{
                          click: (p: {
                            value: number[];
                            data: { ids: string[] };
                          }) =>
                            select(
                              `${matrixRows[p.value[1]]} × ${matrixColumns[p.value[0]]}`,
                              p.data.ids,
                            ),
                        }}
                      />
                    </>
                  ) : (
                    <p className="lab-empty">
                      {coverageMode === "ai"
                        ? "No recorded AI capability × delivery-stage intersections in this scope. Blank labels remain unknown."
                        : "No recorded need × use-case intersections in this scope."}
                    </p>
                  )}
                </div>
                <ChartRecords
                  rows={cells.map((cell) => ({
                    label: `${cell.row} × ${cell.column}`,
                    ids: cell.ids,
                  }))}
                  onSelect={select}
                />
                <div className="lab-notes">
                  <p>
                    <b>
                      {summary.projects - summary.missingStages} /{" "}
                      {summary.projects}
                    </b>{" "}
                    projects have a delivery stage recorded. Stage blanks stay
                    unknown.
                  </p>
                  <p>
                    {coverageMode === "ai" ? (
                      <>
                        <b>
                          {
                            projects.filter(
                              (p) => p.matching.aiCapabilities.length,
                            ).length
                          }
                        </b>{" "}
                        projects have recorded AI capabilities;{" "}
                        {
                          projects.filter(
                            (p) =>
                              p.matching.aiCapabilities.length &&
                              !p.matching.stages.length,
                          ).length
                        }{" "}
                        of those lack a stage. Labels describe capabilities, not
                        independently tested deployment.
                      </>
                    ) : (
                      <>
                        <b>
                          {
                            projects.filter((p) =>
                              p.matching.buyerNeeds.includes(
                                "Make data actionable",
                              ),
                            ).length
                          }
                        </b>{" "}
                        connect to making data actionable. Use the use-case
                        intersections to find examples outside the obvious
                        industry.
                      </>
                    )}
                  </p>
                </div>
              </>
            )}
            {tab === "evolution" && (
              <>
                <div className="lab-section-heading">
                  <div>
                    <p className="lab-kicker">03 / Across the years</p>
                    <h2>How the problem mix changes.</h2>
                  </div>
                  <p>
                    Project starts by year and buyer need. Each project counts
                    once per need in its start year. This measures the recorded
                    portfolio mix, not hours worked or skill adoption.
                  </p>
                </div>
                <div className="lab-chart-scroll">
                  <EChart
                    option={timelineOption}
                    style={{
                      height: Math.max(570, needs.length * 30 + 130),
                      minWidth: 900,
                    }}
                    onEvents={{
                      click: (p: {
                        value: number[];
                        data: { ids: string[] };
                      }) =>
                        select(
                          `${years[p.value[0]]} · ${needs[p.value[1]]}`,
                          p.data.ids,
                        ),
                    }}
                  />
                </div>
                <ChartRecords
                  rows={timeline.map((cell) => ({
                    label: `${cell.year} · ${cell.need}`,
                    ids: cell.ids,
                  }))}
                  onSelect={select}
                />
                <div className="lab-notes">
                  <p>
                    Tags describe projects as recorded today. Recent enrichment
                    can describe earlier work; this is not a historical log of
                    when a skill was learned.
                  </p>
                  <p>
                    Project durations overlap, and working patterns vary.
                    Summing durations would overstate experience; this view uses
                    start counts.
                  </p>
                </div>
              </>
            )}
            {tab === "evidence" && (
              <>
                <div className="lab-section-heading">
                  <div>
                    <p className="lab-kicker">
                      04 / What can the stories support?
                    </p>
                    <h2>The evidence is uneven.</h2>
                  </div>
                  <p>
                    Outcome provenance is categorical. Estimates, self-reported
                    results and measurements remain separate; there is no
                    combined “impact score”.
                  </p>
                </div>
                <div className="lab-legend">
                  {bases.map((b, i) => (
                    <span key={b}>
                      <i style={{ background: palette[i % palette.length] }} />
                      {b}
                    </span>
                  ))}
                </div>
                <EChart
                  option={evidenceOption}
                  replaceMerge={["series"]}
                  style={{ height: 340 }}
                  onEvents={{
                    click: (p: { seriesName: string; name: string }) =>
                      select(
                        `${p.name} · ${p.seriesName}`,
                        projects
                          .filter(
                            (x) =>
                              x.projectType === p.name &&
                              (x.outcomeBasis || "No outcome recorded") ===
                                p.seriesName,
                          )
                          .map((x) => x.id),
                      ),
                  }}
                />
                <ChartRecords
                  rows={evidenceTypes
                    .flatMap((type) =>
                      bases.map((basis) => ({
                        label: `${type} · ${basis}`,
                        ids: projects
                          .filter(
                            (p) =>
                              p.projectType === type &&
                              (p.outcomeBasis || "No outcome recorded") ===
                                basis,
                          )
                          .map((p) => p.id),
                      })),
                    )
                    .filter((row) => row.ids.length)}
                  onSelect={select}
                />
                <div className="lab-notes">
                  <p>
                    <b>
                      {summary.missingOutcomes} / {summary.projects}
                    </b>{" "}
                    have no outcome recorded. That is a documentation gap, not
                    evidence that the project had no value.
                  </p>
                  <p>
                    <b>{summary.missingStages}</b> have no delivery stage
                    recorded. “Completed” alone does not establish production
                    use.
                  </p>
                </div>
                <section className="lab-audit">
                  <div className="lab-section-heading">
                    <div>
                      <h2>Repository tag review</h2>
                      <p>
                        Proposals from first-party source inspection. No Notion
                        records were changed.
                      </p>
                    </div>
                    <label>
                      Finding type
                      <select
                        value={auditKind}
                        onChange={(e) => setAuditKind(e.target.value)}
                      >
                        <option>All findings</option>
                        <option value="missing">Missing existing tag</option>
                        <option value="taxonomy">New taxonomy candidate</option>
                        <option value="review">
                          Review existing / consistency
                        </option>
                      </select>
                    </label>
                  </div>
                  <p className="lab-caption">
                    {snapshot.metadata.auditCoverage.matchedProjects} project
                    repositories matched in this audit. Historical scope, build
                    tools and runtime features need different treatment. No
                    repository match does not mean a project lacks source.
                  </p>
                  <div className="lab-audit-list">
                    {findings.map((finding, i) => (
                      <article
                        key={`${finding.projectId}:${finding.property}:${finding.tag}:${i}`}
                      >
                        <div>
                          <span className={`lab-kind lab-kind-${finding.kind}`}>
                            {finding.kind === "missing"
                              ? "Existing tag"
                              : finding.kind === "taxonomy"
                                ? "New candidate"
                                : "Review"}
                          </span>
                          <span className="lab-confidence">
                            {finding.confidence} confidence
                          </span>
                        </div>
                        <h3>
                          {shortName(
                            projectMap.get(finding.projectId)?.name ??
                              finding.projectId,
                          )}{" "}
                          <span>→ {finding.tag}</span>
                        </h3>
                        <p className="lab-field">{finding.property}</p>
                        <p>{finding.evidence}</p>
                        {finding.caveat && (
                          <p className="lab-caveat">{finding.caveat}</p>
                        )}
                        <details>
                          <summary>Source evidence</summary>
                          {finding.paths.map((path) => (
                            <code key={path}>{path}</code>
                          ))}
                        </details>
                        <button
                          onClick={() =>
                            select(
                              projectMap.get(finding.projectId)?.name ??
                                "Project",
                              [finding.projectId],
                            )
                          }
                        >
                          Inspect project ↓
                        </button>
                      </article>
                    ))}
                  </div>
                  {!findings.length && (
                    <p className="lab-empty">
                      No audit findings for this scope and finding type.
                    </p>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </section>
      {selection && (
        <div className="lab-selection" role="status">
          <span>
            {selection.ids.length} selected · {selection.label}
          </span>
          <a href="#lab-records">Inspect selection ↓</a>
          <button onClick={() => setSelection(null)}>Clear</button>
        </div>
      )}
      <section
        className="lab-records"
        id="lab-records"
        aria-label="Project records"
      >
        <div className="lab-section-heading">
          <div>
            <h2>
              {selection ? selection.label : "Inspect the underlying projects"}
            </h2>
            <p aria-live="polite">
              {visibleProjects.length} project
              {visibleProjects.length === 1 ? "" : "s"}
              {selection ? " selected from the chart" : " in the current scope"}
              . Charts count distinct project IDs.
            </p>
          </div>
          {selection && (
            <button onClick={() => setSelection(null)}>Show full scope</button>
          )}
        </div>
        <div className="lab-record-grid">
          {visibleProjects.map((project) => (
            <details key={project.id}>
              <summary>
                <strong>{shortName(project.name)}</strong>
                {project.shortDescription && (
                  <span>{project.shortDescription}</span>
                )}
                <span>
                  {project.projectType} · {project.startDate.slice(0, 4)} ·{" "}
                  {project.matching.ownership || "Ownership unknown"}
                </span>
              </summary>
              <h3>{project.name}</h3>
              <p>{project.matching.summary || "No case context recorded."}</p>
              <dl>
                <dt>Delivery stages</dt>
                <dd>{project.matching.stages.join(" · ") || "Unknown"}</dd>
                <dt>Outcome basis</dt>
                <dd>{project.outcomeBasis || "Unknown"}</dd>
                <dt>Contribution basis</dt>
                <dd>{project.contributionBasis || "Unknown"}</dd>
                <dt>Case-study depth</dt>
                <dd>
                  {project.caseStudyWords
                    ? `${project.caseStudyWords.toLocaleString("en-GB")} words (EN)`
                    : "No published EN case study"}
                </dd>
                {!publicView && (
                  <>
                    <dt>Working pattern</dt>
                    <dd>{project.workingPattern || "Unknown"}</dd>
                  </>
                )}
                <dt>Needs</dt>
                <dd>
                  {project.matching.buyerNeeds.join(" · ") || "Unrecorded"}
                </dd>
                <dt>Technologies</dt>
                <dd>
                  {[...new Set([...project.tools, ...project.languages])].join(
                    " · ",
                  ) || "Unrecorded"}
                </dd>
              </dl>
              {project.contribution && <p>{project.contribution}</p>}
              {project.evidenceGaps && (
                <p className="lab-caveat">
                  Evidence gaps: {project.evidenceGaps}
                </p>
              )}
              {currentResearch?.projects.find((p) => p.id === project.id) && (
                <ResearchDetails
                  row={currentResearch.projects.find(
                    (p) => p.id === project.id,
                  )!}
                />
              )}
              {publicView ? (
                <Link
                  href={`/en/explorer?project=${encodeURIComponent(project.id)}&lens=product#atlas-explore-title`}
                >
                  Explore this project in the atlas ↗
                </Link>
              ) : (
                <a
                  href={`https://www.notion.so/${project.id.replaceAll("-", "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open source record ↗
                </a>
              )}
            </details>
          ))}
        </div>
      </section>
      {publicView ? (
        <details className="lab-method" id="lab-method">
          <summary>Sources, definitions & limits</summary>
          <p>
            A prepared snapshot of {snapshot.projects.length} published
            portfolio projects, refreshed{" "}
            {snapshot.metadata.exportedAt.slice(0, 10)}. Tags describe recorded
            project scope; they are not certifications or a measure of time
            spent.
          </p>
          <p>
            Charts count distinct projects. A project can belong to several
            groups. The expert workbench combines normalized field scores with
            explicit weights. Similarity helps exploration and does not predict
            project success. The Experience atlas provides the shared spatial
            explorer.
          </p>
          <p>
            Outcome labels distinguish owner reports from independently verified
            results. This preview uses a fixed dataset. Updating the website
            database does not automatically regenerate this preview.
          </p>
        </details>
      ) : (
        <details className="lab-method" id="lab-method">
          <summary>Sources, definitions & limits</summary>
          <dl>
            <dt>Population</dt>
            <dd>
              {snapshot.projects.length} public projects from the current
              website publication; archived, trashed and hidden Notion pages
              excluded. One row per project ID. Local repository source
              inspection adds proposals only.
            </dd>
            <dt>Publication refreshed</dt>
            <dd>{snapshot.metadata.publicationRefreshedAt}</dd>
            <dt>Notion read</dt>
            <dd>{snapshot.metadata.notionFetchedAt}</dd>
            <dt>Knowledge sync</dt>
            <dd>{snapshot.metadata.knowledgeSyncedAt}</dd>
            {snapshot.metadata.comparisonPublicationRefreshedAt && (
              <>
                <dt>Stored comparison publication</dt>
                <dd>
                  {snapshot.metadata.comparisonPublicationRefreshedAt}; the
                  local publication export contained{" "}
                  {snapshot.metadata.publicationEmbeddingDocuments} EN embedding
                  documents. The retained counterview is not a refreshed
                  embedding of the current publication.
                </dd>
              </>
            )}
            <dt>Embedding coverage</dt>
            <dd>
              {snapshot.metadata.embeddedProjects} / {snapshot.projects.length}{" "}
              projects; {snapshot.metadata.chunks} EN chunks;{" "}
              {snapshot.metadata.embeddingModel},{" "}
              {snapshot.metadata.embeddingDimensions} dimensions. Reused stored
              vectors; no paid generation.
            </dd>
            <dt>Semantic similarity</dt>
            <dd>
              Normalize each chunk vector, average chunks within a project,
              normalize the mean; cosine is the dot product of project
              centroids. Comparable model and dimension required; hashes must
              match the embedding export’s own publication. Values range −1 to
              1, not probabilities or match confidence.
            </dd>
            <dt>Technology overlap</dt>
            <dd>
              Distinct shared tools and languages divided by their distinct
              union (Jaccard). Field names are retained to avoid label
              collisions. Both empty means unavailable, not 100%.
            </dd>
            <dt>Evidence</dt>
            <dd>
              Outcome and contribution basis are source labels. Owner-confirmed
              does not mean independently audited. Case-study word count
              measures documentation depth, not quality or impact.
            </dd>
            <dt>Audit coverage</dt>
            <dd>
              {snapshot.metadata.auditCoverage.notes.join(" ")} Unmatched public
              projects:{" "}
              {snapshot.metadata.auditCoverage.unmatchedProjects.join("; ") ||
                "None"}
              .
            </dd>
            <dt>Refresh</dt>
            <dd>
              This is a fixed local snapshot, not a live connection. Refresh
              commands and exact calculations are retained in the repository
              documentation.
            </dd>
          </dl>
        </details>
      )}
    </div>
  );
}
