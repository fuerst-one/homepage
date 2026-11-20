import type { CvProject } from "@homepage/content/models";
import type { Locale } from "@homepage/content/i18n";
import type { CSSProperties } from "react";
import {
  facetValueLabel,
  getFilterOptionCounts,
  projectFacetHref,
} from "../Cv/Projects/Filter/utils";
import { facetColor, facetPalette } from "../Cv/Projects/facetColors";
import { TREEMAP_ITEMS_MAX } from "../Cv/Projects/Filter/treemapOptions";
import Link from "../i18n/LocalizedLink";
import { DeferredProjectBreakdown } from "./DeferredProjectBreakdown";

export function HomeProjectViews({
  projects,
  locale,
}: {
  projects: CvProject[];
  locale: Locale;
}) {
  const de = locale === "de";
  // Industries stay a treemap by choice; the longer facets read better as a full list.
  const facets = [
    { key: "capabilities", label: "Expertise", chart: false },
    { key: "industries", label: de ? "Branchen" : "Industries", chart: true },
    {
      key: "methods",
      label: de ? "Methoden & Prinzipien" : "Methods & principles",
      chart: false,
    },
  ] as const;
  return (
    <div className="home-project-views">
      <div className="home-project-view-grid">
        {facets.map(({ key, label, chart }) => {
          const items = getFilterOptionCounts(projects, key);
          if (!items.length) return null;
          const countLabel = (count: number) => (
            <span>
              {new Intl.NumberFormat(locale).format(count)}
              <span className="sr-only"> {de ? "Projekte" : "projects"}</span>
            </span>
          );
          const palette = chart ? undefined : facetPalette(projects, key);
          const barStyle = (itemKey: string, count: number) =>
            palette &&
            ({
              "--facet-color": facetColor(palette, itemKey),
              "--facet-share": `${(count / items[0].count) * 100}%`,
            } as CSSProperties);
          const links = items.map(({ itemKey, count }) => (
            <li key={itemKey}>
              <Link
                href={projectFacetHref(key, itemKey, locale)}
                prefetch={false}
                style={barStyle(itemKey, count)}
              >
                <span>{facetValueLabel(key, itemKey, locale)}</span>
                {countLabel(count)}
              </Link>
            </li>
          ));
          return (
            <section
              className="home-project-view"
              key={key}
              data-home-facet={key}
              aria-labelledby={`home-facet-${key}`}
            >
              <header>
                <h3 id={`home-facet-${key}`}>{label}</h3>
                <span>
                  {de ? "Projekte pro Kategorie" : "Projects per category"}
                </span>
              </header>
              {chart ? (
                <>
                  <div className="home-facet-chart" aria-hidden="true">
                    <DeferredProjectBreakdown
                      items={items}
                      facet={key}
                      label={label}
                      locale={locale}
                    />
                  </div>
                  <p className="home-facet-limit">
                    {items.length > TREEMAP_ITEMS_MAX
                      ? de
                        ? `Die ${TREEMAP_ITEMS_MAX} häufigsten Kategorien`
                        : `The ${TREEMAP_ITEMS_MAX} most common categories`
                      : de
                        ? `Alle ${items.length} Kategorien`
                        : `All ${items.length} categories`}
                  </p>
                  <details className="home-facet-categories">
                    <summary>
                      {de ? "Kategorien durchsuchen" : "Browse categories"}
                      <span>{items.length}</span>
                    </summary>
                    <ul>{links}</ul>
                  </details>
                </>
              ) : (
                <ul className="home-facet-list" data-home-facet-list>
                  {links}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      <p className="home-work-map-note">
        {de
          ? "Wähle eine Kategorie, um die passenden Projekte zu sehen. Gezählt werden dokumentierte Projekte, keine Arbeitsstunden. Ein Projekt kann in mehreren Kategorien vorkommen."
          : "Choose a category to see matching projects. Counts reflect documented projects, not hours worked. A project can appear in several categories."}
      </p>
    </div>
  );
}
