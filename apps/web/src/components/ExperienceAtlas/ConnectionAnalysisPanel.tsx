"use client";

import type { ReactNode } from "react";
import type { AtlasProject } from "./model";
import type { useConnectionAnalysis } from "./useConnectionAnalysis";
import { SPACE_COLORS } from "./spaceTypes";

export function ConnectionAnalysisPanel({
  analysis,
  projects,
  locale,
  selectedId,
  onSelect,
  inspectionOpen,
  onInspectionToggle,
  children,
  fieldLabels,
  similarity = false,
  calibrated = false,
}: {
  analysis: ReturnType<typeof useConnectionAnalysis>;
  projects: AtlasProject[];
  locale: "en" | "de";
  selectedId: string;
  onSelect: (id: string) => void;
  inspectionOpen: boolean;
  onInspectionToggle: (open: boolean) => void;
  children: ReactNode;
  fieldLabels?: Record<string, string>;
  similarity?: boolean;
  calibrated?: boolean;
}) {
  const de = locale === "de";
  const { result, error, pending } = analysis;
  const byId = new Map(projects.map((project) => [project.id, project]));
  const fields: Record<string, string> =
    fieldLabels ??
    (de
      ? {
          needs: "Kundenbedarf",
          product: "Produktformat",
          industry: "Branche",
          capabilities: "Fähigkeiten",
          tools: "Tools",
          methods: "Methoden",
          languages: "Sprachen",
        }
      : {
          needs: "Client needs",
          product: "Product format",
          industry: "Industry",
          capabilities: "Capabilities",
          tools: "Tools",
          methods: "Methods",
          languages: "Languages",
        });
  const projectButton = (id: string) => {
    const project = byId.get(id);
    return (
      <button
        type="button"
        key={id}
        className="cg-analysis-project"
        aria-pressed={id === selectedId}
        onClick={() => onSelect(id)}
      >
        <span
          aria-hidden="true"
          style={{
            backgroundColor: project?.presentation?.accentColor ?? "#88c5bb",
          }}
        />
        {project?.label ?? id}
      </button>
    );
  };
  return (
    <section className="cg-analysis" aria-labelledby="cg-analysis-title">
      <div className="cg-section-head">
        <span>02 / {de ? "LIVE-ANALYSE" : "LIVE ANALYSIS"}</span>
        <span role="status">
          {pending
            ? de
              ? "Wird berechnet…"
              : "Calculating…"
            : error
              ? de
                ? "Nicht verfügbar"
                : "Unavailable"
              : de
                ? "Aktuell"
                : "Up to date"}
        </span>
      </div>
      <h2 id="cg-analysis-title">
        {de ? "Gruppen & Ausreißer" : "Clusters & outliers"}
      </h2>
      <p className="cg-analysis-intro">
        {de
          ? "Aus aktiven Verbindungen berechnet. Wähle ein Projekt, um seine Verbindungen zu untersuchen."
          : "Calculated from active connections. Select a project to inspect its connections."}
      </p>
      {error ? (
        <p className="cg-empty">
          {de
            ? "Die Analyse konnte nicht starten. Ändere eine Gewichtung oder lade die Seite neu."
            : "Analysis could not start. Change a weight or reload to try again."}
        </p>
      ) : result ? (
        <div
          className={
            pending ? "cg-analysis-results is-pending" : "cg-analysis-results"
          }
          aria-busy={pending}
        >
          {pending && (
            <p className="cg-analysis-updating">
              {de
                ? "Das vorherige Ergebnis bleibt während der Neuberechnung sichtbar."
                : "Previous results remain visible while the new analysis runs."}
            </p>
          )}
          <div className="cg-analysis-stats">
            <span>
              <strong>{result.groups.length}</strong>{" "}
              {de ? "Gruppen" : "groups"}
            </span>
            <span>
              <strong>
                {
                  result.outliers.filter((item) => item.reason === "weak")
                    .length
                }
              </strong>{" "}
              {de ? "schwach verbunden" : "weakly connected"}
            </span>
            <span>
              <strong>
                {
                  result.outliers.filter(
                    (item) => item.reason === "disconnected",
                  ).length
                }
              </strong>{" "}
              {de ? "ohne Verbindung" : "disconnected"}
            </span>
          </div>
          {result.groups.length === 1 && (
            <p className="cg-empty">
              {de
                ? "Eine zusammenhängende Gruppe; keine klare Unterteilung erkannt."
                : "One connected group; no clear subdivision detected."}
            </p>
          )}
          {!result.groups.length && (
            <p className="cg-empty">
              {de
                ? "Keine verbundenen Gruppen bei diesen Einstellungen."
                : "No connected groups under these settings."}
            </p>
          )}
          <div className="cg-cluster-list">
            {result.groups.map((group, index) => (
              <article
                className="cg-cluster"
                key={group.id}
                id={`cg-cluster-${index}`}
                tabIndex={-1}
                aria-label={`${de ? "Gruppe" : "Group"} ${String(index + 1).padStart(2, "0")}`}
              >
                <div className="cg-cluster-heading">
                  <h3>
                    <span
                      className="cg-cluster-swatch"
                      aria-hidden="true"
                      style={{
                        backgroundColor:
                          SPACE_COLORS[index % SPACE_COLORS.length],
                      }}
                    />
                    {de ? "Gruppe" : "Group"}{" "}
                    {String(index + 1).padStart(2, "0")}
                  </h3>
                  <span>
                    {group.ids.length} {de ? "Projekte" : "projects"}
                  </span>
                </div>
                <p className="cg-cluster-score">
                  {Math.round(group.meanOverlap * 100)}%{" "}
                  {calibrated
                    ? de
                      ? "mittlere interne Verbindungsstärke"
                      : "mean internal connection strength"
                    : similarity
                      ? de
                        ? "mittlere interne Ähnlichkeit"
                        : "mean internal similarity"
                      : de
                        ? "mittlere interne Überschneidung"
                        : "mean internal overlap"}
                </p>
                <ul className="cg-cluster-traits">
                  {group.traits.map((trait) => (
                    <li key={`${trait.field}:${trait.value}`}>
                      <span>{fields[trait.field]}</span> {trait.value}{" "}
                      <small>
                        {trait.count}/{group.ids.length}
                      </small>
                    </li>
                  ))}
                </ul>
                <div className="cg-analysis-projects">
                  {group.ids.map(projectButton)}
                </div>
              </article>
            ))}
          </div>
          <div className="cg-outliers">
            <h3>
              {de
                ? "Ausreißer unter diesen Einstellungen"
                : "Outliers under these settings"}
            </h3>
            {result.outliers.length ? (
              <ul>
                {result.outliers.map((item) => (
                  <li key={item.id}>
                    {projectButton(item.id)}
                    <span>
                      {item.reason === "disconnected"
                        ? de
                          ? "Keine aktive Verbindung"
                          : "No active connections"
                        : `${calibrated ? (de ? "Stärkste Verbindung" : "Strongest connection") : similarity ? (de ? "Stärkste Ähnlichkeit" : "Strongest similarity") : de ? "Stärkste Überschneidung" : "Strongest overlap"}: ${(item.strongest * 100).toFixed(1)}% · ${item.neighbours} ${de ? "Verbindungen" : "connections"}`}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="cg-empty">
                {de
                  ? "Keine isolierten oder ungewöhnlich schwach verbundenen Projekte erkannt."
                  : "No isolated or unusually weakly connected projects detected."}
              </p>
            )}
          </div>
          <details className="cg-analysis-method">
            <summary>
              {de ? "Wie wird das berechnet?" : "How is this calculated?"}
            </summary>
            <p>
              {de
                ? "Die bestehende adaptive Clusteranalyse wählt die Gruppenzahl anhand der Trennung und wiederholter Teilstichproben. Sie nutzt relative Verbindungsstärken mit festem Cluster-Kontrast von 2,75, keine Bildschirmpositionen. Getrennte Komponenten bleiben getrennt. Schwach verbunden bedeutet: Der stärkste Federzug liegt unter einem Viertel des Medianwerts der stärksten Federzüge. Diese Projekte und isolierte Punkte werden separat aufgeführt. Fehlende Merkmale können die Einordnung beeinflussen."
                : "The existing adaptive clustering chooses the group count from separation and repeated subsamples. It uses relative connection strengths with a fixed cluster contrast of 2.75, not screen positions. Disconnected components stay separate. Weakly connected means the strongest spring is below one quarter of the median strongest spring. Those projects and isolated points are listed separately. Missing attributes can affect the result."}
            </p>
          </details>
        </div>
      ) : (
        <p className="cg-empty">
          {de
            ? "Die aktiven Verbindungen werden analysiert…"
            : "Analyzing the active connections…"}
        </p>
      )}
      <details
        className="cg-analysis-inspection"
        open={inspectionOpen}
        onToggle={(event) => onInspectionToggle(event.currentTarget.open)}
      >
        <summary>
          {de ? "Projektanalyse" : "Project analysis"}:{" "}
          {byId.get(selectedId)?.label ?? "—"}
        </summary>
        {children}
      </details>
    </section>
  );
}
