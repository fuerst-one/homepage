import type { LabProject, SemanticPair } from "./analysis";

export type FlowNode = {
  id: string;
  label: string;
  stage: number;
  ids: string[];
};
export type FlowLink = {
  source: string;
  target: string;
  stage: number;
  ids: string[];
};
/** One project follows one path. Adjacent-column totals each equal the cohort size. */
export function projectFlow(projects: LabProject[]) {
  const nodes = new Map<string, FlowNode>();
  const links = new Map<string, FlowLink>();
  for (const project of projects) {
    const labels = [
      project.projectType || "Unknown engagement",
      project.matching.ownership || "Unknown ownership",
      project.outcomeBasis || "Unknown outcome basis",
    ];
    const path = labels.map((label, stage) => {
      const id = `${stage}:${label}`;
      const node = nodes.get(id) ?? { id, label, stage, ids: [] };
      node.ids.push(project.id);
      nodes.set(id, node);
      return id;
    });
    for (let stage = 0; stage < 2; stage++) {
      const source = path[stage],
        target = path[stage + 1],
        key = JSON.stringify([source, target]);
      const link = links.get(key) ?? { source, target, stage, ids: [] };
      link.ids.push(project.id);
      links.set(key, link);
    }
  }
  return { nodes: [...nodes.values()], links: [...links.values()] };
}

export type CapabilityPair = {
  a: string;
  b: string;
  ids: string[];
  supportA: number;
  supportB: number;
  lift: number;
};
/** Descriptive association only: observed joint share / product of marginal shares. */
export function capabilityPairs(
  projects: LabProject[],
  field: "capabilities" | "buyerNeeds",
  minimum = 3,
): CapabilityPair[] {
  const terms = new Map<string, Set<string>>();
  for (const project of projects)
    for (const term of new Set(
      field === "capabilities"
        ? project.capabilities
        : project.matching.buyerNeeds,
    )) {
      const ids = terms.get(term) ?? new Set<string>();
      ids.add(project.id);
      terms.set(term, ids);
    }
  const labels = [...terms.keys()].sort();
  const result: CapabilityPair[] = [];
  for (let i = 0; i < labels.length; i++)
    for (let j = i + 1; j < labels.length; j++) {
      const a = labels[i],
        b = labels[j],
        sa = terms.get(a)!,
        sb = terms.get(b)!;
      const ids = [...sa].filter((id) => sb.has(id));
      if (ids.length < Math.max(1, minimum)) continue;
      result.push({
        a,
        b,
        ids,
        supportA: sa.size,
        supportB: sb.size,
        lift: (ids.length * projects.length) / (sa.size * sb.size),
      });
    }
  return result.sort(
    (a, b) =>
      b.lift - a.lift ||
      b.ids.length - a.ids.length ||
      a.a.localeCompare(b.a) ||
      a.b.localeCompare(b.b),
  );
}

export type FamilyNode = {
  id: string;
  ids: string[];
  distance: number;
  left?: FamilyNode;
  right?: FamilyNode;
};
/** Average linkage over known cross-cluster pairs. Unknown similarities never become distances. */
export function semanticFamilies(
  projects: LabProject[],
  pairs: Pick<SemanticPair, "a" | "b" | "cosine">[],
  cut: number,
) {
  const publicIds = new Set(projects.map((p) => p.id));
  const key = (a: string, b: string) => JSON.stringify([a, b].sort());
  const distances = new Map(
    pairs
      .filter(
        (p) =>
          p.a !== p.b &&
          publicIds.has(p.a) &&
          publicIds.has(p.b) &&
          Number.isFinite(p.cosine) &&
          p.cosine >= -1 &&
          p.cosine <= 1,
      )
      .map((p) => [key(p.a, p.b), 1 - p.cosine]),
  );
  const clusters: FamilyNode[] = projects
    .map((p) => ({ id: JSON.stringify([p.id]), ids: [p.id], distance: 0 }))
    .sort((a, b) => a.id.localeCompare(b.id));
  while (clusters.length > 1) {
    let chosen: { i: number; j: number; distance: number } | undefined;
    for (let i = 0; i < clusters.length; i++)
      for (let j = i + 1; j < clusters.length; j++) {
        let sum = 0,
          count = 0,
          complete = true;
        for (const a of clusters[i].ids)
          for (const b of clusters[j].ids) {
            const distance = distances.get(key(a, b));
            if (distance === undefined) complete = false;
            else {
              sum += distance;
              count++;
            }
          }
        if (!complete || !count) continue;
        const distance = sum / count;
        if (!chosen || distance < chosen.distance) chosen = { i, j, distance };
      }
    if (!chosen) break;
    const { i, j, distance } = chosen,
      left = clusters[i],
      right = clusters[j],
      ids = [...left.ids, ...right.ids].sort();
    clusters.splice(j, 1);
    clusters.splice(i, 1);
    clusters.push({ id: JSON.stringify(ids), ids, distance, left, right });
    clusters.sort((a, b) => a.id.localeCompare(b.id));
  }
  const groups: FamilyNode[] = [];
  const visit = (node: FamilyNode) => {
    if (!node.left || !node.right || node.distance <= cut) groups.push(node);
    else {
      visit(node.left);
      visit(node.right);
    }
  };
  for (const root of clusters) visit(root);
  return {
    roots: clusters,
    groups: groups.sort((a, b) => a.id.localeCompare(b.id)),
  };
}

export type CoverageStep = {
  projectId: string;
  added: string[];
  matched: string[];
  cumulative: number;
};
/** Greedy set cover, not a guaranteed smallest set. No ownership or evidence scoring is invented. */
export function coverageShortlist(
  projects: LabProject[],
  selectedNeeds: string[],
  publishedOnly: boolean,
) {
  const targetNeeds = [...new Set(selectedNeeds.filter(Boolean))].sort();
  const eligible = projects
    .filter((p) => !publishedOnly || p.caseStudyWords > 0)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const remaining = new Set(targetNeeds),
    used = new Set<string>(),
    steps: CoverageStep[] = [];
  while (remaining.size) {
    let best: LabProject | undefined,
      added: string[] = [];
    for (const project of eligible) {
      if (used.has(project.id)) continue;
      const gain = [...new Set(project.matching.buyerNeeds)]
        .filter((need) => remaining.has(need))
        .sort();
      if (gain.length > added.length) {
        best = project;
        added = gain;
      }
    }
    if (!best) break;
    for (const need of added) remaining.delete(need);
    used.add(best.id);
    steps.push({
      projectId: best.id,
      added,
      matched: targetNeeds.filter((n) => best.matching.buyerNeeds.includes(n)),
      cumulative: targetNeeds.length - remaining.size,
    });
  }
  return {
    targetNeeds,
    steps,
    covered: targetNeeds.filter((n) => !remaining.has(n)),
    uncovered: targetNeeds.filter((n) => remaining.has(n)),
    eligibleProjects: eligible.length,
  };
}
