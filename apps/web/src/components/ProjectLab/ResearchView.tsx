"use client";
import { useState } from "react";
import type { LabProject, ProjectAssessment } from "./analysis";
import { rangeLabel, validRange } from "./ownerLenses";
import { shortName } from "./chartPrimitives";

type Evidence = { path: string; line?: number; reason?: string };
type Fact = {
  dimension: string;
  value: string;
  basis: string;
  caveat?: string;
  numeric?: { min: number; max: number; unit: string };
  source: { provider: string; path: string; line: number; date: string };
};
export type ProjectResearch = {
  current?: ProjectAssessment;
  currentReadAt?: string;
  id: string;
  name: string;
  mappingStatus: string;
  team?: {
    lower: number | null;
    upper: number | null;
    basis: string;
    source: string;
    fetchedAt: string;
  };
  paths: {
    path: string;
    role: string;
    countForSize: boolean;
    includes: string[];
    excludes: string[];
    note: string;
  }[];
  complexity: {
    score: number;
    wholeProductScore: number | null;
    confidence: string;
    scope: string;
    reasons: string[];
    evidence: Evidence[];
  } | null;
  effort: {
    lower: number;
    upper: number;
    class: string;
    recordedClass?: string | null;
    confidence: string;
    basis: string;
    scope: string;
    assumptions: string[];
    excludes: string[];
  } | null;
  facts: Fact[];
  gaps: string[];
  code: {
    available: boolean;
    measuredAt: string;
    application: { code: number | null; files: number };
    tests: { code: number | null; files: number };
    unclassifiedCandidates: number;
    errors: { path: string; reason: string }[];
    roots: { path: string; git: { head: string; status: string } | null }[];
    languages: { name: string; application: number; tests: number }[];
  } | null;
};
export type ResearchDataset = {
  generatedAt: string;
  measuredAt?: string;
  policy: string;
  effortClassDefinition: string;
  projects: ProjectResearch[];
};
const number = (n: number | null | undefined) =>
  n == null ? "Unknown" : n.toLocaleString("en-GB");
const teamLabel = (team: ProjectResearch["team"]) =>
  !team || (team.lower === null && team.upper === null)
    ? "Unknown"
    : team.lower === team.upper
      ? number(team.lower)
      : `${team.lower ?? "?"}–${team.upper ?? "?"}`;
export function ResearchDetails({ row }: { row: ProjectResearch }) {
  return (
    <div className="lab-research-details">
      <p className="lab-kicker">
        Private research · {row.mappingStatus} mapping
      </p>
      {row.current && (
        <div className="lab-current-assessment">
          <h4>Current Notion observations</h4>
          <p>
            Wow-factor {row.current.wow ?? "Unknown"}/10 · complexity{" "}
            {row.current.complexity ?? "Unknown"}/5 · team{" "}
            {rangeLabel(row.current.teamLow, row.current.teamHigh)} ·{" "}
            {row.current.workplace || "Workplace unknown"}
          </p>
          <p>
            Replacement effort:{" "}
            {rangeLabel(row.current.effortLow, row.current.effortHigh)}{" "}
            person-days · recorded class {row.current.effortClass || "Unknown"}.
          </p>
          <p>
            {row.current.effortBasis ||
              "No estimate basis recorded for the current entry."}
          </p>
          <p>
            {row.current.complexityBasis ||
              "No complexity basis recorded for the current entry."}
          </p>
          <small>
            Read {row.currentReadAt}. These are source entries and subjective
            assessments. Earlier research below retains its original scopes and
            assumptions; changed scores or ranges do not inherit analyst
            confidence automatically.
          </small>
        </div>
      )}
      <dl>
        <dt>Team size · earlier research snapshot</dt>
        <dd>
          {teamLabel(row.team)}
          {row.team && (
            <p>
              {row.team.basis}. Read {row.team.fetchedAt}. Historical context
              below may describe a different period or narrower team.
            </p>
          )}
        </dd>
        <dt>Local source paths</dt>
        <dd>
          {row.paths.length
            ? row.paths.map((p) => (
                <div key={p.path + p.role}>
                  <b>
                    {p.role}
                    {p.countForSize ? " · measured" : " · reference only"}
                  </b>
                  <code>{p.path}</code>
                  {p.countForSize && (
                    <small>
                      Include: {p.includes.join(", ")}. Exclude:{" "}
                      {p.excludes.join(", ") ||
                        "standard generated/dependency policy"}
                      .
                    </small>
                  )}
                  {p.note && <p>{p.note}</p>}
                </div>
              ))
            : "No dedicated local source found; this does not mean the project had no code."}
        </dd>
        <dt>Measured source size</dt>
        <dd>
          {row.code?.available
            ? `${number(row.code.application.code)} application SLOC + ${number(row.code.tests.code)} test SLOC, ${number(row.code.application.files + row.code.tests.files)} source files. ${row.code.measuredAt}`
            : "Unknown — absent or deliberately excluded source scope."}{" "}
          {row.code?.available && (
            <>
              <p>
                Source lines exclude comments, blanks, recognized dependencies
                and generated/minified output. Embedded libraries can need extra
                scope exclusions. A checked-out codebase can contain upstream or
                team code; this is not personal authorship or quality. Test
                lines are not test coverage.
              </p>
              {(row.code.errors.length > 0 ||
                row.code.unclassifiedCandidates > 0) && (
                <p className="lab-caveat">
                  Partial count: {row.code.errors.length} unavailable
                  candidates; {row.code.unclassifiedCandidates} unclassified
                  candidates.
                </p>
              )}
              <small>
                {row.code.languages
                  .map(
                    (l) =>
                      `${l.name}: ${number(l.application)} app / ${number(l.tests)} test`,
                  )
                  .join(" · ")}
              </small>
            </>
          )}
        </dd>
        <dt>Earlier analyst complexity</dt>
        <dd>
          {row.complexity ? (
            <>
              {row.complexity.score}/5 · {row.complexity.confidence} confidence
              · analyst draft<p>Scope: {row.complexity.scope}</p>
              <ul>
                {row.complexity.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              {row.complexity.wholeProductScore !== null &&
                row.complexity.wholeProductScore !== row.complexity.score && (
                  <p>
                    Whole-product context: {row.complexity.wholeProductScore}/5.
                    Contribution assessment above has a narrower scope.
                  </p>
                )}
            </>
          ) : (
            "Unknown"
          )}
        </dd>
        <dt>Earlier analyst replacement effort</dt>
        <dd>
          {row.effort ? (
            <>
              {row.effort.lower}–{row.effort.upper} person-days · upper-bound
              class {row.effort.class} · {row.effort.confidence} confidence
              {row.effort.recordedClass !== undefined &&
                row.effort.recordedClass !== row.effort.class && (
                  <p className="lab-caveat">
                    Current Notion class:{" "}
                    {row.effort.recordedClass ?? "Unknown"}. The stated
                    upper-bound rule gives {row.effort.class}. The source edit
                    is preserved; its class/range definition needs review.
                  </p>
                )}
              <p>
                {row.effort.basis}. Scope: {row.effort.scope}.
              </p>
              <p>
                Assumptions: {row.effort.assumptions.join("; ")}. Excludes:{" "}
                {row.effort.excludes.join("; ")}.
              </p>
              <p>
                Unconfirmed analyst estimate, not recorded working time,
                historical spending or a quote. No euro conversion. Code
                footprint and contribution estimates can have different scopes.
              </p>
            </>
          ) : (
            "Unknown — insufficient implementation scope."
          )}
        </dd>
      </dl>
      {row.code?.roots.map((r) => (
        <p key={r.path}>
          <code>
            {r.path}: {r.git?.head ?? "No git revision"} ·{" "}
            {r.git?.status ?? "filesystem snapshot"}
          </code>
        </p>
      ))}
      {row.facts.length > 0 && (
        <details className="lab-details">
          <summary>History & notes · {row.facts.length} sourced facts</summary>
          {row.facts.map((f, i) => (
            <div key={i}>
              <h4>{f.dimension.replaceAll("_", " ")}</h4>
              <p>{f.value}</p>
              <p>{f.caveat}</p>
              <small>
                {f.basis} · {f.source.provider} · {f.source.date}
              </small>
              <code>
                {f.source.path}:{f.source.line}
              </code>
            </div>
          ))}
        </details>
      )}
      {row.complexity && (
        <details className="lab-details">
          <summary>Structural source evidence</summary>
          {row.complexity.evidence.map((e, i) => (
            <p key={i}>
              <code>
                {e.path}
                {e.line ? `:${e.line}` : ""}
              </code>
              {e.reason}
            </p>
          ))}
        </details>
      )}
      {row.gaps.length > 0 && (
        <p className="lab-caveat">Scope limits: {row.gaps.join(" ")}</p>
      )}
    </div>
  );
}
export function ResearchView({
  projects,
  dataset,
  onSelect,
}: {
  projects: LabProject[];
  dataset?: ResearchDataset;
  onSelect: (label: string, ids: string[]) => void;
}) {
  const [sort, setSort] = useState("size");
  const ids = new Set(projects.map((p) => p.id)),
    rows = (dataset?.projects ?? []).filter((p) => ids.has(p.id));
  const sorted = [...rows].sort((a, b) => {
    const value = (r: ProjectResearch) =>
      sort === "size"
        ? r.code?.application.code
        : sort === "complexity"
          ? r.current
            ? r.current.complexity
            : r.complexity?.score
          : sort === "team"
            ? r.current
              ? (r.current.teamHigh ?? r.current.teamLow)
              : (r.team?.upper ?? r.team?.lower)
            : r.current
              ? r.current.effortHigh
              : r.effort?.upper;
    return sort === "name"
      ? a.name.localeCompare(b.name)
      : (value(b) ?? -1) - (value(a) ?? -1) || a.name.localeCompare(b.name);
  });
  if (!dataset)
    return (
      <p className="lab-empty">
        Generate data/project-lab/enrichment.json to inspect source size and
        research fields.
      </p>
    );
  return (
    <>
      <div className="lab-section-heading">
        <div>
          <p className="lab-kicker">12 / Size, scope & judgment</p>
          <h2>What does rebuilding it involve?</h2>
        </div>
        <p>
          Measured source, subjective complexity and estimated contribution
          effort are separate dimensions. Open a row for its paths, assumptions
          and evidence.
        </p>
      </div>
      <div className="lab-notes">
        <p>
          <b>
            {rows.filter((p) => p.paths.length).length}/{rows.length} mapped
          </b>{" "}
          · {rows.filter((p) => p.code?.available).length} measured code scopes
          ·{" "}
          {
            rows.filter((p) =>
              p.current
                ? validRange(p.current.effortLow, p.current.effortHigh)
                : p.effort,
            ).length
          }{" "}
          recorded effort ranges.{" "}
          {
            rows.filter((p) =>
              p.current
                ? p.current.teamLow != null || p.current.teamHigh != null
                : p.team?.lower != null || p.team?.upper != null,
            ).length
          }{" "}
          current team-size entries.
        </p>
        <p>
          Current Notion entries + source research measured{" "}
          {dataset.measuredAt?.slice(0, 10) ?? dataset.generatedAt.slice(0, 10)}
          . No LOC-to-effort conversion; source footprints and contribution
          estimates are not additive.
        </p>
      </div>
      <div className="lab-inline-controls">
        <label>
          Sort research
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="size">Application source · largest first</option>
            <option value="complexity">
              Subjective complexity · highest first
            </option>
            <option value="effort">Effort upper bound · highest first</option>
            <option value="team">Team upper bound · largest first</option>
            <option value="name">Project name</option>
          </select>
        </label>
      </div>
      <p className="lab-method">
        SLOC = physical source lines excluding comments and blanks. Missing
        stays unknown; zero test SLOC means none found by this counting policy.
        Complexity is ordinal 1–5, from a simple flow to highly coupled
        domains/systems. Effort ranges are subjective replacement estimates in
        8-hour person-days. Current source entries take precedence; earlier
        analyst assumptions remain in the row details.
      </p>
      <div
        className="lab-chart-table lab-research-scroll"
        role="region"
        aria-label="Research comparison table"
        tabIndex={0}
      >
        <table className="lab-research-table">
          <thead>
            <tr>
              <th scope="col">Project / inspect</th>
              <th scope="col">Application SLOC</th>
              <th scope="col">Test SLOC</th>
              <th scope="col">Team · Notion</th>
              <th scope="col">Complexity · Notion</th>
              <th scope="col">Replacement days · Notion</th>
              <th scope="col">Upper class</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.id}>
                <th scope="row">
                  <button onClick={() => onSelect(row.name, [row.id])}>
                    {shortName(row.name)} →
                  </button>
                  <details>
                    <summary>Paths, scope & evidence</summary>
                    <ResearchDetails row={row} />
                  </details>
                </th>
                <td>
                  {number(row.code?.application.code)}
                  {row.code?.available &&
                    (row.code.errors.length > 0 ||
                      row.code.unclassifiedCandidates > 0) &&
                    "*"}
                </td>
                <td>{number(row.code?.tests.code)}</td>
                <td>
                  {row.current
                    ? rangeLabel(row.current.teamLow, row.current.teamHigh)
                    : teamLabel(row.team)}
                </td>
                <td>
                  {row.current
                    ? row.current.complexity == null
                      ? "Unknown"
                      : `${row.current.complexity}/5`
                    : row.complexity
                      ? `${row.complexity.score}/5`
                      : "Unknown"}
                </td>
                <td>
                  {row.current
                    ? rangeLabel(row.current.effortLow, row.current.effortHigh)
                    : row.effort
                      ? `${row.effort.lower}–${row.effort.upper}`
                      : "Unknown"}
                </td>
                <td>
                  {row.current
                    ? row.current.effortClass || "Unknown"
                    : row.effort
                      ? row.effort.recordedClass !== undefined
                        ? `${row.effort.recordedClass ?? "Unknown"}${row.effort.recordedClass !== row.effort.class ? " (source edit)" : ""}`
                        : row.effort.class
                      : "Unknown"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="lab-method">
        * Partial source count: inspect the row for unavailable/unclassified
        candidates. {dataset.effortClassDefinition}
      </p>
      <p className="lab-caveat">{dataset.policy}</p>
    </>
  );
}
