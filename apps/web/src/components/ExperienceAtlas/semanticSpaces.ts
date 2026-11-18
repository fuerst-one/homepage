import type { LabProject } from "../ProjectLab/analysis";
import { neighbourEdges, projectDistances } from "../ProjectLab/clustering";
import { embeddingInput, embeddingKey } from "./embeddingInputs";
import { adaptiveClusters } from "./adaptiveClusters";
import { structuredInputs } from "./structuredSpaces";
import { DEFAULT_FIELDS, fieldTerms } from "./embeddingFields";
import {
  SPACE_RECIPES,
  type SpaceRecipe,
  type SemanticCache,
  type SemanticDataset,
  type SemanticSpace,
} from "./spaceTypes";
export { rankSpaceNeighbours } from "./spaceTypes";

const round = (n: number) => Number(n.toFixed(8));
const validVector = (row: unknown, dimensions: number): row is number[] =>
  Array.isArray(row) &&
  row.length === dimensions &&
  row.every((n) => typeof n === "number" && Number.isFinite(n)) &&
  Math.hypot(...row) > 0;

export function buildSemanticSpace(
  projects: LabProject[],
  recipe: SpaceRecipe,
  vectors: number[][],
): SemanticSpace {
  const unit = vectors.map((vector) => {
    const norm = Math.hypot(...vector);
    return vector.map((n) => n / norm);
  });
  const similarities = unit.map((a, i) =>
    unit.map((b, j) =>
      i === j
        ? 1
        : round(
            Math.max(
              -1,
              Math.min(
                1,
                a.reduce((sum, value, axis) => sum + value * b[axis], 0),
              ),
            ),
          ),
    ),
  );
  return {
    ...buildSimilaritySpace(
      projects,
      recipe,
      similarities,
      Object.fromEntries(
        projects.map((p) => [p.id, fieldTerms(p, DEFAULT_FIELDS[recipe])]),
      ),
    ),
    representation: "embedding",
    dimensions: vectors[0]?.length ?? 0,
  };
}

export function buildSimilaritySpace(
  projects: LabProject[],
  recipe: SpaceRecipe,
  similarities: number[][],
  fieldTerms?: Record<string, string[]>,
): SemanticSpace {
  const distances = similarities.map((row, i) =>
    row.map((value, j) =>
      i === j ? 0 : Math.sqrt(Math.max(0, 2 - 2 * value)),
    ),
  );
  const two = projectDistances(distances),
    three = projectDistances(distances, 3);
  const ids = projects.map((project) => project.id);
  const terms = new Map(
    projects.map((project) => [
      project.id,
      [
        ...new Set(
          fieldTerms?.[project.id] ??
            (recipe === "engineering"
              ? project.tools
              : recipe === "practice"
                ? [...project.capabilities, ...project.methods]
                : [
                    ...(project.productTypes ?? []),
                    ...(project.matching.domains ?? []),
                    ...(project.matching.buyerNeeds ?? []),
                  ]),
        ),
      ],
    ]),
  );
  const clustering = adaptiveClusters({
    ids,
    distances: similarities.map((row) => row.map((value) => 1 - value)),
    excluded: [],
    terms,
  });
  const pairs = ids.flatMap((a, i) =>
    ids
      .slice(i + 1)
      .map((b, j) => ({ a, b, value: similarities[i][i + j + 1] })),
  );
  return {
    recipe,
    ids,
    similarities,
    positions2d: two.points.map((row) => row.map(round)),
    positions3d: three.points.map((row) => row.map(round)),
    variance2d: two.retainedVariance,
    variance3d: three.retainedVariance,
    stress2d: two.stress,
    stress3d: three.stress,
    axes: three.axisVariance,
    groups: clustering.groups,
    clustering: clustering.diagnostics,
    ...(fieldTerms ? { fieldTerms } : {}),
    edges: neighbourEdges(ids, pairs, 3, 0),
    excluded: [],
  };
}

export function prepareSemanticSpaces(
  projects: LabProject[],
  cache: SemanticCache,
  sourceRefreshedAt?: string,
): SemanticDataset {
  if (
    cache.version !== 1 ||
    !cache.model ||
    !Number.isInteger(cache.dimensions) ||
    cache.dimensions < 1 ||
    !Array.isArray(cache.records)
  )
    throw new Error("Unsupported semantic cache");
  const records = new Map(
    cache.records.map((record) => [`${record.recipe}:${record.id}`, record]),
  );
  const spaces = SPACE_RECIPES.map(({ id: recipe }) => {
    if (recipe !== "engineering") {
      const input = structuredInputs(projects, recipe);
      return [
        recipe,
        {
          ...buildSimilaritySpace(
            input.projects,
            recipe,
            input.similarities,
            input.fieldTerms,
          ),
          representation: "structured",
          dimensions: input.dimensions,
          excluded: input.excluded,
        },
      ];
    }
    const included: LabProject[] = [],
      vectors: number[][] = [],
      excluded: SemanticSpace["excluded"] = [];
    for (const project of [...projects].sort((a, b) =>
      a.id.localeCompare(b.id),
    )) {
      const record = records.get(`${recipe}:${project.id}`);
      const reason = !embeddingInput(project, recipe)
        ? "No recorded inputs"
        : !record
          ? "Embedding not prepared"
          : record.hash !== embeddingKey(project, recipe, cache.model)
            ? "Inputs changed; regenerate embedding"
            : !validVector(record.embedding, cache.dimensions)
              ? "Invalid embedding"
              : null;
      if (reason) excluded.push({ id: project.id, reason });
      else {
        included.push(project);
        vectors.push(record!.embedding);
      }
    }
    return [
      recipe,
      { ...buildSemanticSpace(included, recipe, vectors), excluded },
    ];
  });
  return {
    model: cache.model,
    dimensions: cache.dimensions,
    generatedAt: cache.generatedAt,
    sourceRefreshedAt,
    spaces: Object.fromEntries(spaces) as SemanticDataset["spaces"],
  };
}
