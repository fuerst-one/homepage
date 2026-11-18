import type { ClusterDiagnostics } from "./adaptiveClusters";

export const SPACE_RECIPES = [
  {
    id: "product",
    label: "Product purpose",
    question: "What does it help people do?",
    fields: ["Use cases", "Product formats"],
  },
  {
    id: "engineering",
    label: "Engineering",
    question: "How is it built?",
    fields: ["Tools & libraries", "Languages"],
  },
  {
    id: "practice",
    label: "Contribution model",
    question: "How did I contribute?",
    fields: ["Ownership", "Engagement type", "Working pattern", "Team size"],
  },
] as const;
export type SpaceRecipe = (typeof SPACE_RECIPES)[number]["id"];
export type SpaceLens = SpaceRecipe | "scale";
export type SpaceView = "3d" | "2d" | "network";
export type SemanticCache = {
  version: 1;
  model: string;
  dimensions: number;
  generatedAt: string;
  records: {
    id: string;
    recipe: SpaceRecipe;
    hash: string;
    embedding: number[];
  }[];
};
export type SemanticSpace = {
  recipe: SpaceLens;
  representation?: "structured" | "embedding";
  dimensions?: number;
  axisLabels?: { negative: string | null; positive: string | null }[];
  ids: string[];
  similarities: number[][];
  positions2d: number[][];
  positions3d: number[][];
  variance2d: number;
  variance3d: number;
  stress2d: number;
  stress3d: number;
  axes: number[];
  groups: { medoid: string; ids: string[]; terms: string[] }[];
  edges: { a: string; b: string; value: number }[];
  excluded: { id: string; reason: string }[];
  clustering?: ClusterDiagnostics;
  fieldTerms?: Record<string, string[]>;
};
export type SemanticDataset = {
  model: string;
  dimensions: number;
  generatedAt: string;
  sourceRefreshedAt?: string;
  spaces: Record<SpaceRecipe, SemanticSpace>;
};

export const SPACE_COLORS = [
  "#65e6f0",
  "#a6b0ff",
  "#ffbe77",
  "#89e4b1",
  "#ef94bc",
  "#d4dc88",
  "#bf9beb",
  "#e48f76",
  "#75aacb",
  "#c5b598",
];

/** Ranking uses the original dense vectors, never screen coordinates. */
export function rankSpaceNeighbours(space: SemanticSpace, id: string) {
  const index = space.ids.indexOf(id);
  if (index < 0) return [];
  return space.ids
    .filter((other) => other !== id)
    .map((other) => ({
      id: other,
      similarity: space.similarities[index][space.ids.indexOf(other)],
    }))
    .sort((a, b) => b.similarity - a.similarity || a.id.localeCompare(b.id));
}
