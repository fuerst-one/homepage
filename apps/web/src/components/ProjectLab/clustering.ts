import { Matrix, EigenvalueDecomposition } from "ml-matrix";
import type { LabProject } from "./analysis";

export type Lens = "tools" | "needs" | "context";
export type LensSpace = {
  ids: string[];
  excluded: string[];
  distances: number[][];
  terms: Map<string, string[]>;
};
export type Cluster = { medoid: string; ids: string[]; terms: string[] };
export type WeightedEdge = { a: string; b: string; value: number };
const stopwords = new Set(
  "a an and are as at be been by can for from has have in into is it its of on or that the their this to was were which with project platform application system using built development developed work client users user also through across including based".split(
    " ",
  ),
);

/** Each lens reads exactly one recorded field. Empty fields never become similar. */
export function lensSpace(projects: LabProject[], lens: Lens): LensSpace {
  const rows = [...projects].sort((a, b) => a.id.localeCompare(b.id));
  const terms = new Map(
    rows.map((p) => [
      p.id,
      [
        ...new Set(
          lens === "tools"
            ? p.tools
            : lens === "needs"
              ? p.matching.buyerNeeds
              : (
                  p.matching.summary.toLowerCase().match(/[\p{L}\p{N}]+/gu) ??
                  []
                ).filter((w) => w.length > 2 && !stopwords.has(w)),
        ),
      ].sort(),
    ]),
  );
  const included = rows.filter((p) => terms.get(p.id)!.length);
  const vectors = new Map<string, Map<string, number>>();
  if (lens === "context") {
    // Binary term frequency avoids rewarding repeated wording in short summaries.
    const df = new Map<string, number>();
    for (const p of included)
      for (const t of terms.get(p.id)!) df.set(t, (df.get(t) ?? 0) + 1);
    for (const p of included) {
      const v = new Map(
        terms
          .get(p.id)!
          .map((t) => [
            t,
            Math.log((1 + included.length) / (1 + df.get(t)!)) + 1,
          ]),
      );
      const norm = Math.hypot(...v.values());
      vectors.set(p.id, new Map([...v].map(([t, w]) => [t, w / norm])));
    }
  }
  const ids = included.map((p) => p.id);
  return {
    ids,
    excluded: rows.filter((p) => !terms.get(p.id)!.length).map((p) => p.id),
    terms,
    distances: ids.map((a, i) =>
      ids.map((b, j) => {
        if (i === j) return 0;
        if (lens === "context") {
          const va = vectors.get(a)!,
            vb = vectors.get(b)!;
          return Math.max(
            0,
            1 - [...va].reduce((sum, [t, w]) => sum + w * (vb.get(t) ?? 0), 0),
          );
        }
        const ta = terms.get(a)!,
          tb = new Set(terms.get(b)!);
        const shared = ta.filter((t) => tb.has(t)).length;
        return 1 - shared / (ta.length + tb.size - shared);
      }),
    ),
  };
}

/** Deterministic farthest-first initialisation, then best single medoid swaps (PAM). */
export function medoidClusters(
  space: LensSpace,
  requested: number,
  startIndex = 0,
): Cluster[] {
  const n = space.ids.length;
  if (!n) return [];
  const k = Math.min(n, Math.max(1, Math.round(requested)));
  const d = space.distances;
  const medoids = [Math.max(0, Math.min(n - 1, Math.floor(startIndex)))];
  while (medoids.length < k) {
    let candidate = -1,
      farthest = -1;
    for (let i = 0; i < n; i++)
      if (!medoids.includes(i)) {
        const distance = Math.min(...medoids.map((m) => d[i][m]));
        if (distance > farthest) {
          candidate = i;
          farthest = distance;
        }
      }
    medoids.push(candidate);
  }
  const cost = (ms: number[]) =>
    d.reduce((sum, row) => sum + Math.min(...ms.map((m) => row[m])), 0);
  let current = cost(medoids);
  while (current > 1e-10) {
    let best = current,
      swap: [number, number] | undefined;
    for (let m = 0; m < k; m++)
      for (let i = 0; i < n; i++)
        if (!medoids.includes(i)) {
          const trial = [...medoids];
          trial[m] = i;
          const score = cost(trial);
          if (score < best - 1e-10) {
            best = score;
            swap = [m, i];
          }
        }
    if (!swap) break;
    medoids[swap[0]] = swap[1];
    current = best;
  }
  medoids.sort((a, b) => a - b);
  const groups = medoids.map((m) => ({
    medoid: space.ids[m],
    ids: [] as string[],
    terms: [] as string[],
  }));
  space.ids.forEach((id, i) => {
    // Identical vectors still retain their own exemplar when k exceeds distinct vectors.
    const nearest = medoids.includes(i)
      ? i
      : medoids.reduce((a, b) => (d[i][b] < d[i][a] - 1e-10 ? b : a));
    groups[medoids.indexOf(nearest)].ids.push(id);
  });
  for (const group of groups) {
    const counts = new Map<string, number>();
    for (const id of group.ids)
      for (const t of space.terms.get(id) ?? [])
        counts.set(t, (counts.get(t) ?? 0) + 1);
    group.terms = [...counts]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 3)
      .map(([t]) => t);
  }
  return groups;
}

/** Classical metric MDS; negative eigenvalues are omitted, distortion is reported. */
export function projectDistances(distances: number[][], dimensions: 2 | 3 = 2) {
  const n = distances.length;
  if (n < 2)
    return {
      points: n ? [Array(dimensions).fill(0)] : [],
      stress: 0,
      retainedVariance: 0,
      axisVariance: Array(dimensions).fill(0) as number[],
    };
  const squared = distances.map((row) => row.map((d) => d * d));
  const means = squared.map((row) => row.reduce((sum, d) => sum + d, 0) / n);
  const grand = means.reduce((sum, d) => sum + d, 0) / n;
  const gram = new Matrix(
    squared.map((row, i) =>
      row.map((d, j) => -0.5 * (d - means[i] - means[j] + grand)),
    ),
  );
  const eig = new EigenvalueDecomposition(gram, { assumeSymmetric: true });
  const positive = eig.realEigenvalues
    .map((value, index) => ({ value, index }))
    .filter((a) => a.value > 1e-10)
    .sort((a, b) => b.value - a.value);
  const axes = positive.slice(0, dimensions);
  const variance = positive.reduce((sum, axis) => sum + axis.value, 0);
  // Eigenvector signs are arbitrary. Fix them for stable orientation between renders.
  const signs = axes.map((axis) => {
    const column = eig.eigenvectorMatrix.getColumn(axis.index);
    const largest = column.reduce(
      (a, b) => (Math.abs(b) > Math.abs(a) ? b : a),
      0,
    );
    return largest < 0 ? -1 : 1;
  });
  const points = distances.map((_, i) =>
    Array.from({ length: dimensions }, (_, axis) =>
      axes[axis]
        ? eig.eigenvectorMatrix.get(i, axes[axis].index) *
          Math.sqrt(axes[axis].value) *
          signs[axis]
        : 0,
    ),
  );
  let error = 0,
    total = 0;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      error +=
        (Math.hypot(
          ...points[i].map((value, axis) => value - points[j][axis]),
        ) -
          distances[i][j]) **
        2;
      total += distances[i][j] ** 2;
    }
  const axisVariance = Array.from({ length: dimensions }, (_, axis) =>
    variance ? (axes[axis]?.value ?? 0) / variance : 0,
  );
  return {
    points,
    stress: total ? Math.sqrt(error / total) : 0,
    retainedVariance: axisVariance.reduce((sum, value) => sum + value, 0),
    axisVariance,
  };
}

/** Undirected union of each node's k strongest positive, threshold-qualified edges. */
export function neighbourEdges(
  ids: string[],
  pairs: WeightedEdge[],
  k: number,
  minimum: number,
): WeightedEdge[] {
  const scope = new Set(ids),
    chosen = new Map<string, WeightedEdge>();
  const eligible = pairs.filter(
    (p) =>
      p.a !== p.b &&
      scope.has(p.a) &&
      scope.has(p.b) &&
      Number.isFinite(p.value) &&
      p.value > 0 &&
      p.value >= minimum,
  );
  for (const id of ids)
    for (const edge of eligible
      .filter((p) => p.a === id || p.b === id)
      .sort(
        (a, b) =>
          b.value - a.value || a.a.localeCompare(b.a) || a.b.localeCompare(b.b),
      )
      .slice(0, k)) {
      chosen.set(JSON.stringify([edge.a, edge.b].sort()), edge);
    }
  return [...chosen.values()];
}

export function clusterCrossings(
  ids: string[],
  left: Cluster[],
  right: Cluster[],
) {
  const sides = [left, right];
  const nodes: {
    name: string;
    group: Cluster | undefined;
    unknown: boolean;
    depth: number;
    ids: string[];
  }[] = [];
  const memberships = sides.map((groups, depth) => {
    const map = new Map<string, string>();
    for (const group of groups) {
      const name = `${depth}:${group.medoid}`;
      const members = group.ids.filter((id) => ids.includes(id));
      if (!members.length) continue;
      nodes.push({ name, group, unknown: false, depth, ids: members });
      for (const id of members) map.set(id, name);
    }
    const missing = ids.filter((id) => !map.has(id));
    if (missing.length) {
      const name = `${depth}:unknown`;
      nodes.push({
        name,
        group: undefined,
        unknown: true,
        depth,
        ids: missing,
      });
      for (const id of missing) map.set(id, name);
    }
    return map;
  });
  const links = new Map<
    string,
    { source: string; target: string; ids: string[] }
  >();
  for (const id of ids) {
    const source = memberships[0].get(id)!,
      target = memberships[1].get(id)!;
    const key = JSON.stringify([source, target]);
    if (!links.has(key)) links.set(key, { source, target, ids: [] });
    links.get(key)!.ids.push(id);
  }
  return { nodes, links: [...links.values()] };
}

export function networkCoverage(
  ids: string[],
  pairs: WeightedEdge[],
  edges: WeightedEdge[],
) {
  const scope = new Set(ids);
  const measured = new Set(
    pairs
      .filter(
        (p) =>
          scope.has(p.a) &&
          scope.has(p.b) &&
          p.a !== p.b &&
          Number.isFinite(p.value),
      )
      .flatMap((p) => [p.a, p.b]),
  );
  const connected = new Set(edges.flatMap((e) => [e.a, e.b]));
  return {
    isolates: ids.filter((id) => measured.has(id) && !connected.has(id)),
    unavailable: ids.filter((id) => !measured.has(id)),
  };
}
