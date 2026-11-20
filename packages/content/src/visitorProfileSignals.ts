import type {
  ProfileCatalog,
  ProfileFacet,
  ProfileTerm,
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
  project_card_clicked: 2,
  // A region of the project page earns what the page itself would.
  project_region_viewed: 3,
  rate_revealed: 0,
} as const;
export const PROFILE_STRENGTHS = [0.5, 0.75, 1] as const;
export type ProfileStrength = (typeof PROFILE_STRENGTHS)[number];
/** Signals whose credit depends on how the visitor arrived or how long they looked. */
export const PROFILE_STRENGTH_KINDS = [
  "project_card_clicked",
  "project_opened",
  "project_details_viewed",
  "case_study_viewed",
  "project_region_viewed",
  "service_viewed",
  "service_offer_viewed",
  "service_collaboration_viewed",
] as const;
export function validProfileStrength(kind: string, strength: unknown) {
  return (
    (PROFILE_STRENGTH_KINDS as readonly string[]).includes(kind) &&
    (PROFILE_STRENGTHS as readonly unknown[]).includes(strength)
  );
}
/** Owner's marks, not validated on this site: a label needs little more than the way to it. */
export const PROFILE_CLICK_HALF_MS = 500;
export const PROFILE_CLICK_FULL_MS = 3000;
/** From the bounce evidence in the intent model design. */
export const PROFILE_STAY_MS = 10_000;
export const PROFILE_REGION_VIEW_SECONDS = 3;
export type ProfileClickLevel = "none" | "half" | "full";
/** How considered a click was, from how long its card was in view before it. */
export function profileClickLevel(
  msInView: number,
  exempt: boolean,
): ProfileClickLevel {
  if (exempt || msInView >= PROFILE_CLICK_FULL_MS) return "full";
  return msInView >= PROFILE_CLICK_HALF_MS ? "half" : "none";
}
/** A hasty click only half-discounts the page it leads to; an unseen arrival counts as hasty. */
export function profileArrivalStrength(
  level: ProfileClickLevel | "link" | null,
): ProfileStrength {
  if (level === "full" || level === "link") return 1;
  return level === "half" ? 0.75 : 0.5;
}
/** Cards show this many leading buyer needs, and a card click credits the same ones. */
export const CARD_BUYER_NEED_COUNT = 2;
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
/** Where the Malt rate can be revealed; the page is the whole subject. */
export const PROFILE_RATE_PLACES = ["home", "hire"] as const;
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
  if (kind === "project_card_clicked")
    return profileRegionTerms(`card:${subject}`, catalog) ?? [];
  if (kind === "project_region_viewed")
    return profileRegionTerms(`project:${subject}`, catalog) ?? [];
  // A stayed page or preview credits only what its header shows; its other
  // parts are credited as regions once they have been in view.
  if (kind === "project_opened") return [];
  if (kind === "project_details_viewed") {
    const project = catalog.projects.find((p) => p.id === subject);
    return catalog.terms.filter(
      (t) => t.facet === "industries" && project?.terms.includes(t.id),
    );
  }
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
export const PROFILE_PROJECT_REGIONS = ["needs", "details"] as const;
const projectRegionFacets: Record<
  (typeof PROFILE_PROJECT_REGIONS)[number],
  readonly ProfileFacet[]
> = {
  needs: ["buyerNeeds"],
  details: ["industries", "productTypes", "capabilities", "methods", "tools"],
};

/** A region tag names a place on the page; this says what that place displays. */
export function profileRegionTerms(
  region: string,
  catalog: ProfileCatalog,
): ProfileTerm[] | null {
  const card = /^card:([^|]+)$/.exec(region);
  const page = /^project:([^|]+)\|([^|]+)$/.exec(region);
  const project = catalog.projects.find((p) => p.id === (card ?? page)?.[1]);
  if (!project) return null;
  const facetOf = (id: string) => catalog.terms.find((t) => t.id === id)?.facet;
  if (card) {
    const leadingNeeds = project.terms
      .filter((id) => facetOf(id) === "buyerNeeds")
      .slice(0, CARD_BUYER_NEED_COUNT);
    return catalog.terms.filter(
      (t) =>
        leadingNeeds.includes(t.id) ||
        (project.terms.includes(t.id) &&
          (t.facet === "industries" || t.facet === "productTypes")),
    );
  }
  const kind = page?.[2] as (typeof PROFILE_PROJECT_REGIONS)[number];
  if (!PROFILE_PROJECT_REGIONS.includes(kind)) return null;
  return catalog.terms.filter(
    (t) =>
      project.terms.includes(t.id) &&
      projectRegionFacets[kind].includes(t.facet),
  );
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
  if (kind === "project_card_clicked") return project(subject);
  if (kind === "rate_revealed")
    return (PROFILE_RATE_PLACES as readonly string[]).includes(subject);
  if (kind === "project_region_viewed")
    return profileRegionTerms(`project:${subject}`, catalog) !== null;
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
