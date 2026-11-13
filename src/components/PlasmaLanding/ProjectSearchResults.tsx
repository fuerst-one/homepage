"use client";
import Link from "next/link";
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
  return (
    <section
      className="landing-search-results"
      aria-label={"Matching projects"}
      onPointerLeave={() => onPreview(null)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onPreview(null);
      }}
    >
      <div className="landing-search-results-header" role="status">
        {loading
          ? "Loading project keywords…"
          : error
            ? "Project search is unavailable."
            : `${projects.length} matching ${projects.length === 1 ? "project" : "projects"}`}
        {error && (
          <button type="button" onClick={retry}>
            {"Try again ↻"}
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
            {`No projects match “${query}”. Try a project name, tool, industry, or area of expertise.`}
          </p>
        ))}
    </section>
  );
};
