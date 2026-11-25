import { adaptiveClusters } from "./adaptiveClusters";
import { type ConnectionEdge, type ConnectionWeights } from "./connectionGraph";

export type ConnectionAnalysisInput = {
  ids: string[];
  links: ConnectionEdge[];
  weights: ConnectionWeights;
  contrast: number;
  traitWeights?: Record<string, number>;
};
export type ConnectionGroup = {
  id: string;
  ids: string[];
  medoid: string;
  meanOverlap: number;
  traits: { field: string; value: string; count: number }[];
};
export type ConnectionOutlier = {
  id: string;
  reason: "disconnected" | "weak";
  strongest: number;
  neighbours: number;
};

/** Analyze the enabled weighted graph, never its transient camera or simulation coordinates. */
export function analyzeConnections({
  ids: inputIds,
  links: inputLinks,
  weights,
  contrast,
  traitWeights = weights,
}: ConnectionAnalysisInput) {
  const ids = [...inputIds].sort();
  const indices = new Map(ids.map((id, index) => [id, index]));
  const scores = ids.map(() => ids.map(() => 0));
  const links = [...inputLinks].sort((a, b) => a.id.localeCompare(b.id));
  for (const edge of links) {
    const a = indices.get(edge.source),
      b = indices.get(edge.target);
    if (a === undefined || b === undefined || a === b || !(edge.score > 0))
      continue;
    scores[a][b] = scores[b][a] = edge.score;
  }
  const strongest = scores.map((row) => Math.max(0, ...row));
  const positive = strongest.filter((value) => value > 0).sort((a, b) => a - b);
  const middle = Math.floor(positive.length / 2);
  const median = positive.length
    ? (positive[middle] + positive[Math.floor((positive.length - 1) / 2)]) / 2
    : 0;
  // Relative to the median strongest spring, so uniform weight scaling cannot invent outliers.
  const weakCutoff = median * Math.pow(0.25, 1 / contrast);
  const outliers: ConnectionOutlier[] = ids.flatMap((id, i) =>
    strongest[i] === 0 || strongest[i] < weakCutoff
      ? [
          {
            id,
            reason: strongest[i] === 0 ? "disconnected" : "weak",
            strongest: strongest[i],
            neighbours: scores[i].filter((score) => score > 0).length,
          },
        ]
      : [],
  );
  const excluded = new Set(outliers.map((item) => item.id));
  const remaining = new Set(ids.filter((id) => !excluded.has(id)));
  const groups: ConnectionGroup[] = [];
  const maximum = Math.max(0, ...strongest);
  // Keep disconnected components separate before fitting subdivisions within each component.
  while (remaining.size) {
    const component: string[] = [remaining.values().next().value!];
    remaining.delete(component[0]);
    for (let i = 0; i < component.length; i++) {
      const row = scores[indices.get(component[i])!];
      for (const id of remaining)
        if (row[indices.get(id)!] > 0) {
          remaining.delete(id);
          component.push(id);
        }
    }
    component.sort();
    const fit = adaptiveClusters({
      ids: component,
      excluded: [],
      terms: new Map(),
      distances: component.map((a) =>
        component.map((b) =>
          a === b
            ? 0
            : 1 -
              Math.pow(
                scores[indices.get(a)!][indices.get(b)!] / maximum,
                contrast,
              ),
        ),
      ),
    });
    for (const group of fit.groups) {
      const members = new Set(group.ids);
      const internal = links.filter(
        (edge) => members.has(edge.source) && members.has(edge.target),
      );
      const traits = new Map<
        string,
        { field: string; value: string; members: Set<string> }
      >();
      for (const edge of internal)
        for (const field of Object.keys(traitWeights)) {
          if (traitWeights[field] <= 0) continue;
          for (const value of edge.shared[field] ?? []) {
            const key = `${field}:${value.toLowerCase()}`;
            const trait = traits.get(key) ?? {
              field,
              value,
              members: new Set<string>(),
            };
            trait.members.add(edge.source);
            trait.members.add(edge.target);
            traits.set(key, trait);
          }
        }
      groups.push({
        id: group.ids.join("|"),
        ids: group.ids,
        medoid: group.medoid,
        meanOverlap:
          group.ids.length > 1
            ? internal.reduce((sum, edge) => sum + edge.score, 0) /
              ((group.ids.length * (group.ids.length - 1)) / 2)
            : 0,
        traits: [...traits.values()]
          .sort(
            (a, b) =>
              traitWeights[b.field] * b.members.size -
                traitWeights[a.field] * a.members.size ||
              a.field.localeCompare(b.field) ||
              a.value.localeCompare(b.value),
          )
          .slice(0, 3)
          .map(({ field, value, members: traitMembers }) => ({
            field,
            value,
            count: traitMembers.size,
          })),
      });
    }
  }
  groups.sort(
    (a, b) => b.ids.length - a.ids.length || a.id.localeCompare(b.id),
  );
  outliers.sort(
    (a, b) => a.strongest - b.strongest || a.id.localeCompare(b.id),
  );
  return { groups, outliers, weakCutoff };
}

export type ConnectionAnalysisResult = ReturnType<typeof analyzeConnections>;
