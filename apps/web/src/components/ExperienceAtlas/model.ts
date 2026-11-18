import {
  publicProjectScale,
  type ProjectScale,
} from "@homepage/content/projectScale";
import type { CvProject } from "@homepage/content/models";
import type { LabProject } from "../ProjectLab/analysis";
import { projectIdentityLabels } from "../ProjectLab/analysis";
import { validScore } from "../ProjectLab/ownerLenses";
import {
  compareFingerprints,
  fingerprint,
  PRESETS,
} from "../ProjectLab/vectorSpaces";
import { projectPath } from "../../lib/seo";
import { SECTORS } from "@homepage/content/projectTaxonomy";

export type AtlasLens = "challenge" | "industry" | "product";
export const LENSES: { id: AtlasLens; label: string; question: string }[] = [
  {
    id: "challenge",
    label: "Client challenges",
    question: "What are you trying to achieve?",
  },
  {
    id: "industry",
    label: "Industries",
    question: "Where does your world connect with mine?",
  },
  {
    id: "product",
    label: "Product formats",
    question: "What kind of thing are you building?",
  },
];
type GroupDefinition = {
  id: string;
  label: string;
  color: string;
  tags: string[];
};
const GROUPS: Record<AtlasLens, GroupDefinition[]> = {
  challenge: [
    {
      id: "launch",
      label: "Launch & validate",
      color: "#c6dc96",
      tags: ["Launch a new product", "Validate a product idea"],
    },
    {
      id: "experience",
      label: "Interfaces & experiences",
      color: "#b2a8da",
      tags: [
        "Improve a complex interface",
        "Create an interactive experience",
        "Enable collaboration",
      ],
    },
    {
      id: "data",
      label: "Data & decisions",
      color: "#80c5bd",
      tags: ["Make data actionable", "Deliver an industry-specific workflow"],
    },
    {
      id: "automation",
      label: "Automation & AI",
      color: "#e5b183",
      tags: [
        "Automate repetitive work",
        "Add AI capabilities",
        "Build internal tooling",
      ],
    },
    {
      id: "growth",
      label: "Commerce & conversion",
      color: "#d69ca6",
      tags: ["Improve conversion", "Create a public website"],
    },
    {
      id: "systems",
      label: "Connected systems",
      color: "#8bb8dd",
      tags: [
        "Integrate business systems",
        "Connect software and hardware",
        "Maintain and evolve a product",
        "Join an existing team",
      ],
    },
  ],
  industry: Object.entries(SECTORS).map(([sector, config]) => ({
    id: sector,
    label: sector,
    color: config.color,
    tags: [sector],
  })),
  // Specific product forms take precedence over generic platform tags.
  product: [
    {
      id: "physical",
      label: "Connected devices",
      color: "#d69ca6",
      tags: ["Hardware / embedded", "Physical product"],
    },
    {
      id: "interactive",
      label: "Interactive products",
      color: "#b2a8da",
      tags: [
        "Configurator",
        "Game",
        "Interactive experience",
        "Educational app",
      ],
    },
    {
      id: "research",
      label: "Research & optimization",
      color: "#e5b183",
      tags: ["CRO Consulting", "A/B-Testing"],
    },
    {
      id: "integrations",
      label: "Tools & integrations",
      color: "#8bb8dd",
      tags: ["Developer tool", "Plugin / integration", "API", "Chatbot"],
    },
    {
      id: "websites",
      label: "Websites & shops",
      color: "#c6dc96",
      tags: ["Website", "E-commerce"],
    },
    {
      id: "apps",
      label: "Apps & platforms",
      color: "#80c5bd",
      tags: ["SaaS", "Web app", "Mobile app"],
    },
  ],
};
const UNMAPPED: GroupDefinition = {
  id: "unmapped",
  label: "Still to be mapped",
  color: "#a4ada5",
  tags: [],
};
type Classifiable = {
  industries?: string[];
  matching?: { buyerNeeds?: string[]; domains?: string[] };
  productTypes?: string[];
};

/** Categorical placement, not a similarity projection. Keep secondary memberships. */
export function atlasMemberships(
  project: Classifiable,
  lens: AtlasLens,
): string[] {
  const tags =
    lens === "challenge"
      ? (project.matching?.buyerNeeds ?? [])
      : lens === "industry"
        ? (project.industries ?? [])
        : (project.productTypes ?? []);
  const matches =
    lens === "product"
      ? GROUPS[lens]
          .filter((group) => group.tags.some((tag) => tags.includes(tag)))
          .map((group) => group.id)
      : tags.flatMap((tag) =>
          GROUPS[lens]
            .filter((group) => group.tags.includes(tag))
            .map((group) => group.id),
        );
  return [...new Set(matches.length ? matches : [UNMAPPED.id])];
}

export function atlasGroups<T extends Classifiable & { id: string }>(
  projects: T[],
  lens: AtlasLens,
) {
  return [...GROUPS[lens], UNMAPPED]
    .map((group) => ({
      ...group,
      projects: projects.filter(
        (project) => atlasMemberships(project, lens)[0] === group.id,
      ),
    }))
    .filter((group) => group.projects.length);
}

/** Fixed region grid and deterministic rows make changes of perspective traceable. */
export function atlasLayout<T extends Classifiable & { id: string }>(
  projects: T[],
  lens: AtlasLens,
) {
  const groups = atlasGroups(projects, lens);
  const regular = groups.filter((group) => group.id !== UNMAPPED.id);
  const bands = Array.from(
    { length: Math.ceil(regular.length / 3) },
    (_, row) =>
      Math.max(
        300,
        ...regular
          .slice(row * 3, row * 3 + 3)
          .map(
            (group) =>
              Math.ceil(
                group.projects.length / (group.projects.length <= 4 ? 2 : 3),
              ) *
                49 +
              80,
          ),
      ),
  );
  return groups.map((group, index) => {
    const unmapped = group.id === UNMAPPED.id;
    const band = Math.floor(index / 3);
    const cx = 195 + (index % 3) * 390;
    const cy = unmapped
      ? bands.reduce((sum, value) => sum + value, 0) +
        Math.max(60, Math.ceil(group.projects.length / 6) * 24.5 + 20)
      : bands.slice(0, band).reduce((sum, value) => sum + value, 0) +
        bands[band] / 2 +
        10;
    const columns = unmapped ? 6 : group.projects.length <= 4 ? 2 : 3;
    const rows = Math.ceil(group.projects.length / columns);
    return {
      ...group,
      cx: unmapped ? 195 : cx,
      cy,
      radiusY: unmapped ? rows * 25 + 10 : bands[band] / 2 - 31,
      nodes: group.projects.map((project, i) => {
        const row = Math.floor(i / columns);
        const count = Math.min(columns, group.projects.length - row * columns);
        return {
          project,
          x: unmapped
            ? 420 + (i % columns) * 112
            : cx + ((i % columns) - (count - 1) / 2) * 112,
          y: cy + (row - (rows - 1) / 2) * 49 + 8,
        };
      }),
    };
  });
}

export function atlasMapHeight(layout: { cy: number; radiusY: number }[]) {
  return Math.max(200, ...layout.map((group) => group.cy + group.radiusY + 40));
}

export type AtlasRelated = { id: string; reasons: string[] };
export function atlasRelated(
  projects: LabProject[],
  selectedId: string,
): AtlasRelated[] {
  const selected = projects.find((p) => p.id === selectedId);
  const sectors = (project: LabProject) =>
    project.industries ?? project.matching.domains ?? [];
  if (!selected || !sectors(selected).length) return [];
  const source = fingerprint(selected);
  return projects
    .filter(
      (p) =>
        p.id !== selectedId &&
        sectors(p).length &&
        !sectors(p).some((sector) => sectors(selected).includes(sector)),
    )
    .map((p) => {
      const comparison = compareFingerprints(
        source,
        fingerprint(p),
        PRESETS.practice,
      );
      const needs = (p.matching.buyerNeeds ?? []).filter((n) =>
        selected.matching.buyerNeeds?.includes(n),
      );
      const practices = [
        ...(p.capabilities ?? []),
        ...(p.methods ?? []),
      ].filter((n) =>
        [
          ...(selected.capabilities ?? []),
          ...(selected.methods ?? []),
        ].includes(n),
      );
      return {
        id: p.id,
        score: comparison.score ?? 0,
        reasons: [...new Set([...needs.slice(0, 1), ...practices.slice(0, 2)])],
      };
    })
    .filter((p) => p.reasons.length > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, 3)
    .map(({ id, reasons }) => ({ id, reasons }));
}

export type AtlasProject = {
  /** Published locale-specific copy. Never used by the analysis model. */
  presentation?: {
    description: string;
    locale: "en" | "de";
    projectHref: string | null;
    caseHref: string | null;
    caseLocale: "en" | "de";
  };
  wowFactor: number | null;
  industries: string[];
  id: string;
  name: string;
  label: string;
  subtitle: string;
  summary: string;
  projectType: string;
  startDate: string;
  endDate: string | null;
  matching: { buyerNeeds: string[]; domains: string[]; stages: string[] };
  productTypes: string[];
  tools: string[];
  languages: string[];
  capabilities: string[];
  methods: string[];
  scale?: ProjectScale;
  contribution: string;
  ownership: string;
  maintenance: string;
  delivery: string;
  outcome: string;
  outcomeBasis: string;
  screenshots: string[];
  caseHref: string | null;
  websiteHref: string | null;
  related: AtlasRelated[];
};

/** Explicit view model: safe scale facts, no raw notes, source paths or embeddings. */
export function projectAtlasData(
  projects: LabProject[],
  publicProjects: CvProject[],
): AtlasProject[] {
  const labels = projectIdentityLabels(projects);
  const media = new Map(publicProjects.map((p) => [p.id, p]));
  return projects.map((p) => {
    const published = media.get(p.id);
    return {
      id: p.id,
      wowFactor: validScore(p.assessment?.wow, 10),
      name: p.name,
      label: labels.get(p.id) ?? p.name,
      subtitle: p.shortDescription?.trim() ?? "",
      summary: p.matching.summary ?? "",
      projectType: p.projectType,
      industries: p.industries ?? published?.industries ?? [],
      startDate: p.startDate,
      endDate: p.endDate,
      matching: {
        buyerNeeds: p.matching.buyerNeeds ?? [],
        domains: p.matching.domains ?? [],
        stages: p.matching.stages ?? [],
      },
      productTypes: p.productTypes ?? [],
      tools: p.tools ?? [],
      languages: p.languages ?? [],
      capabilities: p.capabilities ?? [],
      methods: p.methods ?? [],
      scale: publicProjectScale(p.scale),
      contribution: p.contribution ?? "",
      ownership: p.matching.ownership ?? "",
      maintenance: p.matching.maintenance ?? "",
      delivery: p.deliveryEvidence ?? "",
      outcome: p.outcomeEvidence ?? "",
      outcomeBasis: p.outcomeBasis ?? "",
      screenshots: published?.screenshots ?? [],
      caseHref: published?.caseStudyIds?.en
        ? `${projectPath(published, "en")}/case-study`
        : null,
      websiteHref:
        published?.websiteUrl && /^https?:\/\//i.test(published.websiteUrl)
          ? published.websiteUrl
          : null,
      related: atlasRelated(projects, p.id),
    };
  });
}

export function atlasSearch(projects: AtlasProject[], query: string) {
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}+#]+/gu, " ")
      .trim();
  const search = normalize(query);
  return projects.filter((project) =>
    normalize(
      [
        project.label,
        project.subtitle,
        ...project.matching.buyerNeeds,
        ...project.industries,
        ...project.matching.domains,
        ...project.productTypes,
        ...project.tools,
        ...project.languages,
        ...project.capabilities,
        ...project.methods,
      ].join(" "),
    ).includes(search),
  );
}
