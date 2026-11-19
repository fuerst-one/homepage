import {
  publicProjectScale,
  type ProjectScale,
} from "@homepage/content/projectScale";
import { projectDistances, neighbourEdges } from "../ProjectLab/clustering";
import { adaptiveClusters } from "./adaptiveClusters";
import { SPACE_RECIPES, type SemanticSpace } from "./spaceTypes";
import type { AxisDescription } from "./spaceAxes";

export const SCALE_FIELDS = [
  {
    id: "complexity",
    label: "Complexity",
    low: "Less complex",
    high: "More complex",
  },
  {
    id: "team",
    label: "Team size",
    low: "Smaller teams",
    high: "Larger teams",
  },
  {
    id: "effort",
    label: "Rebuild effort",
    low: "Less rebuild effort",
    high: "More rebuild effort",
  },
  {
    id: "code",
    label: "Codebase size",
    low: "Smaller codebases",
    high: "Larger codebases",
  },
] as const;
export type ScaleField = (typeof SCALE_FIELDS)[number]["id"];

/** The fitted embedding lenses plus the numeric one, in the order the Explorer shows them. */
export const SPACE_LENSES = [
  ...SPACE_RECIPES,
  {
    id: "scale",
    label: "Scale & delivery",
    question: "What scale have I worked at?",
    fields: SCALE_FIELDS.map((f) => f.label),
  },
] as const;
type ScaleProject = { id: string; scale?: Partial<ProjectScale> };

/** Only complete, comparable measurements enter a selected numeric feature. */
export function scaleValues(
  project: ScaleProject,
  field: ScaleField,
): number[] | null {
  const p = publicProjectScale(project.scale);
  if (field === "complexity")
    return p.complexity == null ? null : [p.complexity];
  if (field === "code")
    return p.codeSloc == null ? null : [Math.log1p(p.codeSloc)];
  const pair =
    field === "team" ? [p.teamLow, p.teamHigh] : [p.effortLow, p.effortHigh];
  if (field === "effort" && p.effortBasis !== "rebuild-estimate") return null;
  return pair.every((n): n is number => n !== null)
    ? pair.map(Math.log1p)
    : null;
}

/** Equal weight per field, not per endpoint. All fitting uses the active complete subset. */
export function buildScaleSpace(
  projects: ScaleProject[],
  selection: ScaleField[],
) {
  const started = performance.now();
  const fields = SCALE_FIELDS.filter((f) => selection.includes(f.id));
  const excluded: SemanticSpace["excluded"] = [];
  const rows = [...projects]
    .sort((a, b) => a.id.localeCompare(b.id))
    .flatMap((project) => {
      const values = fields.map((f) => scaleValues(project, f.id));
      const missing = fields.filter((_, i) => values[i] === null);
      if (!fields.length || missing.length) {
        excluded.push({
          id: project.id,
          reason: !fields.length
            ? "Choose at least one numeric field"
            : `Missing comparable values: ${missing.map((f) => f.label).join(", ")}`,
        });
        return [];
      }
      return [{ id: project.id, values: values as number[][] }];
    });
  const active = fields.flatMap((field, i) => {
    const values = rows.map((r) => r.values[i]);
    if (
      !values.length ||
      !values.some((row) => row.some((v, j) => v !== values[0][j]))
    )
      return [];
    const min = field.id === "complexity" ? 1 : Math.min(...values.flat());
    const max = field.id === "complexity" ? 5 : Math.max(...values.flat());
    return [{ ...field, index: i, min, max, width: values[0].length }];
  });
  const vectors = rows.map((row) =>
    active.flatMap((f) =>
      row.values[f.index].map(
        (v) =>
          (v - f.min) / (f.max - f.min) / Math.sqrt(active.length * f.width),
      ),
    ),
  );
  const distances = vectors.map((a) =>
    vectors.map((b) => Math.min(1, Math.hypot(...a.map((v, i) => v - b[i])))),
  );
  const similarities = distances.map((row) => row.map((d) => 1 - d));
  const ids = rows.map((r) => r.id);
  const two = projectDistances(distances),
    three = projectDistances(distances, 3);
  const centres = active.map((f) =>
    rows.map((row) => row.values[f.index].reduce((a, b) => a + b, 0) / f.width),
  );
  const terms = new Map(ids.map((id) => [id, [] as string[]]));
  for (let f = 0; f < active.length; f++) {
    const sorted = [...centres[f]].sort((a, b) => a - b),
      median = sorted[Math.floor(sorted.length / 2)];
    ids.forEach((id, i) => {
      // Median ties carry no directional claim, especially with many solo projects.
      if (centres[f][i] !== median)
        terms
          .get(id)!
          .push(centres[f][i] < median ? active[f].low : active[f].high);
    });
  }
  const grouping = adaptiveClusters({ ids, distances, excluded: [], terms });
  const pairs = ids.flatMap((a, i) =>
    ids
      .slice(i + 1)
      .map((b, j) => ({ a, b, value: similarities[i][i + j + 1] })),
  );
  const mean = (xs: number[]) =>
    xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  const axisLabels: AxisDescription[] = Array.from({ length: 3 }, (_, axis) => {
    const points = three.points.map((row) => row[axis]),
      average = mean(points);
    const scores = centres
      .map((values, i) => {
        const m = mean(values),
          xx = values.map((v) => v - m),
          yy = points.map((v) => v - average);
        const norm = Math.hypot(...xx) * Math.hypot(...yy);
        return {
          field: active[i],
          r: norm ? xx.reduce((sum, v, j) => sum + v * yy[j], 0) / norm : 0,
        };
      })
      .sort(
        (a, b) =>
          Math.abs(b.r) - Math.abs(a.r) || a.field.id.localeCompare(b.field.id),
      );
    const best = scores[0];
    return best && Math.abs(best.r) >= 0.3
      ? {
          negative: best.r > 0 ? best.field.low : best.field.high,
          positive: best.r > 0 ? best.field.high : best.field.low,
        }
      : { negative: null, positive: null };
  });
  const space: SemanticSpace = {
    recipe: "scale",
    ids,
    similarities,
    positions2d: two.points,
    positions3d: three.points,
    variance2d: two.retainedVariance,
    variance3d: three.retainedVariance,
    stress2d: two.stress,
    stress3d: three.stress,
    axes: three.axisVariance,
    axisLabels,
    groups: grouping.groups,
    clustering: grouping.diagnostics,
    edges: neighbourEdges(ids, pairs, 3, 0),
    excluded,
    fieldTerms: Object.fromEntries(terms),
  };
  return {
    space,
    dimensions: active.reduce((sum, f) => sum + f.width, 0),
    activeFields: active.map((f) => f.id),
    constantFields: fields
      .filter((f) => !active.some((a) => a.id === f.id))
      .map((f) => f.id),
    calculationMs: performance.now() - started,
  };
}
