import type { CvProject } from "@homepage/content/models";
import { SECTORS } from "@homepage/content/projectTaxonomy";

export const colors: Partial<
  Record<keyof CvProject, Record<string, { hex: string }>>
> = {
  industries: Object.fromEntries(
    Object.entries(SECTORS).map(([sector, config]) => [
      sector,
      { hex: config.color },
    ]),
  ),
};
