import type { ReactNode } from "react";
import type { Locale } from "@homepage/content/i18n";
import { sectorLabel } from "@homepage/content/projectTaxonomy";
import type { ProjectFacet } from "./facetColors";

export function FacetLabel({
  color,
  className,
  children,
}: {
  color: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      data-facet-value
      className={`inline-flex min-w-0 items-center gap-2 ${className ?? ""}`}
      style={{ color }}
    >
      <span
        aria-hidden="true"
        className="inline-block size-2 shrink-0 rounded-full border"
        style={{ borderColor: color, backgroundColor: `${color}66` }}
      />
      <span>{children}</span>
    </span>
  );
}

export function ProjectFacetValues({
  facet: { view, values, hiddenCount },
  locale,
}: {
  facet: ProjectFacet;
  locale: Locale;
}) {
  return (
    <span
      data-project-facet-values={view}
      className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-[0.65rem] uppercase tracking-[0.2em]"
    >
      {values.length ? (
        values.map(({ value, color }) => (
          <FacetLabel key={value} color={color}>
            {view === "industries" ? sectorLabel(value, locale) : value}
          </FacetLabel>
        ))
      ) : (
        <span className="text-neutral-500">
          {locale === "de" ? "Nicht erfasst" : "Not recorded"}
        </span>
      )}
      {hiddenCount > 0 && (
        <span data-facet-more className="text-neutral-400">
          +{hiddenCount}
        </span>
      )}
    </span>
  );
}
