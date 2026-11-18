import type { ProjectScale } from "@homepage/content/projectScale";
import type { ProjectCase } from "@homepage/content/projectCase";
import type { ProjectTaxonomy } from "@homepage/content/projectTaxonomy";

export type ProjectAssessment = {
  wow: number | null;
  complexity: number | null;
  effortLow: number | null;
  effortHigh: number | null;
  effortClass: string;
  effortBasis: string;
  complexityBasis: string;
  teamLow: number | null;
  teamHigh: number | null;
  workplace: string;
};
export type LabProject = ProjectTaxonomy & {
  industries?: string[];
  id: string;
  name: string;
  shortDescription?: string;
  projectType: string;
  startDate: string;
  endDate: string | null;
  status: string;
  tools: string[];
  languages: string[];
  capabilities: string[];
  methods: string[];
  scale?: ProjectScale;
  matching: ProjectCase;
  caseStudyWords: number;
  outcomeBasis: string;
  contributionBasis: string;
  deliveryEvidence: string;
  outcomeEvidence: string;
  evidenceGaps: string;
  contribution: string;
  workingPattern: string;
  targetMarket: string[];
  productTypes: string[];
  sourceEditedAt: string;
  assessment?: ProjectAssessment;
};

/** Names need not be unique; never merge project identities for a display label. */
export function projectIdentityLabels(
  projects: Pick<LabProject, "id" | "name" | "shortDescription">[],
  format: (name: string) => string = (name) => name.trim(),
) {
  const names = projects.map((p) => format(p.name));
  const candidates = projects.map((p, i) =>
    names.filter((n) => n === names[i]).length > 1
      ? `${names[i]} · ${p.shortDescription?.trim() || p.id}`
      : names[i],
  );
  return new Map(
    projects.map((p, i) => [
      p.id,
      candidates.filter((n) => n === candidates[i]).length > 1
        ? `${candidates[i]} [${p.id}]`
        : candidates[i],
    ]),
  );
}
export type AuditFinding = {
  projectId: string;
  property: string;
  tag: string;
  kind: "missing" | "review" | "taxonomy";
  confidence: string;
  evidence: string;
  paths: string[];
  caveat: string;
};
export type SemanticPair = {
  a: string;
  b: string;
  cosine: number;
  technologyOverlap: number | null;
  sharedTechnology: string[];
};
export type LabSnapshot = {
  metadata: {
    exportedAt: string;
    publicationRefreshedAt: string;
    knowledgeSyncedAt: string;
    comparisonPublicationRefreshedAt?: string;
    publicationEmbeddingDocuments?: number;
    notionFetchedAt: string;
    embeddingModel: string;
    embeddingDimensions: number;
    embeddedProjects: number;
    chunks: number;
    source: string;
    auditCoverage: {
      matchedProjects: number;
      unmatchedProjects: string[];
      notes: string[];
    };
  };
  projects: LabProject[];
  similarities: SemanticPair[];
  findings: AuditFinding[];
};

type Dimension =
  "buyerNeeds" | "domains" | "stages" | "aiCapabilities" | "aiUsage";
export function crossTab(
  projects: LabProject[],
  rows: Dimension,
  columns: Dimension,
) {
  const cells = new Map<
    string,
    { row: string; column: string; ids: string[] }
  >();
  for (const project of projects) {
    for (const row of new Set(project.matching?.[rows] ?? [])) {
      for (const column of new Set(project.matching?.[columns] ?? [])) {
        const key = JSON.stringify([row, column]);
        const cell = cells.get(key) ?? { row, column, ids: [] };
        cell.ids.push(project.id);
        cells.set(key, cell);
      }
    }
  }
  return [...cells.values()];
}
export function needTimeline(projects: LabProject[]) {
  const cells = new Map<
    string,
    { year: number; need: string; ids: string[] }
  >();
  for (const project of projects) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(project.startDate) ||
      !Number.isFinite(Date.parse(project.startDate))
    )
      continue;
    const year = Number(project.startDate.slice(0, 4));
    for (const need of new Set(project.matching?.buyerNeeds ?? [])) {
      const key = JSON.stringify([year, need]);
      const cell = cells.get(key) ?? { year, need, ids: [] };
      cell.ids.push(project.id);
      cells.set(key, cell);
    }
  }
  return [...cells.values()].sort(
    (a, b) => a.year - b.year || a.need.localeCompare(b.need),
  );
}

type EmbeddingDocument = {
  projectId: string;
  embeddingModel: string;
  matchesCurrentPublication?: boolean;
  chunks: { embedding: number[] }[];
};
function normalized(vector: number[]) {
  if (!vector.length || !vector.every(Number.isFinite)) return null;
  const length = Math.hypot(...vector);
  return length > 0 ? vector.map((v) => v / length) : null;
}
/** Equal weight per normalized EN chunk; compare only one model and dimension. */
export function projectSimilarities(
  projects: LabProject[],
  documents: EmbeddingDocument[],
): SemanticPair[] {
  const vectors = new Map<string, { vector: number[]; model: string }>();
  for (const document of documents) {
    if (
      document.matchesCurrentPublication === false ||
      !document.embeddingModel
    )
      continue;
    const chunks = document.chunks.map((c) => normalized(c.embedding));
    const size = chunks[0]?.length;
    if (!size || chunks.some((c) => !c || c.length !== size)) continue;
    const mean = Array.from(
      { length: size },
      (_, i) => chunks.reduce((sum, c) => sum + c![i], 0) / chunks.length,
    );
    const vector = normalized(mean);
    if (vector)
      vectors.set(document.projectId, {
        vector,
        model: document.embeddingModel,
      });
  }
  const overlaps = new Map(
    technologyPairs(projects).map((pair) => [
      JSON.stringify([pair.a, pair.b]),
      pair,
    ]),
  );
  const pairs: SemanticPair[] = [];
  for (let i = 0; i < projects.length; i++) {
    for (let j = i + 1; j < projects.length; j++) {
      const a = projects[i],
        b = projects[j],
        va = vectors.get(a.id),
        vb = vectors.get(b.id);
      if (
        !va ||
        !vb ||
        va.model !== vb.model ||
        va.vector.length !== vb.vector.length
      )
        continue;
      const overlap = overlaps.get(JSON.stringify([a.id, b.id]))!;
      pairs.push({
        a: a.id,
        b: b.id,
        cosine: Math.max(
          -1,
          Math.min(
            1,
            va.vector.reduce((sum, v, k) => sum + v * vb.vector[k], 0),
          ),
        ),
        technologyOverlap: overlap.technologyOverlap,
        sharedTechnology: overlap.sharedTechnology,
      });
    }
  }
  return pairs.sort(
    (a, b) =>
      b.cosine - a.cosine || a.a.localeCompare(b.a) || a.b.localeCompare(b.b),
  );
}
export function labSummary(projects: LabProject[]) {
  return {
    projects: projects.length,
    caseStudies: projects.filter((p) => p.caseStudyWords > 0).length,
    ownerConfirmed: projects.filter(
      (p) => p.contributionBasis === "Owner confirmation",
    ).length,
    measuredOutcomes: projects.filter(
      (p) => p.outcomeBasis === "Owner-reported measurement",
    ).length,
    missingOutcomes: projects.filter(
      (p) => !p.outcomeBasis || p.outcomeBasis === "No outcome recorded",
    ).length,
    missingStages: projects.filter((p) => !p.matching?.stages?.length).length,
  };
}

/** Tag comparisons do not require an embedding or an indexed document. */
export function technologyPairs(projects: LabProject[]) {
  const technologies = projects.map(
    (project) =>
      new Set([
        ...project.tools.map((t) => `tool:${t}`),
        ...project.languages.map((t) => `language:${t}`),
      ]),
  );
  const pairs: Omit<SemanticPair, "cosine">[] = [];
  for (let i = 0; i < projects.length; i++)
    for (let j = i + 1; j < projects.length; j++) {
      const union = new Set([...technologies[i], ...technologies[j]]);
      const intersection = [...technologies[i]].filter((t) =>
        technologies[j].has(t),
      );
      pairs.push({
        a: projects[i].id,
        b: projects[j].id,
        technologyOverlap: union.size ? intersection.length / union.size : null,
        sharedTechnology: intersection.map((t) => t.slice(t.indexOf(":") + 1)),
      });
    }
  return pairs;
}
export function outcomeCategories(projects: LabProject[]) {
  const known = [
    "Owner-reported measurement",
    "Owner estimate",
    "Self-reported result",
    "Capability only",
    "No outcome recorded",
    "Source-verified measurement",
  ];
  return [
    ...known,
    ...[...new Set(projects.map((p) => p.outcomeBasis).filter(Boolean))]
      .filter((label) => !known.includes(label))
      .sort(),
  ];
}
