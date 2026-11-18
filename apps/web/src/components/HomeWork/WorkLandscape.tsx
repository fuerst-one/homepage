"use client";

import { Component, useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import {
  landscapePoints,
  workGroups,
  workMemberships,
  type WorkProject,
  type WorkLens,
} from "@homepage/content/workPortfolio";
import { caseLabel } from "@homepage/content/projectCase";
import type { Locale } from "@homepage/content/i18n";
import { enquiryPath } from "@homepage/content/enquiry";
import Link from "../i18n/LocalizedLink";
import { ProjectIndustry } from "../Cv/Projects/ProjectIndustry";
import { DeferredWorkView } from "./DeferredWorkView";

const Plot = dynamic(() => import("./WorkLandscapePlot"), {
  ssr: false,
  loading: () => (
    <div className="home-work-loading" role="status">
      Loading…
    </div>
  ),
});
const Space = dynamic(() => import("./WorkLandscape3D"), {
  ssr: false,
  loading: () => (
    <div className="home-work-loading" role="status">
      Loading 3D…
    </div>
  ),
});
class MapBoundary extends Component<
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

export function WorkLandscape({
  projects,
  locale,
}: {
  projects: WorkProject[];
  locale: Locale;
}) {
  const de = locale === "de";
  const [lens, setLens] = useState<WorkLens>("challenges");
  const [group, setGroup] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(projects[0]?.id ?? "");
  const [view, setView] = useState<"map" | "3d" | "list">("map");
  const groups = useMemo(
    () => workGroups(projects, lens, locale),
    [projects, lens, locale],
  );
  const points = useMemo(
    () => landscapePoints(projects, lens),
    [projects, lens],
  );
  const matching = useMemo(
    () =>
      projects.filter(
        (p) => !group || workMemberships(p, lens).includes(group),
      ),
    [projects, lens, group],
  );
  const selected = matching.find((p) => p.id === selectedId) ?? matching[0];
  const selection = (id: string) => {
    // A dimmed point remains an honest route to that project.
    if (!matching.some((p) => p.id === id)) setGroup(null);
    setSelectedId(id);
  };
  if (!projects.length || !selected) return null;
  return (
    <div className="home-landscape">
      <div className="home-landscape-controls">
        <div
          className="home-work-toggle"
          role="group"
          aria-label={de ? "Projekte gruppieren" : "Group projects"}
        >
          {(["challenges", "industries"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={lens === value}
              onClick={() => {
                setLens(value);
                setGroup(null);
              }}
            >
              {value === "challenges"
                ? de
                  ? "Aufgaben"
                  : "Client challenges"
                : de
                  ? "Branchen"
                  : "Industries"}
            </button>
          ))}
        </div>
        <div
          className="home-work-toggle"
          role="group"
          aria-label={de ? "Darstellung" : "Landscape view"}
        >
          {(["map", "3d", "list"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              onClick={() => setView(value)}
            >
              {value === "map"
                ? de
                  ? "Karte"
                  : "Map"
                : value === "3d"
                  ? "3D"
                  : de
                    ? "Liste"
                    : "List"}
            </button>
          ))}
        </div>
      </div>
      <div
        className="home-work-groups"
        role="group"
        aria-label={de ? "Projektbereiche" : "Project themes"}
      >
        <button
          type="button"
          aria-pressed={!group}
          onClick={() => setGroup(null)}
        >
          {de ? "Alle" : "All"} <span>{projects.length}</span>
        </button>
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            aria-pressed={group === g.id}
            onClick={() => setGroup(group === g.id ? null : g.id)}
          >
            <i style={{ background: g.color }} aria-hidden="true" />
            {g.label}
            <span>{g.ids.length}</span>
          </button>
        ))}
      </div>
      <div className="home-landscape-grid">
        <div>
          <div
            className={`home-landscape-visual ${view === "list" ? "is-list" : ""} ${groups.length > 6 ? "many-groups" : ""}`}
          >
            {view !== "list" && (
              <DeferredWorkView>
                <MapBoundary
                  key={`${view}:${lens}`}
                  fallback={
                    <p className="home-work-loading">
                      {de
                        ? "Die Kartenansicht ist hier nicht verfügbar. Alle Projekte bleiben über die Liste zugänglich."
                        : "The map is unavailable here. Every project is still accessible in the list."}
                    </p>
                  }
                >
                  {view === "3d" ? (
                    <Space
                      projects={projects}
                      points={points}
                      groups={groups}
                      selectedId={selected.id}
                      matchingIds={matching.map((p) => p.id)}
                      onSelect={selection}
                    />
                  ) : (
                    <Plot
                      projects={projects}
                      points={points}
                      groups={groups}
                      selectedId={selected.id}
                      matchingIds={matching.map((p) => p.id)}
                      onSelect={selection}
                    />
                  )}
                </MapBoundary>
              </DeferredWorkView>
            )}
            {view === "list" && (
              <ProjectList
                projects={matching}
                selectedId={selected.id}
                onSelect={selection}
                locale={locale}
              />
            )}
          </div>
          <p className="home-work-map-note">
            {de
              ? "Gruppiert nach erfassten Aufgaben und Branchen. Projekte können zu mehreren Bereichen passen; Abstände bewerten keine Fähigkeiten."
              : "Grouped by recorded challenges and industries. Projects can fit several themes; distances do not rate skills."}
            {view === "3d" &&
              (de
                ? " Ziehen zum Drehen · Scrollen zum Zoomen."
                : " Drag to orbit · scroll to zoom.")}
          </p>
          {view !== "list" && (
            <details className="home-work-project-list">
              <summary>
                {de ? "Projekte direkt auswählen" : "Choose a project directly"}{" "}
                <span>{matching.length}</span>
              </summary>
              <ProjectList
                projects={matching}
                selectedId={selected.id}
                onSelect={selection}
                locale={locale}
              />
            </details>
          )}
        </div>
        <article
          className="home-landscape-detail"
          aria-live="polite"
          aria-atomic="true"
          lang={selected.contentLocale}
        >
          <ProjectIndustry project={selected} locale={locale} />
          <h3>{selected.label}</h3>
          {selected.screenshot && (
            <Link href={selected.href} prefetch={false}>
              {/* Public project previews use the same native image path as the project gallery. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.screenshot}
                alt={`${selected.label} ${de ? "Projektansicht" : "preview"}`}
                loading="lazy"
                decoding="async"
              />
            </Link>
          )}
          <p className="home-work-role">
            {selected.ownership} · {selected.stages.join(" / ")}
          </p>
          <p>{selected.summary}</p>
          {group && lens === "challenges" && (
            <p className="home-work-relevance">
              <strong>
                {de ? "Passende Aufgaben" : "Relevant challenges"}
              </strong>
              {selected.matching.buyerNeeds
                .map((n) => caseLabel(n, locale))
                .slice(0, 3)
                .join(" · ")}
            </p>
          )}
          {selected.outcome && (
            <div className="home-work-outcome">
              <span>
                {de
                  ? "Ergebnis laut Projektbericht"
                  : "Reported project outcome"}
              </span>
              <p>{selected.outcome}</p>
            </div>
          )}
          <Link
            prefetch={false}
            href={selected.caseHref ?? selected.href}
            className="home-work-text-link"
          >
            {selected.caseHref
              ? de
                ? "Fallstudie lesen"
                : "Read the case study"
              : de
                ? "Projekt ansehen"
                : "View project"}{" "}
            ↗
          </Link>
          <Link
            prefetch={false}
            href={enquiryPath(
              { source: "project", projectId: selected.id },
              locale,
            )}
            className="home-work-text-link"
          >
            {de ? "Ähnliche Aufgabe besprechen" : "Discuss a similar challenge"}{" "}
            ↗
          </Link>
        </article>
      </div>
    </div>
  );
}
function ProjectList({
  projects,
  selectedId,
  onSelect,
  locale,
}: {
  projects: WorkProject[];
  selectedId: string;
  onSelect: (id: string) => void;
  locale: Locale;
}) {
  return (
    <ul
      className="home-work-list"
      aria-label={locale === "de" ? "Projektauswahl" : "Project selection"}
    >
      {projects.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            aria-pressed={selectedId === p.id}
            onClick={() => onSelect(p.id)}
          >
            {p.label}
            <span>{p.ownership}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
