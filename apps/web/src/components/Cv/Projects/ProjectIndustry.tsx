import type { CvProject } from "@homepage/content/models";
import type { Locale } from "@homepage/content/i18n";
import {
  projectSector,
  sectorColor,
  sectorLabel,
} from "@homepage/content/projectTaxonomy";

export function ProjectIndustry({
  project,
  locale = "en",
}: {
  project: Pick<CvProject, "industries">;
  locale?: Locale;
}) {
  const sector = projectSector(project);
  const color = sectorColor(sector);
  return (
    <span
      className="inline-flex min-w-0 items-center gap-2 text-[0.65rem] uppercase tracking-[0.2em]"
      style={{ color }}
    >
      <span
        aria-hidden="true"
        className="inline-block size-2 shrink-0 rounded-full border"
        style={{ borderColor: color, backgroundColor: `${color}66` }}
      />
      <span>
        {sector
          ? sectorLabel(sector, locale)
          : locale === "de"
            ? "Branche nicht zugeordnet"
            : "Industry unclassified"}
      </span>
    </span>
  );
}
