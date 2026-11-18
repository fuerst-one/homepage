import { publicProjectScale } from "@homepage/content/projectScale";
import type { CvProject } from "@homepage/content/models";
import type { LabSnapshot } from "./analysis";
import { validScore } from "./ownerLenses";

/** Deployment boundary: allowlisted portfolio fields, never a raw research export. */
export function publicLabSnapshot(
  source: LabSnapshot,
  published: Pick<CvProject, "id" | "wowFactor" | "scale">[],
): LabSnapshot {
  const visible = new Map(published.map((p) => [p.id, p]));
  const projects = source.projects
    .filter((p) => visible.has(p.id))
    .map((p) => ({
      id: p.id,
      name: p.name,
      shortDescription: p.shortDescription ?? "",
      projectType: p.projectType,
      startDate: p.startDate,
      endDate: p.endDate,
      status: p.status,
      industries: p.industries ?? [],
      tools: p.tools ?? [],
      languages: p.languages ?? [],
      capabilities: p.capabilities ?? [],
      methods: p.methods ?? [],
      scale: publicProjectScale(p.scale ?? visible.get(p.id)?.scale),
      productTypes: p.productTypes ?? [],
      targetMarket: p.targetMarket ?? [],
      usageContext: p.usageContext ?? [],
      deliveryModel: p.deliveryModel ?? null,
      matching: {
        summary: p.matching.summary ?? "",
        buyerNeeds: p.matching.buyerNeeds ?? [],
        domains: p.matching.domains ?? [],
        stages: p.matching.stages ?? [],
        aiCapabilities: p.matching.aiCapabilities ?? [],
        aiUsage: p.matching.aiUsage ?? [],
        ownership: p.matching.ownership ?? "",
        maintenance: p.matching.maintenance ?? "",
      },
      caseStudyWords: p.caseStudyWords ?? 0,
      contribution: p.contribution ?? "",
      contributionBasis: p.contributionBasis ?? "",
      deliveryEvidence: p.deliveryEvidence ?? "",
      outcomeEvidence: p.outcomeEvidence ?? "",
      outcomeBasis: p.outcomeBasis ?? "",
      evidenceGaps: "",
      workingPattern: "",
      sourceEditedAt: "",
      assessment: {
        wow: validScore(visible.get(p.id)?.wowFactor, 10),
        complexity: null,
        effortLow: null,
        effortHigh: null,
        effortClass: "",
        effortBasis: "",
        complexityBasis: "",
        teamLow: null,
        teamHigh: null,
        workplace: "",
      },
    }));
  const ids = new Set(projects.map((p) => p.id));
  const m = source.metadata;
  return {
    projects,
    similarities: source.similarities
      .filter((p) => ids.has(p.a) && ids.has(p.b))
      .map((p) => ({
        a: p.a,
        b: p.b,
        cosine: p.cosine,
        technologyOverlap: p.technologyOverlap,
        sharedTechnology: p.sharedTechnology,
      })),
    findings: [],
    metadata: {
      exportedAt: m.exportedAt,
      publicationRefreshedAt: m.publicationRefreshedAt,
      notionFetchedAt: m.notionFetchedAt,
      knowledgeSyncedAt: m.knowledgeSyncedAt,
      comparisonPublicationRefreshedAt: m.comparisonPublicationRefreshedAt,
      publicationEmbeddingDocuments: m.publicationEmbeddingDocuments,
      embeddingModel: m.embeddingModel,
      embeddingDimensions: m.embeddingDimensions,
      embeddedProjects: new Set(
        source.similarities
          .filter((p) => ids.has(p.a) && ids.has(p.b))
          .flatMap((p) => [p.a, p.b]),
      ).size,
      chunks: m.chunks,
      source:
        "Prepared portfolio snapshot from public projects and reviewed case descriptions",
      auditCoverage: { matchedProjects: 0, unmatchedProjects: [], notes: [] },
    },
  };
}
