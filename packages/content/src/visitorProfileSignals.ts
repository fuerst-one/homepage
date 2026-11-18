import type {
  ProfileCatalog,
  ProfileFacet,
  ProfileSignal,
  ProfileSignalKind,
  VisitorProfile,
} from "./visitorProfile";

/** Evidence weights are inspectable hypotheses, never calibrated probabilities. */
export const EXTRA_SIGNAL_WEIGHTS = {
  project_details_viewed: 3,
  case_study_viewed: 4,
  project_section_read: 2,
  gallery_explored: 0,
  proof_opened: 0,
  service_offer_viewed: 4,
  service_collaboration_viewed: 3,
  service_section_read: 0,
  explorer_lens_selected: 0,
  explorer_cluster_selected: 0,
  explorer_term_selected: 4,
  related_project_opened: 2,
  topic_selected: 6,
  project_returned: 0,
  project_saved: 0,
  project_unsaved: 0,
  project_more: 0,
  project_neutral: 0,
} as const;
export const PROFILE_SECTIONS = [
  "outcomes",
  "architecture",
  "process",
  "delivery",
] as const;
export type ProfileSection = (typeof PROFILE_SECTIONS)[number];
export type ProjectChoice = {
  saved: boolean;
  feedback: "more" | "auto";
};
export const EMPTY_PROJECT_CHOICE: ProjectChoice = {
  saved: false,
  feedback: "auto",
};
export const PROJECT_CHOICE_KINDS = [
  "project_saved",
  "project_unsaved",
  "project_more",
  "project_neutral",
] as const;
export function isProjectChoiceKind(kind: string): boolean {
  return (PROJECT_CHOICE_KINDS as readonly string[]).includes(kind);
}
export function applyProjectChoice(
  choice: ProjectChoice,
  kind: string,
): ProjectChoice {
  switch (kind) {
    case "project_saved":
      return { ...choice, saved: true };
    case "project_unsaved":
      return { ...choice, saved: false };
    case "project_more":
      return { ...choice, feedback: "more" };
    case "project_neutral":
      return { ...choice, feedback: "auto" };
    default:
      return choice;
  }
}
const sectionFacets: Record<ProfileSection, readonly ProfileFacet[]> = {
  outcomes: ["buyerNeeds"],
  architecture: ["capabilities", "tools"],
  process: ["methods"],
  delivery: ["stages"],
};
export const PROFILE_LENSES = [
  "product",
  "engineering",
  "contribution",
  "scale",
] as const;
export const PROFILE_SERVICE_SECTIONS = [
  "deliverables",
  "process",
  "commercial",
  "collaboration",
] as const;

/** Classify only a section heading, never arbitrary visitor text or body prose. */
export function profileSectionKind(heading: string): ProfileSection | null {
  const text = heading.toLowerCase();
  if (/\b(outcomes?|results?|impact|ergebnisse?|wirkung|kpis?)\b/.test(text))
    return "outcomes";
  if (
    /\b(architecture|architektur|technical|technisch\w*|technolog\w*|integrations?|integrationen|implementation|implementierung)\b/.test(
      text,
    )
  )
    return "architecture";
  if (
    /\b(process|prozess\w*|research|forschung|methods?|methoden|discovery|vorgehen)\b|how we worked|wie wir gearbeitet/.test(
      text,
    )
  )
    return "process";
  if (
    /\b(delivery|rollout|deployment|operations?|betrieb|wartung|handover|übergabe)\b/.test(
      text,
    )
  )
    return "delivery";
  return null;
}

export function extraProfileSubjectTerms(
  kind: ProfileSignalKind,
  subject: string,
  catalog: ProfileCatalog,
) {
  if (kind === "topic_selected" || kind === "explorer_term_selected")
    return catalog.terms.filter((t) => t.id === subject);
  if (kind === "project_section_read") {
    const [id, section] = subject.split("|");
    const project = catalog.projects.find((p) => p.id === id);
    const facets = sectionFacets[section as ProfileSection] ?? [];
    return catalog.terms.filter(
      (t) => project?.terms.includes(t.id) && facets.includes(t.facet),
    );
  }
  if (kind === "related_project_opened") {
    const [from, to] = subject
      .split("|")
      .map((id) => catalog.projects.find((p) => p.id === id));
    return catalog.terms.filter(
      (t) =>
        (t.facet === "buyerNeeds" || t.facet === "methods") &&
        from?.terms.includes(t.id) &&
        to?.terms.includes(t.id),
    );
  }
  return undefined;
}
export function validExtraProfileSubject(
  kind: string,
  subject: string,
  catalog: ProfileCatalog,
): boolean | undefined {
  const project = (id: string) => catalog.projects.some((p) => p.id === id);
  if (kind === "topic_selected" || kind === "explorer_term_selected")
    return catalog.terms.some((t) => t.id === subject);
  if (kind === "explorer_lens_selected" || kind === "explorer_cluster_selected")
    return (PROFILE_LENSES as readonly string[]).includes(subject);
  if (kind === "project_section_read" || kind === "proof_opened") {
    const parts = subject.split("|");
    const [id, detail] = parts;
    return (
      parts.length === 2 &&
      !!detail &&
      project(id) &&
      (kind === "proof_opened"
        ? ["github", "live"].includes(detail)
        : (PROFILE_SECTIONS as readonly string[]).includes(detail))
    );
  }
  if (kind === "related_project_opened") {
    const parts = subject.split("|");
    const [from, to] = parts;
    return (
      parts.length === 2 && !!to && from !== to && project(from) && project(to)
    );
  }
  if (kind === "service_section_read") {
    const parts = subject.split("|");
    const [service, section] = parts;
    return (
      parts.length === 2 &&
      ["product-interfaces", "ai-automation", "ai-products"].includes(
        service,
      ) &&
      (PROFILE_SERVICE_SECTIONS as readonly string[]).includes(section)
    );
  }
  return undefined;
}

export function isReturningProfileProject(
  profile: VisitorProfile,
  id: string,
  now: number,
): boolean {
  const prior = profile.signals.filter(
    (s) =>
      s.subject === id &&
      [
        "project_opened",
        "project_details_viewed",
        "case_study_viewed",
        "project_returned",
      ].includes(s.kind) &&
      s.at <= now,
  );
  return (
    prior.length > 0 && now - Math.max(...prior.map((s) => s.at)) >= 86400_000
  );
}
export type ProfilePattern = {
  kind:
    | "shared_need"
    | "implementation_proof"
    | "live_proof"
    | "engagement_consideration"
    | "returning_project"
    | "explorer_perspective";
  id: string;
  projectIds: string[];
  evidence: ProfileSignal[];
  subject?: string;
};

/** Recompute patterns from bounded public evidence; never persist a second inferred truth. */
export function profilePatterns(
  profile: VisitorProfile,
  catalog: ProfileCatalog,
  now: number,
): ProfilePattern[] {
  const recent = profile.signals
    .filter((s) => s.at <= now && now - s.at <= 7 * 86400_000)
    .sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  const patterns: ProfilePattern[] = [];
  const reads = recent.filter(
    (s) =>
      s.kind === "project_read" ||
      (s.kind === "project_section_read" && s.subject.endsWith("|outcomes")),
  );
  for (const term of catalog.terms.filter((t) => t.facet === "buyerNeeds")) {
    const byProject = new Map<string, ProfileSignal>();
    for (const signal of reads) {
      const id = signal.subject.split("|")[0];
      if (
        catalog.projects.some((p) => p.id === id && p.terms.includes(term.id))
      )
        byProject.set(id, signal);
    }
    if (byProject.size >= 2)
      patterns.push({
        kind: "shared_need",
        id: `need:${term.id}`,
        subject: term.id,
        projectIds: [...byProject.keys()],
        evidence: [...byProject.values()],
      });
  }
  for (const proof of ["github", "live"] as const) {
    const byProject = new Map<string, ProfileSignal>();
    for (const s of recent.filter(
      (s) => s.kind === "proof_opened" && s.subject.endsWith(`|${proof}`),
    ))
      byProject.set(s.subject.split("|")[0], s);
    if (byProject.size >= 2)
      patterns.push({
        kind: proof === "github" ? "implementation_proof" : "live_proof",
        id: `proof:${proof}`,
        projectIds: [...byProject.keys()],
        evidence: [...byProject.values()],
      });
  }
  for (const s of recent.filter((s) => s.kind === "project_returned")) {
    if (!patterns.some((p) => p.id === `return:${s.subject}`))
      patterns.push({
        kind: "returning_project",
        id: `return:${s.subject}`,
        projectIds: [s.subject],
        evidence: [s],
      });
  }
  const lenses = recent.filter((s) => s.kind === "explorer_lens_selected");
  if (lenses.length) {
    const last = lenses[lenses.length - 1];
    patterns.push({
      kind: "explorer_perspective",
      id: "explorer",
      subject: last.subject,
      projectIds: [],
      evidence: [last],
    });
  }
  // Only the ordered sequence within one 30-minute journey supports this hypothesis.
  for (const enquiry of recent.filter(
    (s) => s.kind === "enquiry_started" || s.kind === "enquiry_submitted",
  )) {
    const collaboration = recent
      .slice()
      .reverse()
      .find(
        (s) =>
          (s.kind === "service_collaboration_viewed" ||
            (s.kind === "service_section_read" &&
              s.subject.endsWith("|collaboration"))) &&
          s.at > enquiry.at - 1800_000 &&
          s.at < enquiry.at,
      );
    const caseStudy =
      collaboration &&
      recent
        .slice()
        .reverse()
        .find(
          (s) =>
            s.kind === "case_study_viewed" &&
            s.at >= enquiry.at - 1800_000 &&
            s.at < collaboration.at,
        );
    if (caseStudy && collaboration) {
      patterns.push({
        kind: "engagement_consideration",
        id: "engagement",
        projectIds: [caseStudy.subject],
        evidence: [caseStudy, collaboration, enquiry],
      });
      break;
    }
  }
  return patterns;
}
