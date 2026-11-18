"use client";

import { projectDescription } from "./atlasCopy";
import { useAtlasCopy } from "./useAtlasCopy";

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
  const { locale, t, term } = useAtlasCopy();
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
        <h1>{t("No projects to explore yet.")}</h1>
        <Link href="/projects">{t("Browse all projects")}</Link>
      </div>
    );
  const story = selected && locale === "en" ? STORIES[selected.id] : undefined;
  const related = (selected?.related ?? []).flatMap((relation) => {
    const project = projects.find((p) => p.id === relation.id);
    return project ? [{ project, reasons: relation.reasons }] : [];
  });

  return (
    <div className="experience-atlas is-vector-mode">
      <header className="atlas-intro glass-panel">
        <div>
          <PageEyebrow>
            {t("Different fields. Connected experience.")}
          </PageEyebrow>
          <h1 id="atlas-explore-title">{t("Explore")}</h1>
        </div>
        <div className="atlas-intro-copy">
          <p>
            {t(
              "Change the lens to discover what connects the work. Choose a cluster or project to explore where your next challenge might fit. ",
            )}
          </p>
          <span>
            {projects.length} {t("projects ")}
            <i /> {t("4 perspectives")}
            <Link href="/projects" className="atlas-projects-link">
              {t("Browse all projects")} <ArrowUpRight size={13} />
            </Link>
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
          <div className="atlas-detail-heading glass-panel">
            <div>
              <p className="atlas-eyebrow">{t("02 / Inside the work")}</p>
              <h2 id="atlas-detail-title">{selected.name}</h2>
              {locale === "en" && (
                <p className="atlas-subtitle">{selected.subtitle}</p>
              )}
            </div>
            <div className="atlas-detail-meta">
              <span>
                {selected.projectType === "Hobby"
                  ? t("Independent exploration")
                  : term(selected.projectType)}
              </span>
              <span>
                {t(year(selected.startDate))}
                {selected.endDate &&
                year(selected.endDate) !== year(selected.startDate)
                  ? ` — ${year(selected.endDate)}`
                  : ""}
              </span>
              <span>
                {selected.matching.stages.map(term).join(" / ") ||
                  t("Stage not recorded")}
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
                  locale={locale}
                />
              ) : (
                <div className="atlas-no-media">
                  <Network size={44} />
                  <span>{selected.name}</span>
                  <p>{t("Project imagery has not been added yet.")}</p>
                </div>
              )}
              <figcaption>
                {story?.caption ??
                  `${selected.name} / ${t("Portfolio imagery")}`}
              </figcaption>
              <div className="atlas-project-tags">
                {[...selected.industries, ...selected.matching.domains].map(
                  (domain) => (
                    <span key={domain}>{term(domain)}</span>
                  ),
                )}
              </div>
            </figure>
            <div className="atlas-story glass-panel">
              <p className="atlas-eyebrow">{t("The challenge")}</p>
              <p
                className="atlas-challenge"
                lang={locale === "de" ? selected.presentation?.locale : "en"}
              >
                {locale === "de"
                  ? projectDescription(selected)
                  : (story?.challenge ??
                    (selected.summary ||
                      t("Explore the recorded scope and contribution below.")))}
              </p>
              <div className="atlas-contribution">
                <h3>
                  {t("My contribution ")}
                  <span>{term(selected.ownership)}</span>
                </h3>
                {locale === "en" && (
                  <p>
                    {selected.contribution ||
                      t(
                        "The exact contribution has not been documented in this snapshot.",
                      )}
                  </p>
                )}
              </div>
              {locale === "de" && selected.presentation?.casePreview?.length ? (
                selected.presentation.casePreview.map((excerpt) => (
                  <div className="atlas-delivery" key={excerpt.title}>
                    <h3>{excerpt.title}</h3>
                    <p>{excerpt.text}</p>
                  </div>
                ))
              ) : story ? (
                <div className="atlas-outcome">
                  <span className="atlas-eyebrow">
                    {t("What came out of it")}
                  </span>
                  <strong>{story.result}</strong>
                  <small>{story.basis}</small>
                </div>
              ) : (
                <div className="atlas-delivery">
                  <span className="atlas-eyebrow">{t("Delivery context")}</span>
                  <p>
                    {(locale === "en" ? selected.delivery : "") ||
                      selected.matching.stages.map(term).join(" · ") ||
                      t("Delivery context has not been recorded.")}
                  </p>
                </div>
              )}
              <div className="atlas-detail-actions">
                {selected.presentation?.projectHref && (
                  <Link href={selected.presentation.projectHref}>
                    {t("View full project ")}
                    <ArrowUpRight size={16} />
                  </Link>
                )}
                {selected.presentation?.caseHref && (
                  <a
                    href={selected.presentation.caseHref}
                    hrefLang={selected.presentation.caseLocale}
                  >
                    {t("Read the case study")}{" "}
                    {selected.presentation.caseLocale !== locale && "(EN)"}{" "}
                    <ArrowUpRight size={16} />
                  </a>
                )}
                {selected.websiteHref && (
                  <a
                    href={selected.websiteHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("Visit project ")}
                    <ArrowUpRight size={16} />
                  </a>
                )}
              </div>
            </div>
          </div>

          <section
            className="atlas-related"
            aria-labelledby="atlas-related-title"
          >
            <div className="atlas-section-heading glass-panel">
              <div>
                <p className="atlas-eyebrow">{t("Follow a connection")}</p>
                <h3 id="atlas-related-title">
                  {t("Different fields. Familiar challenges. ")}
                </h3>
              </div>
              <p>
                {t("Shared needs and methods connect this work ")}
                <br />
                {t("to other industries in the portfolio. ")}
              </p>
            </div>
            <div className="atlas-related-grid">
              {related.length ? (
                related.map(({ project, reasons }) => (
                  <button
                    type="button"
                    className="glass-panel"
                    key={project.id}
                    onClick={() => {
                      select(project.id);
                      reveal(detailRef.current);
                    }}
                  >
                    <span className="atlas-related-domain">
                      {project.industries.map(term).join(" / ")}
                      <ArrowUpRight size={17} />
                    </span>
                    <strong>{project.label}</strong>
                    <p lang={project.presentation?.locale}>
                      {projectDescription(project)}
                    </p>
                    <span className="atlas-shared-label">
                      {t("The connection")}
                    </span>
                    <span className="atlas-related-reasons">
                      {reasons.map(term).join(" · ")}
                    </span>
                  </button>
                ))
              ) : (
                <p>{t("No cross-field connection is documented yet.")}</p>
              )}
            </div>
          </section>

          <details className="atlas-evidence glass-panel" key={selected.id}>
            <summary>
              {t("Evidence, tools & delivery notes")}{" "}
              <span>
                {t("View context ")}
                <ArrowDown size={14} />
              </span>
            </summary>
            <div>
              {locale === "de" && (
                <p className="atlas-language-note">
                  {t("Details currently available in English")}
                </p>
              )}
              <section>
                <h4>{t("Reported outcomes")}</h4>
                <span>
                  {term(selected.outcomeBasis) || t("No result basis recorded")}
                </span>
                <p lang={selected.outcome ? "en" : locale}>
                  {selected.outcome ||
                    t("No outcome is recorded for this project.")}
                </p>
              </section>
              <section>
                <h4>{t("Delivery & ongoing work")}</h4>
                <p lang={selected.delivery ? "en" : locale}>
                  {selected.delivery ||
                    t("No additional delivery note recorded.")}
                </p>
                <span>{term(selected.maintenance)}</span>
              </section>
              <section>
                <h4>{t("Tools used")}</h4>
                <p>{selected.tools.join(" · ") || t("Not recorded")}</p>
                <h4>{t("Languages")}</h4>
                <p>{selected.languages.join(" · ") || t("Not recorded")}</p>
                <h4>{t("Capabilities")}</h4>
                <p>
                  {selected.capabilities.map(term).join(" · ") ||
                    t("Not recorded")}
                </p>
                <h4>{t("Methods")}</h4>
                <p>
                  {selected.methods.map(term).join(" · ") || t("Not recorded")}
                </p>
                <ProjectScaleFacts scale={selected.scale} locale={locale} />
              </section>
            </div>
          </details>
        </section>
      )}

      <section className="atlas-enquiry glass-panel">
        <p className="atlas-eyebrow">
          {t("Bring your field into the picture")}
        </p>
        <h2>
          {t("Where does your ")}
          <br />
          <em>{t("challenge fit?")}</em>
        </h2>
        <div>
          <p>
            {t(
              "A familiar problem, a new industry, or a product that connects several worlds. Let’s explore what your project needs. ",
            )}
          </p>
          <Button
            variant="cta"
            arrow
            href={enquiryPath(
              selected ? { source: "project", projectId: selected.id } : {},
              locale,
            )}
            prefetch={false}
          >
            {t("Discuss your project ")}
          </Button>
        </div>
      </section>
    </div>
  );
}
