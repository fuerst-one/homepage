"use client";

import { useMemo, useRef, useState, type Ref } from "react";
import {
  compareProjectFields,
  projectComparisonLabels,
  crossLensCandidates,
  type ComparisonProject,
} from "./comparison";
import "./project-comparison.css";

export function revealComparison(heading: HTMLHeadingElement | null) {
  requestAnimationFrame(() => {
    if (!heading?.isConnected) return;
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({
      block: "center",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  });
}

export function PairComparison({
  a,
  b,
  headingRef,
}: {
  a: ComparisonProject;
  b: ComparisonProject;
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  const rows = compareProjectFields(a, b);
  const names = projectComparisonLabels([a, b]);
  const sharedFields = rows.filter((row) => row.shared.length).length;
  const knownFields = rows.filter((row) => !row.missing.length).length;
  const renderRow = (row: (typeof rows)[number]) => (
    <div className="comparison-field" key={row.id}>
      <div className="comparison-field-heading">
        <h4>{row.label}</h4>
        <span>
          {row.missing.length
            ? "Incomplete inputs"
            : `${row.shared.length} shared / ${row.total} labels`}
        </span>
      </div>
      <p>
        {row.shared.length
          ? row.shared.join(" · ")
          : row.missing.length
            ? "Overlap unknown"
            : "No recorded overlap"}
      </p>
      <details>
        <summary>Differences & missing inputs</summary>
        <div className="comparison-differences">
          <div>
            <b>{names.get(a.id)}</b>
            <p>
              {row.missing.includes("a")
                ? "Not recorded"
                : row.onlyA.join(" · ") || "No additional labels"}
            </p>
          </div>
          <div>
            <b>{names.get(b.id)}</b>
            <p>
              {row.missing.includes("b")
                ? "Not recorded"
                : row.onlyB.join(" · ") || "No additional labels"}
            </p>
          </div>
        </div>
      </details>
    </div>
  );
  return (
    <section
      className="project-comparison"
      aria-label={`Compare ${names.get(a.id)} and ${names.get(b.id)}`}
    >
      <div className="comparison-heading">
        <h3 ref={headingRef} tabIndex={-1}>
          {names.get(a.id)} ↔ {names.get(b.id)}
        </h3>
        <p>
          {sharedFields} fields with shared labels · {knownFields} of{" "}
          {rows.length} fields comparable
        </p>
      </div>
      <div className="comparison-fields">{rows.slice(0, 4).map(renderRow)}</div>
      <details className="comparison-more">
        <summary>Capabilities, methods, formats & sectors</summary>
        <div className="comparison-fields">{rows.slice(4).map(renderRow)}</div>
      </details>
      <p className="comparison-note">
        Recorded label overlap, with case and spacing normalized. A shared
        helper library counts as one label here; use the weighted workbench to
        distinguish architecture from helpers. Missing input stays unknown.
        These counts are not a measure of project fit.
      </p>
    </section>
  );
}

export function ProjectComparison({
  projects,
  initialAnchorId,
}: {
  projects: ComparisonProject[];
  initialAnchorId?: string;
}) {
  const [left, setLeft] = useState(
    initialAnchorId ??
      projects.find((p) => p.name.startsWith("Playlist-Stats"))?.id ??
      "",
  );
  const [right, setRight] = useState("");
  const comparisonHeading = useRef<HTMLHeadingElement>(null);
  const names = useMemo(() => projectComparisonLabels(projects), [projects]);
  const a = projects.find((p) => p.id === left) ?? projects[0];
  const candidates = useMemo(
    () => crossLensCandidates(projects, a?.id ?? "").slice(0, 3),
    [projects, a?.id],
  );
  const b =
    projects.find((p) => p.id === right && p.id !== a?.id) ??
    projects.find(
      (p) => p.id !== a?.id && p.name.startsWith("Playlist-Canvas"),
    ) ??
    projects.find((p) => p.id !== a?.id);
  if (!a || !b)
    return (
      <p className="comparison-note">
        Choose a scope with at least two projects to compare.
      </p>
    );
  return (
    <div className="comparison-workbench">
      <div className="comparison-selectors">
        <label>
          First project
          <select
            value={a.id}
            onChange={(e) => {
              setLeft(e.target.value);
              setRight("");
            }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {names.get(p.id)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Compare with
          <select value={b.id} onChange={(e) => setRight(e.target.value)}>
            {projects
              .filter((p) => p.id !== a.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {names.get(p.id)}
                </option>
              ))}
          </select>
        </label>
      </div>
      <PairComparison a={a} b={b} headingRef={comparisonHeading} />
      <CrossLensLeads
        projects={projects}
        anchorId={a.id}
        onCompare={(id) => {
          setRight(id);
          revealComparison(comparisonHeading.current);
        }}
        candidates={candidates}
      />
    </div>
  );
}

export function CrossLensLeads({
  projects,
  anchorId,
  onCompare,
  candidates: supplied,
}: {
  projects: ComparisonProject[];
  anchorId: string;
  onCompare: (id: string) => void;
  candidates?: ReturnType<typeof crossLensCandidates>;
}) {
  const candidates =
    supplied ?? crossLensCandidates(projects, anchorId).slice(0, 3);
  const names = projectComparisonLabels(projects);
  return (
    <section
      className="comparison-leads"
      aria-label="Similar needs, different tools"
    >
      <h3>Similar needs, different tools</h3>
      <p>
        At least two shared client needs, at least half of the combined needs,
        and no shared recorded tools. These are leads to inspect, not validated
        recommendations.
      </p>
      {candidates.length ? (
        <div>
          {candidates.map((candidate) => (
            <button
              type="button"
              key={candidate.b}
              onClick={() => onCompare(candidate.b)}
            >
              <strong>{names.get(candidate.b)}</strong>
              <span>
                {candidate.sharedNeeds.length} shared / {candidate.totalNeeds}{" "}
                needs
              </span>
              <small>{candidate.sharedNeeds.join(" · ")}</small>
              <span>Compare →</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="comparison-note">
          No project meets these conditions in the current scope. Broader
          overlap remains visible in the comparison above.
        </p>
      )}
    </section>
  );
}
