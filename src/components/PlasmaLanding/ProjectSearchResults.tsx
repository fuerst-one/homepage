"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import Link from "@/components/i18n/LocalizedLink";
import type { SearchProject } from "./projectSearch";

export const ProjectSearchResults = ({
  projects,
  loading,
  error,
  query,
  retry,
  onPreview,
}: {
  projects: SearchProject[];
  loading: boolean;
  error: boolean;
  query: string;
  retry: () => void;
  onPreview: (project: SearchProject | null) => void;
}) => {
  const de = useLocale() === "de";
  return (
    <section
      className="landing-search-results"
      aria-label={de ? "Passende Projekte" : "Matching projects"}
      onPointerLeave={() => onPreview(null)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onPreview(null);
      }}
    >
      <div className="landing-search-results-header" role="status">
        {loading
          ? de
            ? "Projektstichwörter werden geladen …"
            : "Loading project keywords…"
          : error
            ? de
              ? "Die Projektsuche ist gerade nicht verfügbar."
              : "Project search is unavailable."
            : de
              ? `${projects.length} passende ${projects.length === 1 ? "Projekt" : "Projekte"}`
              : `${projects.length} matching ${projects.length === 1 ? "project" : "projects"}`}
        {error && (
          <button type="button" onClick={retry}>
            {de ? "Erneut versuchen ↻" : "Try again ↻"}
          </button>
        )}
      </div>
      {!loading &&
        !error &&
        (projects.length ? (
          <div className="landing-search-results-list">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={project.href}
                prefetch={false}
                className="landing-search-result"
                onPointerMove={() => onPreview(project)}
                onFocus={() => onPreview(project)}
              >
                <span className="landing-search-result-copy">
                  <span className="landing-search-result-name">
                    {project.name}
                  </span>
                  <span className="landing-search-result-summary">
                    {project.summary}
                  </span>
                </span>
                <span aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="landing-search-empty">
            {de
              ? `Keine passenden Projekte für „${query}“. Probiere einen Projektnamen, ein Tool, eine Branche oder ein Fachgebiet.`
              : `No projects match “${query}”. Try a project name, tool, industry, or area of expertise.`}
          </p>
        ))}
    </section>
  );
};
