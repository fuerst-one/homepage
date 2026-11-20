import type { CvProject } from "@homepage/content/models";
import type { Locale } from "@homepage/content/i18n";
import {
  projectSector,
  sectorColor,
  sectorLabel,
} from "@homepage/content/projectTaxonomy";
import { FacetLabel } from "./ProjectFacetValues";

export function ProjectIndustry({
  project,
  locale = "en",
}: {
  project: Pick<CvProject, "industries">;
  locale?: Locale;
}) {
  const sector = projectSector(project);
  return (
    <FacetLabel
      color={sectorColor(sector)}
      className="text-[0.65rem] uppercase tracking-[0.2em]"
    >
      {sector
        ? sectorLabel(sector, locale)
        : locale === "de"
          ? "Branche nicht zugeordnet"
          : "Industry unclassified"}
    </FacetLabel>
  );
}
