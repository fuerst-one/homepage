import type { AtlasProject } from "./model";

export const CONNECTION_FIELDS = [
  { id: "needs", label: "Client needs", description: "Recorded buyer needs" },
  {
    id: "product",
    label: "Product format",
    description: "Apps, sites, tools and devices",
  },
  { id: "industry", label: "Industry", description: "Project sectors" },
  {
    id: "capabilities",
    label: "Capabilities",
    description: "Recorded capabilities",
  },
  { id: "tools", label: "Tools", description: "Frameworks and technology" },
  { id: "methods", label: "Methods", description: "Ways of working" },
  { id: "languages", label: "Languages", description: "Programming languages" },
] as const;
export type ConnectionField = (typeof CONNECTION_FIELDS)[number]["id"];
export type ConnectionWeights = Record<ConnectionField, number>;
export const DEFAULT_CONNECTION_WEIGHTS: ConnectionWeights = {
  needs: 32,
  product: 20,
  industry: 12,
  capabilities: 12,
  tools: 4,
  methods: 4,
  languages: 2,
};
export const CONNECTION_WEIGHT_BUDGET = 100;

/** Leave unused budget free; redistribute only when the edited field would overflow it. */
export function redistributeConnectionWeight(
  weights: ConnectionWeights,
  edited: ConnectionField,
  requested: number,
): ConnectionWeights {
  const next = { ...weights };
  const value = Math.max(
    0,
    Math.min(
      CONNECTION_WEIGHT_BUDGET,
      Number.isFinite(requested) ? requested : 0,
    ),
  );
  const others = CONNECTION_FIELDS.filter(({ id }) => id !== edited);
  const total = others.reduce((sum, { id }) => sum + weights[id], 0);
  const factor =
    total > 0 ? Math.min(1, (CONNECTION_WEIGHT_BUDGET - value) / total) : 1;
  for (const { id } of others) next[id] = weights[id] * factor;
  next[edited] = value;
  return next;
}

export type ConnectionProject = Pick<
  AtlasProject,
  | "id"
  | "label"
  | "matching"
  | "productTypes"
  | "industries"
  | "tools"
  | "capabilities"
  | "methods"
  | "languages"
>;
export type ConnectionEdge = {
  /** Optional layout coefficient; never used as a match or cluster score. */
  springStrength?: number;
  id: string;
  source: string;
  target: string;
  score: number;
  comparisonScore?: number;
  shared: Record<ConnectionField, string[]> & Record<string, string[]>;
};

function values(project: ConnectionProject, field: ConnectionField): string[] {
  switch (field) {
    case "needs":
      return project.matching.buyerNeeds;
    case "product":
      return project.productTypes;
    case "industry":
      return project.industries;
    case "capabilities":
      return project.capabilities;
    case "tools":
      return project.tools;
    case "methods":
      return project.methods;
    case "languages":
      return project.languages;
  }
}

function normalized(values: string[]) {
  return new Map(
    values
      .filter(Boolean)
      .map((label) => [label.trim().toLocaleLowerCase(), label.trim()]),
  );
}

export type FieldComparison = { score: number; shared: string[] };
export type WeightedConnectionField<T> = {
  id: string;
  weight: number;
  compare: (a: T, b: T) => FieldComparison;
};

/** Set Jaccard: missing values supply no matching evidence. */
export function compareConnectionValues(
  a: string[],
  b: string[],
): FieldComparison {
  const left = normalized(a),
    right = normalized(b);
  const common = [...left].filter(([key]) => right.has(key));
  return {
    score: common.length
      ? common.length / (left.size + right.size - common.length)
      : 0,
    shared: common.map(([, label]) => label).sort((x, y) => x.localeCompare(y)),
  };
}

/** A common 100-point budget for both manual fields and preset fields. */
export function buildWeightedConnectionGraph<
  T extends { id: string; label: string },
>(
  projects: T[],
  fields: WeightedConnectionField<T>[],
  disabled: ReadonlySet<string>,
) {
  const nodes = projects.map(({ id, label }) => ({ id, label }));
  const candidates: ConnectionEdge[] = [];
  for (let i = 0; i < projects.length; i++) {
    for (let j = i + 1; j < projects.length; j++) {
      const a = projects[i],
        b = projects[j];
      let points = 0;
      const shared: ConnectionEdge["shared"] = {
        needs: [],
        product: [],
        industry: [],
        capabilities: [],
        tools: [],
        methods: [],
        languages: [],
      };
      for (const field of fields) {
        const comparison = field.compare(a, b);
        shared[field.id] = comparison.shared;
        if (field.weight > 0) points += field.weight * comparison.score;
      }
      if (points <= 0) continue;
      const [source, target] = [a.id, b.id].sort();
      candidates.push({
        id: `${source}|${target}`,
        source,
        target,
        score: points / CONNECTION_WEIGHT_BUDGET,
        shared,
      });
    }
  }
  candidates.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return {
    nodes,
    candidates,
    links: candidates.filter((edge) => !disabled.has(edge.id)),
  };
}

/** Undirected links from recorded shared attributes. Empty fields contribute no evidence. */
export function buildConnectionGraph(
  projects: ConnectionProject[],
  weights: ConnectionWeights,
  disabled: ReadonlySet<string>,
) {
  return buildWeightedConnectionGraph(
    projects,
    CONNECTION_FIELDS.map(({ id }) => ({
      id,
      weight: weights[id],
      compare: (a, b) => compareConnectionValues(values(a, id), values(b, id)),
    })),
    disabled,
  );
}
