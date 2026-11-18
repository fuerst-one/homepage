import type { WorkProject } from "@homepage/content/workPortfolio";
import type { Locale } from "@homepage/content/i18n";
import Link from "../i18n/LocalizedLink";
import { ProjectIndustry } from "../Cv/Projects/ProjectIndustry";

export function SelectedWork({
  projects,
  locale,
}: {
  projects: WorkProject[];
  locale: Locale;
}) {
  if (!projects.length) return null;
  const de = locale === "de";
  return (
    <section
      className="home-work-section"
      aria-labelledby="selected-work-title"
      id="selected-work"
    >
      <header className="home-work-heading">
        <div>
          <p className="home-work-kicker">
            01 / {de ? "Einblicke in die Arbeit" : "Inside the work"}
          </p>
          <h2 id="selected-work-title">
            {de
              ? "Komplexe Aufgaben. Konkrete Arbeit."
              : "Complex challenges. Tangible work."}
          </h2>
        </div>
        <p>
          {de
            ? "Vom eigenen Produkt bis zur Weiterentwicklung im Team: drei Einblicke in Aufgaben, Verantwortung und Ergebnisse."
            : "From owning a product to improving one with a team: three examples of the challenge, my role, and what came out of it."}
        </p>
      </header>
      <div className="home-selected-grid">
        {projects.map((p, i) => (
          <article
            key={p.id}
            className="home-selected-card"
            lang={p.contentLocale}
          >
            <Link
              href={p.href}
              prefetch={false}
              className="home-selected-media"
              aria-label={`${de ? "Projekt ansehen" : "View project"}: ${p.label}`}
            >
              {p.screenshot && (
                // Public project previews are already proxied and load below the fold.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.screenshot}
                  alt={`${p.label} ${de ? "Projektansicht" : "project preview"}`}
                  loading="lazy"
                  decoding="async"
                />
              )}
              <span className="home-work-number" aria-hidden="true">
                0{i + 1}
              </span>
            </Link>
            <div className="home-selected-body">
              <ProjectIndustry project={p} locale={locale} />
              <h3>
                <Link href={p.href} prefetch={false}>
                  {p.label} <span aria-hidden="true">↗</span>
                </Link>
              </h3>
              <p className="home-work-role">
                {p.ownership}
                {p.stages.length ? ` · ${p.stages.join(" / ")}` : ""}
              </p>
              <p className="home-work-summary">
                {p.summary.length > 240
                  ? `${p.summary.slice(0, 237).trimEnd()}…`
                  : p.summary}
              </p>
              {p.outcome && (
                <div className="home-work-outcome">
                  <span>
                    {de
                      ? "Ergebnis laut Projektbericht"
                      : "Reported project outcome"}
                  </span>
                  <p>{p.outcome}</p>
                </div>
              )}
              <Link
                href={p.caseHref ?? p.href}
                prefetch={false}
                className="home-work-text-link"
              >
                {p.caseHref
                  ? de
                    ? "Fallstudie lesen"
                    : "Read the case study"
                  : de
                    ? "Projekt entdecken"
                    : "Explore the project"}{" "}
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
