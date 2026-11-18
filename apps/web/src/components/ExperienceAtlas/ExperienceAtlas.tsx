"use client";

import { ProjectScaleFacts } from "../Cv/Projects/ProjectScaleFacts";

import { useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "../i18n/LocalizedLink";
import { PageEyebrow } from "../PageEyebrow";
import { Button } from "../Button";
import { enquiryPath } from "@homepage/content/enquiry";
import { ArrowDown, ArrowUpRight, Network } from "lucide-react";
import { ProjectScreenshots } from "../Cv/Projects/ProjectScreenshots";
import type { AtlasProject } from "./model";
import { STORIES } from "./stories";
import { SemanticSpaceWorkbench } from "./SemanticSpaceWorkbench";
import type { SemanticDataset } from "./spaceTypes";
import {
  readAtlasNavigation,
  updateAtlasUrl,
  type AtlasNavigation,
} from "./atlasNavigation";
import "./experience-atlas.css";

const year = (date: string) =>
  /^\d{4}-/.test(date) ? date.slice(0, 4) : "Date not recorded";

export function ExperienceAtlas({
  projects,
  semanticData,
  experimentsEnabled = false,
}: {
  projects: AtlasProject[];
  semanticData?: SemanticDataset;
  experimentsEnabled?: boolean;
}) {
  const searchParams = useSearchParams();
  const {
    project: selectedId,
    lens,
    view,
  } = readAtlasNavigation(searchParams, projects);
  const detailRef = useRef<HTMLElement>(null);
  const selected = projects.find((p) => p.id === selectedId);
  const navigate = (change: Partial<AtlasNavigation>) => {
    const url = new URL(window.location.href);
    const current = `${url.pathname}${url.search}${url.hash}`;
    const next = updateAtlasUrl(url, change);
    // Next observes native history updates without fetching or remounting the map.
    if (next !== current) window.history.pushState(null, "", next);
  };
  const select = (project: string) => navigate({ project });
  const reveal = (element: HTMLElement | null) => {
    element?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
    element?.focus({ preventScroll: true });
  };

  if (!projects.length)
    return (
      <div className="experience-atlas">
        <h1>No projects to explore yet.</h1>
        <Link href="/en/projects">Browse all projects</Link>
      </div>
    );
  const story = selected ? STORIES[selected.id] : undefined;
  const related = (selected?.related ?? []).flatMap((relation) => {
    const project = projects.find((p) => p.id === relation.id);
    return project ? [{ project, reasons: relation.reasons }] : [];
  });

  return (
    <div className="experience-atlas is-vector-mode">
      <header className="atlas-intro">
        <div>
          <PageEyebrow>Different fields. Connected experience.</PageEyebrow>
          <h1 id="atlas-explore-title">Experience atlas</h1>
        </div>
        <div className="atlas-intro-copy">
          <p>
            Change the lens to discover what connects the work. Choose a cluster
            or project to explore where your next challenge might fit.
          </p>
          <span>
            {projects.length} projects <i /> 4 perspectives
          </span>
        </div>
      </header>

      <section
        className="atlas-semantic-section"
        aria-labelledby="atlas-explore-title"
      >
        <SemanticSpaceWorkbench
          data={semanticData}
          experimentsEnabled={experimentsEnabled}
          projects={projects}
          selectedId={selectedId}
          recipe={lens}
          onRecipe={(lens) => navigate({ lens })}
          view={view}
          onView={(view) => navigate({ view })}
          onSelect={select}
          onExplore={() => reveal(detailRef.current)}
        />
      </section>

      {selected && (
        <section
          id="atlas-project-detail"
          className="atlas-detail"
          aria-labelledby="atlas-detail-title"
          ref={detailRef}
          tabIndex={-1}
        >
          <div className="atlas-detail-heading">
            <div>
              <p className="atlas-eyebrow">02 / Inside the work</p>
              <h2 id="atlas-detail-title">{selected.name}</h2>
              <p className="atlas-subtitle">{selected.subtitle}</p>
            </div>
            <div className="atlas-detail-meta">
              <span>
                {selected.projectType === "Hobby"
                  ? "Independent exploration"
                  : selected.projectType}
              </span>
              <span>
                {year(selected.startDate)}
                {selected.endDate &&
                year(selected.endDate) !== year(selected.startDate)
                  ? ` — ${year(selected.endDate)}`
                  : ""}
              </span>
              <span>
                {selected.matching.stages.join(" / ") || "Stage not recorded"}
              </span>
            </div>
          </div>
          <div className="atlas-story-grid">
            <figure className="atlas-project-media">
              {selected.screenshots.length ? (
                <ProjectScreenshots
                  key={selected.id}
                  screenshots={selected.screenshots}
                  projectName={selected.name}
                />
              ) : (
                <div className="atlas-no-media">
                  <Network size={44} />
                  <span>{selected.name}</span>
                  <p>Project imagery has not been added yet.</p>
                </div>
              )}
              <figcaption>
                {story?.caption ?? `${selected.name} / Portfolio imagery`}
              </figcaption>
              <div className="atlas-project-tags">
                {[...selected.industries, ...selected.matching.domains].map(
                  (domain) => (
                    <span key={domain}>{domain}</span>
                  ),
                )}
              </div>
            </figure>
            <div className="atlas-story glass-panel">
              <p className="atlas-eyebrow">The challenge</p>
              <p className="atlas-challenge">
                {story?.challenge ??
                  (selected.summary ||
                    "Explore the recorded scope and contribution below.")}
              </p>
              <div className="atlas-contribution">
                <h3>
                  My contribution <span>{selected.ownership}</span>
                </h3>
                <p>
                  {selected.contribution ||
                    "The exact contribution has not been documented in this snapshot."}
                </p>
              </div>
              {story ? (
                <div className="atlas-outcome">
                  <span className="atlas-eyebrow">What came out of it</span>
                  <strong>{story.result}</strong>
                  <small>{story.basis}</small>
                </div>
              ) : (
                <div className="atlas-delivery">
                  <span className="atlas-eyebrow">Delivery context</span>
                  <p>
                    {selected.delivery ||
                      selected.matching.stages.join(" · ") ||
                      "Delivery context has not been recorded."}
                  </p>
                </div>
              )}
              <div className="atlas-detail-actions">
                <Link href={`/en/projects/${encodeURIComponent(selected.id)}`}>
                  View full project <ArrowUpRight size={16} />
                </Link>
                {selected.caseHref && (
                  <a href={selected.caseHref}>
                    Read the case study <ArrowUpRight size={16} />
                  </a>
                )}
                {selected.websiteHref && (
                  <a
                    href={selected.websiteHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Visit project <ArrowUpRight size={16} />
                  </a>
                )}
              </div>
            </div>
          </div>

          <section
            className="atlas-related"
            aria-labelledby="atlas-related-title"
          >
            <div className="atlas-section-heading">
              <div>
                <p className="atlas-eyebrow">Follow a connection</p>
                <h3 id="atlas-related-title">
                  Different fields. Familiar challenges.
                </h3>
              </div>
              <p>
                Shared needs and methods connect this work
                <br />
                to other industries in the portfolio.
              </p>
            </div>
            <div className="atlas-related-grid">
              {related.length ? (
                related.map(({ project, reasons }) => (
                  <button
                    type="button"
                    key={project.id}
                    onClick={() => {
                      select(project.id);
                      reveal(detailRef.current);
                    }}
                  >
                    <span className="atlas-related-domain">
                      {project.industries.join(" / ")}
                      <ArrowUpRight size={17} />
                    </span>
                    <strong>{project.label}</strong>
                    <p>{project.subtitle}</p>
                    <span className="atlas-shared-label">The connection</span>
                    <span className="atlas-related-reasons">
                      {reasons.join(" · ")}
                    </span>
                  </button>
                ))
              ) : (
                <p>No cross-field connection is documented yet.</p>
              )}
            </div>
          </section>

          <details className="atlas-evidence" key={selected.id}>
            <summary>
              Evidence, tools & delivery notes{" "}
              <span>
                View context <ArrowDown size={14} />
              </span>
            </summary>
            <div>
              <section>
                <h4>Reported outcomes</h4>
                <span>
                  {selected.outcomeBasis || "No result basis recorded"}
                </span>
                <p>
                  {selected.outcome ||
                    "No outcome is recorded for this project."}
                </p>
              </section>
              <section>
                <h4>Delivery & ongoing work</h4>
                <p>
                  {selected.delivery || "No additional delivery note recorded."}
                </p>
                <span>{selected.maintenance}</span>
              </section>
              <section>
                <h4>Tools used</h4>
                <p>{selected.tools.join(" · ") || "Not recorded"}</p>
                <h4>Languages</h4>
                <p>{selected.languages.join(" · ") || "Not recorded"}</p>
                <h4>Capabilities</h4>
                <p>{selected.capabilities.join(" · ") || "Not recorded"}</p>
                <h4>Methods</h4>
                <p>{selected.methods.join(" · ") || "Not recorded"}</p>
                <ProjectScaleFacts scale={selected.scale} />
              </section>
            </div>
          </details>
        </section>
      )}

      <section className="atlas-enquiry">
        <p className="atlas-eyebrow">Bring your field into the picture</p>
        <h2>
          Where does your
          <br />
          <em>challenge fit?</em>
        </h2>
        <div>
          <p>
            A familiar problem, a new industry, or a product that connects
            several worlds. Let’s explore what your project needs.
          </p>
          <Button
            variant="cta"
            arrow
            href={enquiryPath(
              selected ? { source: "project", projectId: selected.id } : {},
              "en",
            )}
            prefetch={false}
          >
            Discuss your project
          </Button>
        </div>
      </section>
    </div>
  );
}
