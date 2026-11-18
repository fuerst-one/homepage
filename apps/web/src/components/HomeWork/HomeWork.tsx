import type { CvProject } from "@homepage/content/models";
import type { GitHubActivity } from "@homepage/content/githubActivity";
import type { Locale } from "@homepage/content/i18n";
import {
  portfolioTimeline,
  selectedWork,
  workProject,
} from "@homepage/content/workPortfolio";
import { projectPath } from "../../lib/seo";
import { SelectedWork } from "./SelectedWork";
import { HomeExplorer } from "./HomeExplorer";
import { WorkTimeline } from "./WorkTimeline";
import { HomeProjectViews } from "./HomeProjectViews";
import "./home-work.css";

export function HomeWork({
  projects,
  github,
  locale,
}: {
  projects: CvProject[];
  github: GitHubActivity | null;
  locale: Locale;
}) {
  if (!projects.length) return null;
  const de = locale === "de";
  const data = projects.map((p) =>
    workProject(p, projectPath(p, locale), locale),
  );
  const seabo = data.find(
    (project) => project.id === "153f6668-f4d6-490a-8345-0b999b35305a",
  );
  const first = projects
    .map((p) => p.startDate)
    .filter(Boolean)
    .sort()[0]
    ?.slice(0, 4);
  const industryCount = new Set(projects.flatMap((p) => p.industries)).size;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return (
    <>
      <SelectedWork projects={selectedWork(data)} locale={locale} />
      <section
        className="home-work-section home-work-data"
        id="work-in-data"
        aria-labelledby="work-data-title"
      >
        <header className="home-work-heading">
          <div>
            <p className="home-work-kicker">
              02 / {de ? "Verbindungen entdecken" : "Find the connections"}
            </p>
            <h2 id="work-data-title">
              {de ? "Meine Arbeit in Daten." : "My work, in data."}
            </h2>
          </div>
          <p>
            {de
              ? "Welche Erfahrungen passen zu deiner Aufgabe? Entdecke die Projekte über gemeinsame Herausforderungen und Branchen."
              : "Where does your challenge fit? Explore the work through shared challenges and industries."}
          </p>
        </header>
        <dl className="home-work-stats">
          <div>
            <dt>{de ? "dokumentierte Projekte" : "documented projects"}</dt>
            <dd>{data.length}</dd>
          </div>
          <div>
            <dt>{de ? "Branchen" : "industries"}</dt>
            <dd>{industryCount}</dd>
          </div>
          <div>
            <dt>{de ? "Projekte seit" : "projects since"}</dt>
            <dd>{first}</dd>
          </div>
        </dl>
        <HomeProjectViews projects={projects} locale={locale} />
        <HomeExplorer projects={projects} locale={locale} />
        <WorkTimeline
          months={portfolioTimeline(projects, today)}
          projectCount={data.length}
          seabo={
            seabo?.caseHref
              ? {
                  href: seabo.caseHref,
                  startDate: seabo.startDate,
                  endDate: seabo.endDate,
                }
              : null
          }
          github={github}
          locale={locale}
        />
      </section>
    </>
  );
}
