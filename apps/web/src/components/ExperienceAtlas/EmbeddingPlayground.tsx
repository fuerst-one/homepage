"use client";

import { useEffect, useRef, useState } from "react";
import { FlaskConical, Plus, RotateCcw, X } from "lucide-react";
import {
  DEFAULT_FIELDS,
  EMBEDDING_FIELDS,
  selectionCoverage,
  type EmbeddingField,
} from "./embeddingFields";
import type { ExperimentComparison } from "./embeddingExperiments";
import type { AtlasProject } from "./model";
import type { SpaceRecipe } from "./spaceTypes";

export type ComparisonMode = "joint" | "blend";
type Capabilities = {
  configured: boolean;
  projects: number;
  fields: { id: EmbeddingField; projectIds: string[] }[];
};
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
const metric = (value: number | null | undefined) =>
  value == null ? "—" : value.toFixed(3);

export function EmbeddingPlayground({
  recipe,
  projects,
  result,
  mode,
  onResult,
  onMode,
  onReset,
}: {
  recipe: SpaceRecipe;
  projects: AtlasProject[];
  result?: ExperimentComparison;
  mode: ComparisonMode;
  onResult: (result: ExperimentComparison) => void;
  onMode: (mode: ComparisonMode) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<EmbeddingField[]>(
    DEFAULT_FIELDS[recipe],
  );
  const [sector, setSector] = useState("");
  const [search, setSearch] = useState("");
  const [capabilities, setCapabilities] = useState<Capabilities>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [applied, setApplied] = useState("");
  const controller = useRef<AbortController | null>(null);
  const signature = JSON.stringify([[...fields].sort(), sector]);
  const sectors = [...new Set(projects.flatMap((p) => p.industries))].sort();
  const selectedProjects = projects.filter(
    (p) => !sector || p.industries.includes(sector),
  );
  const coverage = capabilities
    ? selectionCoverage(
        selectedProjects.map((p) => p.id),
        fields,
        capabilities.fields,
      )
    : undefined;
  const coverageLabel = (id: EmbeddingField) =>
    coverage ? `${coverage.missingByField[id].length} missing` : "Checking…";
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!open) return;
    const abort = new AbortController();
    fetch("/api/lab/embeddings", { signal: abort.signal })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            "The playground is available on the local dev server.",
          );
        return response.json();
      })
      .then(setCapabilities)
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [open]);
  useEffect(() => {
    if (!busy) return;
    const start = performance.now();
    const timer = window.setInterval(
      () => setElapsed(performance.now() - start),
      250,
    );
    return () => window.clearInterval(timer);
  }, [busy]);
  const toggle = (id: EmbeddingField) =>
    setFields((current) =>
      current.includes(id) ? current.filter((f) => f !== id) : [...current, id],
    );
  const reset = () => {
    setFields(DEFAULT_FIELDS[recipe]);
    setSector("");
    setApplied("");
    setError("");
    onReset();
  };
  const run = async () => {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setElapsed(0);
    setError("");
    const start = performance.now();
    try {
      const response = await fetch("/api/lab/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipe,
          fields,
          projectIds: selectedProjects.map((p) => p.id),
        }),
        signal: abort.signal,
      });
      const value = await response.json();
      if (!response.ok)
        throw new Error(value.error || "The comparison could not finish.");
      if (!abort.signal.aborted) {
        onResult(value);
        setApplied(signature);
        setElapsed(performance.now() - start);
      }
    } catch (e) {
      if (!abort.signal.aborted)
        setError(
          e instanceof Error ? e.message : "The comparison could not finish.",
        );
    } finally {
      if (!abort.signal.aborted) setBusy(false);
    }
  };
  return (
    <div className="vs-playground">
      <div className="vs-input-strip">
        <span>
          {result && mode === "blend"
            ? "EMBEDDED SEPARATELY · BLENDED"
            : !result && recipe !== "engineering"
              ? "COMPARED AS RECORDED FIELDS"
              : "EMBEDDED TOGETHER"}
        </span>
        {(result?.fields ?? DEFAULT_FIELDS[recipe]).map((id, i) => (
          <span key={id} className="vs-input-field">
            {i > 0 && <b>+</b>}
            {EMBEDDING_FIELDS.find((f) => f.id === id)!.label}
          </span>
        ))}
        <button
          type="button"
          className="vs-experiment-toggle"
          aria-expanded={open}
          aria-controls="embedding-playground"
          onClick={() => setOpen(!open)}
        >
          <FlaskConical size={14} />
          {open ? "Close playground" : "Try different fields"}
        </button>
      </div>
      {open && (
        <div id="embedding-playground" className="vs-experiment-body">
          <div className="vs-experiment-heading">
            <div>
              <p className="vs-kicker">LOCAL / EMBEDDING PLAYGROUND</p>
              <h3>Same fields. Two ways to connect them.</h3>
            </div>
            <button type="button" onClick={reset} disabled={busy}>
              <RotateCcw size={13} /> Restore original lens
            </button>
          </div>
          <p className="vs-experiment-intro">
            Compare a single embedding of the complete text with an equal blend
            of separately embedded fields. Both maps use the same projects and
            automatically choose their cluster count. This comparison requires
            every selected field. The product and contribution defaults compare
            recorded categories directly, with team size treated numerically;
            running this experiment instead tests text embeddings.
          </p>
          <fieldset disabled={busy} className="vs-experiment-fields">
            <legend>Fields to compare</legend>
            <div className="vs-field-chips">
              {EMBEDDING_FIELDS.filter((f) => fields.includes(f.id)).map(
                (f) => (
                  <button
                    type="button"
                    key={f.id}
                    onClick={() => toggle(f.id)}
                    aria-label={`Remove ${f.label}`}
                    aria-describedby={`vs-field-coverage-${f.id}`}
                    title={
                      coverage?.missingByField[f.id].length
                        ? `Missing for: ${coverage.missingByField[f.id].map((id) => projects.find((p) => p.id === id)?.label ?? id).join(", ")}`
                        : "Recorded for every project in the selected set"
                    }
                  >
                    {f.label}
                    <small
                      id={`vs-field-coverage-${f.id}`}
                      className="vs-field-missing"
                      data-incomplete={Boolean(
                        coverage?.missingByField[f.id].length,
                      )}
                    >
                      {coverageLabel(f.id)}
                    </small>
                    <X size={12} />
                  </button>
                ),
              )}
              <details className="vs-field-picker">
                <summary>
                  <Plus size={13} /> Add a field
                </summary>
                <div>
                  <input
                    type="search"
                    aria-label="Search embedding fields"
                    placeholder="Search fields…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <div className="vs-field-options">
                    {EMBEDDING_FIELDS.filter((f) =>
                      f.label.toLowerCase().includes(search.toLowerCase()),
                    ).map((f) => (
                      <label key={f.id}>
                        <input
                          type="checkbox"
                          checked={fields.includes(f.id)}
                          onChange={() => toggle(f.id)}
                        />
                        <span>
                          {f.label}
                          {"numeric" in f && <em>Number as text</em>}
                        </span>
                        <small
                          className="vs-field-missing"
                          data-incomplete={Boolean(
                            coverage?.missingByField[f.id].length,
                          )}
                        >
                          {coverageLabel(f.id)}
                        </small>
                      </label>
                    ))}
                    {!EMBEDDING_FIELDS.some((f) =>
                      f.label.toLowerCase().includes(search.toLowerCase()),
                    ) && (
                      <p className="vs-experiment-status">
                        No matching fields.
                      </p>
                    )}
                  </div>
                </div>
              </details>
            </div>
            <div
              className="vs-coverage-preview"
              role="status"
              aria-live="polite"
            >
              <span>COMPLETE-DATA COMPARISON</span>
              {!fields.length ? (
                <strong>Choose fields to preview coverage.</strong>
              ) : coverage ? (
                <>
                  <strong>
                    {coverage.readyIds.length}/{selectedProjects.length}{" "}
                    projects ready
                  </strong>
                  <span>
                    {coverage.incompleteIds.length} incomplete · each project
                    counted once
                  </span>
                </>
              ) : (
                <strong>Checking field coverage…</strong>
              )}
            </div>
            <p className="vs-experiment-status">
              Counts follow the project filter. {EMBEDDING_FIELDS.length} public
              project fields are available; IDs, media and private research
              notes are not embedding inputs.
              {EMBEDDING_FIELDS.some(
                (f) => "numeric" in f && fields.includes(f.id),
              ) &&
                " Numbers are embedded as text, not treated as numeric distances."}
            </p>
            <div className="vs-experiment-actions">
              <label>
                Project set
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                >
                  <option value="">All projects ({projects.length})</option>
                  {sectors.map((s) => (
                    <option key={s} value={s}>
                      {s} (
                      {projects.filter((p) => p.industries.includes(s)).length})
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="vs-run-comparison"
                onClick={run}
                disabled={
                  !fields.length ||
                  !capabilities?.configured ||
                  !coverage ||
                  coverage.readyIds.length < 2 ||
                  busy
                }
              >
                <FlaskConical size={14} />
                {busy ? `Comparing · ${seconds(elapsed)}` : "Run comparison"}
              </button>
              <span>
                {!fields.length
                  ? "Choose at least one field."
                  : coverage && coverage.readyIds.length < 2
                    ? "Choose fields shared by at least two projects."
                    : result && signature !== applied
                      ? "Draft changed · run to update the map"
                      : "Model calls only when you run · cached inputs are reused"}
              </span>
            </div>
          </fieldset>
          {capabilities && !capabilities.configured && (
            <p role="status">
              The local dev server needs its embedding-provider configuration.
            </p>
          )}
          {error && (
            <p className="vs-experiment-error" role="alert">
              {error}
            </p>
          )}
          <div aria-live="polite" role="status">
            {busy && (
              <p className="vs-experiment-status">
                Preparing missing vectors, then evaluating cluster counts. First
                runs take longer; changing the displayed result below makes no
                model calls.
              </p>
            )}
          </div>
          {result && (
            <>
              <div
                className="vs-comparison-results"
                role="group"
                aria-label="Embedding comparison results"
              >
                {(["joint", "blend"] as const).map((item, index) => {
                  const value = result[item],
                    d = value.space.clustering;
                  return (
                    <button
                      type="button"
                      key={item}
                      aria-pressed={mode === item}
                      onClick={() => onMode(item)}
                    >
                      <span className="vs-comparison-title">
                        <b>{index === 0 ? "A" : "B"}</b>
                        <strong>
                          {item === "joint"
                            ? "Embed together"
                            : "Blend cached fields"}
                        </strong>
                        <small>{mode === item ? "ON MAP" : "VIEW MAP"}</small>
                      </span>
                      <span className="vs-comparison-metrics">
                        <span>
                          <b>{d?.reason === "selected" ? d.k : "—"}</b>
                          {d?.reason === "selected"
                            ? "groups"
                            : "unpartitioned"}
                        </span>
                        <span>
                          <b>{metric(d?.silhouette)}</b>separation
                        </span>
                        <span>
                          <b>{metric(d?.stability)}</b>stability
                        </span>
                        <span>
                          <b>{seconds(value.calculationMs)}</b>calculation
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="vs-experiment-status">
                {result.included}/{result.requested} projects have every
                selected field. {result.requested - result.included} excluded
                for missing data. {result.newVectors} new vectors ·{" "}
                {result.reusedVectors} reused · {seconds(result.embeddingMs)}{" "}
                preparing vectors · {seconds(elapsed)} total.
              </p>
              <p className="vs-experiment-status">
                Higher separation and stability describe geometry, not client
                relevance. Compare the actual neighbours too. Each map is fitted
                independently; axis directions and colours can change.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
