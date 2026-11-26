import type { CvProject } from "@homepage/content/models";
import type { Locale } from "@homepage/content/i18n";
import { publishedExplorerData } from "../ExperienceAtlas/projectPresentation";
import type { SemanticDataset } from "../ExperienceAtlas/spaceTypes";
import preview from "../../content/lab-preview.json";
import Link from "../i18n/LocalizedLink";
import { DeferredExplorer } from "./DeferredExplorer";
import "../ExperienceAtlas/explore-site.css";

export function HomeExplorer({
  projects,
  locale,
}: {
  projects: CvProject[];
  locale: Locale;
}) {
  const de = locale === "de";
  const data = publishedExplorerData(
    { atlas: preview.atlas, semantic: preview.semantic as SemanticDataset },
    projects,
    locale,
  );
  return (
    <section
      className="home-explorer explore-site"
      id="home-explorer"
      aria-labelledby="home-explorer-title"
      data-analytics-demo="explorer"
    >
      <header className="home-explorer-heading">
        <div>
          <h3 id="home-explorer-title">Explorer</h3>
          <p>
            {de
              ? "Wechsle die Perspektive und entdecke, was die Projekte verbindet. Wähle eine Gruppe oder ein Projekt, um passende Erfahrung zu finden."
              : "Change the perspective to discover what connects the work. Choose a cluster or project to find experience relevant to your challenge."}
          </p>
        </div>
        <Link href="/explorer" prefetch={false} className="home-work-text-link">
          {de ? "Explorer öffnen" : "Open Explorer"} ↗
        </Link>
      </header>
      <DeferredExplorer {...data} />
      <noscript>
        <style>{`.home-explorer-loading { display: none; }`}</style>
        <p className="home-work-map-note">
          {de
            ? "Für die interaktive Ansicht ist JavaScript erforderlich. "
            : "The interactive view requires JavaScript. "}
          <Link
            href="/projects"
            prefetch={false}
            className="home-work-text-link"
          >
            {de ? "Alle Projekte ansehen" : "Browse all projects"} ↗
          </Link>
        </p>
      </noscript>
    </section>
  );
}
