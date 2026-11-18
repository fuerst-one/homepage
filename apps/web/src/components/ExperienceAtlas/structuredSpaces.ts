import { publicProjectScale } from "@homepage/content/projectScale";
import type { LabProject } from "../ProjectLab/analysis";
import {
  DEFAULT_FIELDS,
  EMBEDDING_FIELDS,
  fieldTerms,
  fieldValues,
} from "./embeddingFields";

/** Equal field weights; team endpoints share a field's weight. Fit only on supplied rows. */
export function structuredInputs(
  projects: LabProject[],
  recipe: "product" | "practice",
) {
  const fields = DEFAULT_FIELDS[recipe];
  const excluded: { id: string; reason: string }[] = [];
  const included = [...projects]
    .sort((a, b) => a.id.localeCompare(b.id))
    .filter((project) => {
      const scale = publicProjectScale(project.scale);
      const missing = fields.filter((field) =>
        field === "teamSize"
          ? scale.teamLow === null ||
            scale.teamHigh === null ||
            scale.teamLow < 1 ||
            scale.teamHigh < scale.teamLow
          : !fieldValues(project, field).length,
      );
      if (missing.length)
        excluded.push({
          id: project.id,
          reason: `Missing or invalid: ${missing.map((id) => EMBEDDING_FIELDS.find((f) => f.id === id)!.label).join(", ")}`,
        });
      return !missing.length;
    });
  let dimensions = 0;
  const blocks = fields.flatMap((field) => {
    if (field === "teamSize") {
      const ends = (["teamLow", "teamHigh"] as const).map((key) => {
        const values = included.map((p) =>
          Math.log1p(publicProjectScale(p.scale)[key]!),
        );
        const low = Math.min(...values),
          span = Math.max(...values) - low;
        return values.map((value) => (span > 0 ? (value - low) / span : 0));
      });
      if (!ends.some((values) => values.some((value) => value !== 0)))
        return [];
      dimensions += 2;
      return [
        (i: number, j: number) =>
          ends.reduce((sum, values) => sum + (values[i] - values[j]) ** 2, 0) /
          2,
      ];
    }
    const values = included.map((p) => fieldValues(p, field));
    if (new Set(values.map((row) => JSON.stringify(row))).size < 2) return [];
    dimensions += new Set(values.flat()).size;
    return [
      (i: number, j: number) =>
        1 -
        values[i].filter((value) => values[j].includes(value)).length /
          Math.sqrt(values[i].length * values[j].length),
    ];
  });
  return {
    projects: included,
    excluded,
    dimensions,
    similarities: included.map((_, i) =>
      included.map((_, j) =>
        i === j || !blocks.length
          ? 1
          : Math.max(
              0,
              Math.min(
                1,
                1 -
                  blocks.reduce((sum, distance) => sum + distance(i, j), 0) /
                    blocks.length,
              ),
            ),
      ),
    ),
    fieldTerms: Object.fromEntries(
      included.map((p) => [p.id, fieldTerms(p, fields)]),
    ),
  };
}
