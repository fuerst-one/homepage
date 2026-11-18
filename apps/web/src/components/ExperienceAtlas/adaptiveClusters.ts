import {
  medoidClusters,
  type Cluster,
  type LensSpace,
} from "../ProjectLab/clustering";

export type ClusterCandidate = {
  k: number;
  silhouette: number;
  resampledSilhouette: number;
  standardError: number;
  stability: number;
  sizes: number[];
};
export type ClusterDiagnostics = {
  k: number;
  silhouette: number | null;
  stability: number | null;
  candidates: ClusterCandidate[];
  reason: "selected" | "insufficient" | "unseparated";
};
const mean = (values: number[]) =>
  values.reduce((a, b) => a + b, 0) / values.length;
const labelsFor = (ids: string[], groups: Cluster[]) =>
  ids.map((id) => groups.findIndex((g) => g.ids.includes(id)));

/** Singleton silhouettes are zero, as in the standard silhouette definition. */
export function silhouette(distances: number[][], labels: number[]) {
  const count = Math.max(...labels) + 1;
  if (count < 2 || count >= labels.length) return 0;
  return mean(
    labels.map((group, i) => {
      const sums = Array(count).fill(0),
        sizes = Array(count).fill(0);
      labels.forEach((g, j) => {
        if (i !== j) {
          sums[g] += distances[i][j];
          sizes[g]++;
        }
      });
      if (!sizes[group]) return 0;
      const a = sums[group] / sizes[group];
      const b = Math.min(
        ...sums.flatMap((sum, g) =>
          g !== group && sizes[g] ? [sum / sizes[g]] : [],
        ),
      );
      return Math.max(a, b) > 0 ? (b - a) / Math.max(a, b) : 0;
    }),
  );
}

function adjustedRand(a: number[], b: number[]) {
  const pairs = (n: number) => (n * (n - 1)) / 2;
  const counts = (values: (number | string)[]) => {
    const map = new Map<number | string, number>();
    values.forEach((v) => map.set(v, (map.get(v) ?? 0) + 1));
    return [...map.values()].reduce((sum, n) => sum + pairs(n), 0);
  };
  const total = pairs(a.length);
  if (!total) return 1;
  const sa = counts(a),
    sb = counts(b),
    expected = (sa * sb) / total;
  const maximum = (sa + sb) / 2;
  return maximum === expected
    ? 1
    : (counts(a.map((g, i) => `${g}/${b[i]}`)) - expected) /
        (maximum - expected);
}

function bestFit(space: LensSpace, k: number) {
  const index = new Map(space.ids.map((id, i) => [id, i]));
  const cost = (groups: Cluster[]) =>
    space.distances.reduce(
      (sum, row) =>
        sum + Math.min(...groups.map((g) => row[index.get(g.medoid)!])),
      0,
    );
  return [
    ...new Set([
      0,
      Math.floor(space.ids.length / 3),
      Math.floor((space.ids.length * 2) / 3),
    ]),
  ]
    .map((start) => medoidClusters(space, k, start))
    .reduce((best, trial) => (cost(trial) < cost(best) - 1e-10 ? trial : best));
}

function subset(space: LensSpace, ix: number[]): LensSpace {
  return {
    ...space,
    ids: ix.map((i) => space.ids[i]),
    distances: ix.map((i) => ix.map((j) => space.distances[i][j])),
  };
}

/** A versioned, deterministic selection policy; no project-specific counts.
 * One-standard-error is a parsimony heuristic over perturbations, not a confidence interval.
 * The ten-group ceiling bounds navigation/computation; groups need at least two projects.
 */
export function adaptiveClusters(input: LensSpace): {
  groups: Cluster[];
  diagnostics: ClusterDiagnostics;
} {
  const order = input.ids
    .map((_, i) => i)
    .sort((a, b) => input.ids[a].localeCompare(input.ids[b]));
  const space = subset(input, order),
    n = space.ids.length;
  const fallback = (
    reason: ClusterDiagnostics["reason"],
    candidates: ClusterCandidate[] = [],
  ) => ({
    groups: medoidClusters(space, 1),
    diagnostics: {
      k: n ? 1 : 0,
      silhouette: null,
      stability: null,
      candidates,
      reason,
    },
  });
  if (n < 4) return fallback("insufficient");
  // Seed from canonical IDs so input order and repeat visits cannot reshuffle groups.
  let seed = 2166136261;
  for (const char of space.ids.join("|"))
    seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const samples = Array.from({ length: 12 }, () => {
    const ix = space.ids.map((_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [ix[i], ix[j]] = [ix[j], ix[i]];
    }
    return ix.slice(0, Math.floor(n * 0.8)).sort((a, b) => a - b);
  });
  const candidates: (ClusterCandidate & { groups: Cluster[] })[] = [];
  for (let k = 2; k <= Math.min(10, Math.floor(n / 2)); k++) {
    const groups = bestFit(space, k),
      sizes = groups.map((g) => g.ids.length);
    if (Math.min(...sizes) < 2) continue;
    const labels = labelsFor(space.ids, groups),
      score = silhouette(space.distances, labels);
    if (score <= 1e-10) continue;
    const scores: number[] = [],
      stability: number[] = [];
    for (const ix of samples) {
      const sample = subset(space, ix),
        fitted = bestFit(sample, k);
      const sampleLabels = labelsFor(sample.ids, fitted);
      scores.push(silhouette(sample.distances, sampleLabels));
      stability.push(
        adjustedRand(
          ix.map((i) => labels[i]),
          sampleLabels,
        ),
      );
    }
    const average = mean(scores);
    candidates.push({
      k,
      groups,
      sizes,
      silhouette: score,
      resampledSilhouette: average,
      standardError: Math.sqrt(
        scores.reduce((sum, s) => sum + (s - average) ** 2, 0) /
          (scores.length - 1) /
          scores.length,
      ),
      stability: mean(stability),
    });
  }
  const diagnostics = candidates.map(
    ({
      k,
      silhouette,
      resampledSilhouette,
      standardError,
      stability,
      sizes,
    }) => ({
      k,
      silhouette,
      resampledSilhouette,
      standardError,
      stability,
      sizes,
    }),
  );
  if (!candidates.length) return fallback("unseparated");
  const best = candidates.reduce((a, b) =>
    b.resampledSilhouette > a.resampledSilhouette ? b : a,
  );
  if (best.resampledSilhouette <= 0)
    return fallback("unseparated", diagnostics);
  const chosen = candidates.find(
    (c) =>
      c.resampledSilhouette >= best.resampledSilhouette - best.standardError,
  )!;
  return {
    groups: chosen.groups,
    diagnostics: {
      k: chosen.k,
      silhouette: chosen.silhouette,
      stability: chosen.stability,
      candidates: diagnostics,
      reason: "selected",
    },
  };
}
