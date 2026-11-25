import { publicProjectScale } from "@homepage/content/projectScale";
import type { AtlasProject } from "./model";
import type { SemanticSpace, SpaceLens } from "./spaceTypes";
import type { ScaleField } from "./scaleSpace";
import {
  buildWeightedConnectionGraph,
  buildConnectionGraph,
  DEFAULT_CONNECTION_WEIGHTS,
  compareConnectionValues,
  type ConnectionEdge,
  type ConnectionWeights,
  type FieldComparison,
  type WeightedConnectionField,
} from "./connectionGraph";
import {
  PERSPECTIVE_TRAITS,
  buildPerspectiveGraph,
  type ConnectionLens,
  type ConnectionNavigation,
} from "./connectionExplorerState";

type Graph = {
  ids: string[];
  candidates: ConnectionEdge[];
  links: ConnectionEdge[];
};
export const CONNECTION_CONTRAST = 2.75;
const empty: FieldComparison = { score: 0, shared: [] };

/** Shared by the full explorer, homepage and project-list preview. */
export function buildExplorerGraph(
  projects: AtlasProject[],
  space: Pick<SemanticSpace, "ids" | "similarities" | "fieldTerms"> | undefined,
  lens: ConnectionLens,
  model: ConnectionNavigation["model"],
  weights: ConnectionWeights,
  fields: ScaleField[],
  disabled: ReadonlySet<string>,
): Graph {
  if (lens === "manual")
    return {
      ...buildConnectionGraph(projects, weights, disabled),
      ids: projects.map((p) => p.id),
    };
  if (!space) return { ids: [], links: [], candidates: [] };
  if (model === "overlap")
    return buildOverlapPerspective(projects, space.ids, lens, fields, disabled);
  const reference = buildConnectionGraph(
    projects.filter((p) => space.ids.includes(p.id)),
    DEFAULT_CONNECTION_WEIGHTS,
    new Set(),
  );
  return calibratePerspectiveGraph(
    buildPerspectiveGraph(projects, space, disabled, lens),
    reference.links,
  );
}

/** Inclusive person/day ranges: intersection over union, including exact point ranges. */
function rangeOverlap(
  a: [number | null, number | null],
  b: [number | null, number | null],
): FieldComparison {
  if (a.some((n) => n === null) || b.some((n) => n === null)) return empty;
  const [al, ah] = a as [number, number],
    [bl, bh] = b as [number, number];
  const low = Math.max(al, bl),
    high = Math.min(ah, bh);
  if (high < low) return empty;
  return {
    score: (high - low + 1) / (Math.max(ah, bh) - Math.min(al, bl) + 1),
    shared: [low === high ? String(low) : `${low}–${high}`],
  };
}
function numericOverlap(
  a: AtlasProject,
  b: AtlasProject,
  field: ScaleField,
): FieldComparison {
  const left = publicProjectScale(a.scale),
    right = publicProjectScale(b.scale);
  if (field === "team")
    return rangeOverlap(
      [left.teamLow, left.teamHigh],
      [right.teamLow, right.teamHigh],
    );
  if (field === "effort")
    return left.effortBasis === "rebuild-estimate" &&
      right.effortBasis === "rebuild-estimate"
      ? rangeOverlap(
          [left.effortLow, left.effortHigh],
          [right.effortLow, right.effortHigh],
        )
      : empty;
  if (field === "complexity")
    return left.complexity !== null && left.complexity === right.complexity
      ? { score: 1, shared: [String(left.complexity)] }
      : empty;
  const x = left.codeSloc,
    y = right.codeSloc;
  if (x === null || y === null) return empty;
  // Weighted Jaccard for one nonnegative scalar: smaller/larger. No population-dependent bins.
  const score = x === y ? 1 : Math.min(x, y) / Math.max(x, y);
  return { score, shared: x === y ? [String(x)] : [] };
}
export function overlapPerspectiveWeights(
  lens: SpaceLens,
  fields: ScaleField[],
): Record<string, number> {
  return lens === "scale"
    ? Object.fromEntries(fields.map((field) => [field, 100 / fields.length]))
    : PERSPECTIVE_TRAITS[lens];
}

/** Presets use the same weighted Jaccard engine as Manual, with additional recorded fields. */
export function buildOverlapPerspective(
  projects: AtlasProject[],
  ids: string[],
  lens: SpaceLens,
  fields: ScaleField[],
  disabled: ReadonlySet<string>,
): Graph {
  const included = projects.filter((p) => ids.includes(p.id));
  const categories: Record<string, (p: AtlasProject) => string[]> = {
    domains: (p) => p.matching.domains,
    product: (p) => p.productTypes,
    tools: (p) => p.tools,
    languages: (p) => p.languages,
    ownership: (p) => (p.ownership ? [p.ownership] : []),
    setting: (p) => (p.projectType ? [p.projectType] : []),
    pattern: (p) => (p.scale?.workingPattern ? [p.scale.workingPattern] : []),
  };
  const weighted: WeightedConnectionField<AtlasProject>[] = Object.entries(
    overlapPerspectiveWeights(lens, fields),
  ).map(([id, weight]) => ({
    id,
    weight,
    compare: categories[id]
      ? (a, b) => compareConnectionValues(categories[id](a), categories[id](b))
      : (a, b) => numericOverlap(a, b, id as ScaleField),
  }));
  return {
    ...buildWeightedConnectionGraph(included, weighted, disabled),
    ids: included.map((p) => p.id),
  };
}

/** Preserve similarity ordering and edges; calibrate displayed scores and balance layout forces separately. */
export function calibratePerspectiveGraph(
  graph: Graph,
  reference: ConnectionEdge[],
): Graph {
  const softened = graph.candidates.map((edge) => ({
    ...edge,
    comparisonScore: edge.score,
    score: edge.score ** 2,
  }));
  const total = softened.reduce(
    (sum, e) => sum + e.score ** CONNECTION_CONTRAST,
    0,
  );
  const referenceTotal = reference.reduce(
    (sum, e) => sum + e.score ** CONNECTION_CONTRAST,
    0,
  );
  // A dataset with no Manual evidence still needs a finite comparison score scale.
  const budget =
    referenceTotal ||
    ((graph.ids.length * (graph.ids.length - 1)) / 2) *
      0.15 ** CONNECTION_CONTRAST;
  const factor =
    total > 0 ? Math.min(1, (budget / total) ** (1 / CONNECTION_CONTRAST)) : 1;
  const scored = softened.map((edge) => ({
    ...edge,
    score: edge.score * factor,
  }));
  // Share an attraction budget across each project's neighborhood. Using the
  // larger endpoint degree bounds both budgets, including highly connected hubs.
  // Calculate before exclusions so disabling a link never reinforces its peers.
  const degrees = new Map<string, number>();
  for (const edge of scored) {
    const weight = edge.score ** CONNECTION_CONTRAST;
    for (const id of [edge.source, edge.target])
      degrees.set(id, (degrees.get(id) ?? 0) + weight);
  }
  const meanDegree =
    [...degrees.values()].reduce((sum, value) => sum + value, 0) /
    Math.max(1, degrees.size);
  const candidates = scored.map((edge) => ({
    ...edge,
    springStrength:
      (0.018 * edge.score ** CONNECTION_CONTRAST) /
      Math.max(
        degrees.get(edge.source) ?? 0,
        degrees.get(edge.target) ?? 0,
        meanDegree * 0.1,
        Number.MIN_VALUE,
      ),
  }));
  const active = new Set(graph.links.map((e) => e.id));
  return {
    ...graph,
    candidates,
    links: candidates.filter((e) => active.has(e.id)),
  };
}
