import { createHash } from "node:crypto";
import type { LabProject } from "../ProjectLab/analysis";
import {
  canonicalFields,
  EMBEDDING_FIELDS,
  fieldTerms,
  fieldValues,
  fieldsInput,
  type EmbeddingField,
} from "./embeddingFields";
import { buildSimilaritySpace } from "./semanticSpaces";
import {
  SPACE_RECIPES,
  type SemanticSpace,
  type SpaceRecipe,
} from "./spaceTypes";

export type ExperimentComparison = {
  fields: EmbeddingField[];
  included: number;
  requested: number;
  model: string;
  dimensions: number;
  newVectors: number;
  reusedVectors: number;
  embeddingMs: number;
  joint: { space: SemanticSpace; calculationMs: number };
  blend: { space: SemanticSpace; calculationMs: number };
};
export class ExperimentInputError extends Error {}
export const vectorKey = (model: string, dimensions: number, text: string) =>
  createHash("sha256")
    .update(JSON.stringify(["atlas-fields-v1", model, dimensions, text]))
    .digest("hex");
export function validExperimentVector(
  value: unknown,
  dimensions: number,
): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === dimensions &&
    value.every((v) => typeof v === "number" && Number.isFinite(v)) &&
    Math.hypot(...value) > 0
  );
}
function similarity(vectors: number[][]) {
  const unit = vectors.map((v) => {
    const norm = Math.hypot(...v);
    return v.map((x) => x / norm);
  });
  return unit.map((a, i) =>
    unit.map((b, j) =>
      i === j
        ? 1
        : Math.max(
            -1,
            Math.min(
              1,
              a.reduce((sum, x, k) => sum + x * b[k], 0),
            ),
          ),
    ),
  );
}

export async function runEmbeddingExperiment(
  projects: LabProject[],
  request: unknown,
  options: {
    model: string;
    dimensions: number;
    cache: Map<string, number[]>;
    embed: (texts: string[]) => Promise<number[][]>;
    persist?: () => Promise<void>;
  },
): Promise<ExperimentComparison> {
  const body = request as {
    fields?: unknown;
    recipe?: unknown;
    projectIds?: unknown;
  } | null;
  let fields: EmbeddingField[];
  try {
    fields = canonicalFields(body?.fields);
  } catch {
    throw new ExperimentInputError("Choose at least one available field");
  }
  if (!SPACE_RECIPES.some((r) => r.id === body?.recipe))
    throw new ExperimentInputError("Unknown lens");
  const recipe = body!.recipe as SpaceRecipe;
  if (
    body!.projectIds !== undefined &&
    (!Array.isArray(body!.projectIds) ||
      body!.projectIds.length > projects.length ||
      body!.projectIds.some(
        (id) => typeof id !== "string" || !projects.some((p) => p.id === id),
      ))
  )
    throw new ExperimentInputError("Unknown project selection");
  const selected =
    body!.projectIds === undefined
      ? projects
      : projects.filter((p) => (body!.projectIds as string[]).includes(p.id));
  const included: LabProject[] = [],
    excluded: SemanticSpace["excluded"] = [];
  for (const p of [...selected].sort((a, b) => a.id.localeCompare(b.id))) {
    const missing = fields.filter((f) => !fieldValues(p, f).length);
    if (missing.length)
      excluded.push({
        id: p.id,
        reason: `No recorded ${missing.map((id) => EMBEDDING_FIELDS.find((f) => f.id === id)!.label.toLowerCase()).join(", ")}`,
      });
    else included.push(p);
  }
  for (const p of projects)
    if (!selected.some((s) => s.id === p.id))
      excluded.push({
        id: p.id,
        reason: "Outside the selected project filter",
      });
  const { model, dimensions, cache } = options;
  const key = (text: string) => vectorKey(model, dimensions, text);
  const inputs = new Map<string, string>();
  for (const p of included)
    for (const selection of [fields, ...fields.map((f) => [f])]) {
      const text = fieldsInput(p, selection);
      inputs.set(key(text), text);
    }
  const pending = [...inputs].filter(
    ([hash]) => !validExperimentVector(cache.get(hash), dimensions),
  );
  const started = performance.now();
  for (let i = 0; i < pending.length; i += 24) {
    const batch = pending.slice(i, i + 24),
      vectors = await options.embed(batch.map(([, text]) => text));
    if (
      vectors.length !== batch.length ||
      vectors.some((v) => !validExperimentVector(v, dimensions))
    )
      throw new Error("Invalid embedding response");
    batch.forEach(([hash], j) => cache.set(hash, vectors[j]));
    await options.persist?.();
  }
  const embeddingMs = performance.now() - started;
  const terms = Object.fromEntries(
    included.map((p) => [p.id, fieldTerms(p, fields)]),
  );
  const vectorsFor = (selection: EmbeddingField[]) =>
    included.map((p) => cache.get(key(fieldsInput(p, selection)))!);
  const jointStart = performance.now();
  const joint = buildSimilaritySpace(
    included,
    recipe,
    similarity(vectorsFor(fields)),
    terms,
  );
  const jointMs = performance.now() - jointStart;
  const blendStart = performance.now();
  // Equal-weight unit-vector blocks. Complete cases give a positive-semidefinite
  // cosine matrix and keep missing-data patterns out of the geometry.
  const blocks = fields.map((f) => similarity(vectorsFor([f])));
  const blended = included.map((_, i) =>
    included.map(
      (_, j) =>
        blocks.reduce((sum, matrix) => sum + matrix[i][j], 0) / fields.length,
    ),
  );
  const blend = buildSimilaritySpace(included, recipe, blended, terms);
  return {
    fields,
    included: included.length,
    requested: selected.length,
    model,
    dimensions,
    newVectors: pending.length,
    reusedVectors: inputs.size - pending.length,
    embeddingMs,
    joint: { space: { ...joint, excluded }, calculationMs: jointMs },
    blend: {
      space: { ...blend, excluded },
      calculationMs: performance.now() - blendStart,
    },
  };
}
