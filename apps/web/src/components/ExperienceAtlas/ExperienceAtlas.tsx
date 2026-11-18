"use client";

import { useAtlasCopy } from "./useAtlasCopy";

import { useSearchParams } from "next/navigation";
import Link from "../i18n/LocalizedLink";
import { PageEyebrow } from "../PageEyebrow";
import { Button } from "../Button";
import { enquiryPath } from "@homepage/content/enquiry";
import { ArrowUpRight } from "lucide-react";
import type { AtlasProject } from "./model";
import { SemanticSpaceWorkbench } from "./SemanticSpaceWorkbench";
import type { SemanticDataset } from "./spaceTypes";
import {
  readAtlasNavigation,
  updateAtlasUrl,
  type AtlasNavigation,
} from "./atlasNavigation";
import "./experience-atlas.css";

export function ExperienceAtlas({
  projects,
  semanticData,
  experimentsEnabled = false,
}: {
  projects: AtlasProject[];
  semanticData?: SemanticDataset;
  experimentsEnabled?: boolean;
}) {
  const { locale, t } = useAtlasCopy();
  const searchParams = useSearchParams();
  const {
    project: selectedId,
    lens,
    view,
  } = readAtlasNavigation(searchParams, projects);
  const selected = projects.find((p) => p.id === selectedId);
  const navigate = (change: Partial<AtlasNavigation>) => {
    const url = new URL(window.location.href);
    const current = `${url.pathname}${url.search}${url.hash}`;
    const next = updateAtlasUrl(url, change);
    // Next observes native history updates without fetching or remounting the map.
    if (next !== current) window.history.pushState(null, "", next);
  };
  const select = (project: string) => navigate({ project });
  if (!projects.length)
    return (
      <div className="experience-atlas">
        <h1>{t("No projects to explore yet.")}</h1>
        <Link href="/projects">{t("Browse all projects")}</Link>
      </div>
    );

  return (
    <div className="experience-atlas is-vector-mode">
      <header className="atlas-intro">
        <div>
          <PageEyebrow>
            {t("Different fields. Connected experience.")}
          </PageEyebrow>
          <h1 id="atlas-explore-title">{t("Explorer")}</h1>
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
        />
      </section>

      <section className="atlas-enquiry">
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
