import {
  EXTRA_SIGNAL_WEIGHTS,
  extraProfileSubjectTerms,
  validExtraProfileSubject,
  isProjectChoiceKind,
  applyProjectChoice,
  EMPTY_PROJECT_CHOICE,
  profilePatterns,
  isReturningProfileProject,
  type ProjectChoice,
} from "./visitorProfileSignals";
export {
  profileSectionKind,
  profilePatterns,
  isReturningProfileProject,
  PROFILE_SECTIONS,
} from "./visitorProfileSignals";
export type {
  ProfileSection,
  ProfilePattern,
  ProjectChoice,
} from "./visitorProfileSignals";
/** Scores are transparent v1 heuristics, not probabilities or identified people. */
export const PROFILE_VERSION = 1;
export const PROFILE_RULE_VERSION = 2;
export const PROFILE_LIFETIME_MS = 30 * 86400_000;
export const PROFILE_STORAGE_KEY = "fuerst-one:visitor-profile:v1";
export const PROFILE_FACETS = [
  "buyerNeeds",
  "capabilities",
  "methods",
  "industries",
  "productTypes",
  "tools",
  "stages",
] as const;
export type ProfileFacet = (typeof PROFILE_FACETS)[number];
export type ProfileTerm = { id: string; facet: ProfileFacet; value: string };
export type ProfileProject = {
  id: string;
  name: string;
  href: string;
  terms: string[];
};
export type ProfileCatalog = {
  terms: ProfileTerm[];
  projects: ProfileProject[];
};
export const SIGNAL_WEIGHTS = {
  ...EXTRA_SIGNAL_WEIGHTS,
  project_opened: 2,
  project_read: 1,
  filter_selected: 6,
  service_viewed: 3,
  enquiry_started: 0,
  enquiry_submitted: 0,
  recommendation_shown: 0,
  recommendation_opened: 0,
  preference_changed: 0,
} as const;
export type ProfileSignalKind = keyof typeof SIGNAL_WEIGHTS;
export type ProfilePreference = "exclude" | "interested" | "priority";
export type ProfileSignal = {
  id: string;
  kind: ProfileSignalKind;
  subject: string;
  at: number;
  preference?: ProfilePreference | "auto";
  inferredScore?: number;
  basis?: Partial<Record<ProfileSignalKind, number>>;
  previous?: ProfilePreference | "auto";
};
export type VisitorProfile = {
  version: 1;
  startedAt: number;
  updatedAt: number;
  signals: ProfileSignal[];
  preferences: Record<string, ProfilePreference>;
  projectChoices?: Record<string, ProjectChoice>;
};
export type ProfileInterest = ProfileTerm & {
  score: number;
  inferredScore: number;
  preference?: ProfilePreference;
  evidence: {
    signal: ProfileSignal;
    points: number;
    pattern?: "shared_need";
  }[];
};
const HALF_LIFE = 7 * 86400_000;
const WINDOW = 30 * 60_000;
const choices = ["exclude", "interested", "priority"];
const services: Record<string, string[]> = {
  "product-interfaces": [
    "Improve a complex interface",
    "Validate a product idea",
  ],
  "ai-automation": ["Automate repetitive work", "Integrate business systems"],
  "ai-products": ["Add AI capabilities"],
};
const own = (value: object, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

export function emptyVisitorProfile(now: number): VisitorProfile {
  return {
    version: 1,
    startedAt: now,
    updatedAt: now,
    signals: [],
    preferences: {},
  };
}

/** Only a visitor clicking a category link calls this; loading a URL is not a choice. */
export function profileLinkSignals(
  href: string,
  origin: string,
  catalog: ProfileCatalog,
): { kind: "filter_selected"; subject: string }[] {
  const url = new URL(href, origin);
  if (url.origin !== origin || !/^\/(en|de)\/projects$/.test(url.pathname))
    return [];
  return PROFILE_FACETS.flatMap((facet) =>
    [
      ...new Set(
        url.searchParams.getAll(facet).flatMap((value) => value.split(",")),
      ),
    ]
      .map((value) => `${facet}:${value}`)
      .filter((id) => catalog.terms.some((term) => term.id === id))
      .map((subject) => ({ kind: "filter_selected" as const, subject })),
  );
}

/** A remembered project dialog is relevant only on the listing that owns it. */
export function profilePageSignal(
  pathname: string,
  focusedId: string | null,
  catalog: ProfileCatalog,
): { kind: ProfileSignalKind; subject: string } | null {
  const path = pathname.replace(/^\/(en|de)(?=\/|$)/, "/en");
  const project = catalog.projects.find(
    (p) => path === p.href || path === `${p.href}/case-study`,
  );
  if (project)
    return {
      kind: path.endsWith("/case-study")
        ? "case_study_viewed"
        : "project_details_viewed",
      subject: project.id,
    };
  if (
    path === "/en/projects" &&
    focusedId &&
    catalog.projects.some((p) => p.id === focusedId)
  )
    return { kind: "project_opened", subject: focusedId };
  const service = path.match(
    /^\/en\/services\/(product-interfaces|ai-automation|ai-products)(?:\/|$)/,
  )?.[1];
  if (!service) return null;
  const suffix = path.split("/").slice(4).filter(Boolean).join("/");
  const kind =
    suffix === "collaboration"
      ? "service_collaboration_viewed"
      : (service === "product-interfaces" && suffix === "review") ||
          (service === "ai-automation" && suffix === "assessment")
        ? "service_offer_viewed"
        : !suffix
          ? "service_viewed"
          : null;
  return kind ? { kind, subject: service } : null;
}

export function profileSubjectTerms(
  kind: ProfileSignalKind,
  subject: string,
  catalog: ProfileCatalog,
): ProfileTerm[] {
  const extra = extraProfileSubjectTerms(kind, subject, catalog);
  if (extra) return extra;
  if (
    [
      "gallery_explored",
      "proof_opened",
      "project_returned",
      "explorer_lens_selected",
      "explorer_cluster_selected",
      "service_section_read",
    ].includes(kind) ||
    isProjectChoiceKind(kind)
  )
    return [];
  const ids =
    kind === "filter_selected" || kind === "preference_changed"
      ? [subject]
      : [
            "service_viewed",
            "service_offer_viewed",
            "service_collaboration_viewed",
          ].includes(kind)
        ? (services[subject] ?? []).map((value) => `buyerNeeds:${value}`)
        : (catalog.projects.find((p) => p.id === subject)?.terms ?? []);
  return catalog.terms.filter((t) => ids.includes(t.id));
}

export function validProfileSubject(
  kind: string,
  subject: string,
  catalog: ProfileCatalog,
): boolean {
  if (!own(SIGNAL_WEIGHTS, kind)) return false;
  if (kind === "filter_selected" || kind === "preference_changed")
    return catalog.terms.some((t) => t.id === subject);
  const extra = validExtraProfileSubject(kind, subject, catalog);
  if (extra !== undefined) return extra;
  if (
    [
      "service_viewed",
      "service_offer_viewed",
      "service_collaboration_viewed",
    ].includes(kind)
  )
    return own(services, subject);
  if (kind === "enquiry_started" || kind === "enquiry_submitted")
    return subject === "enquiry";
  return catalog.projects.some((p) => p.id === subject);
}

export function recordProfileSignal(
  profile: VisitorProfile,
  input: { kind: ProfileSignalKind; subject: string },
  catalog: ProfileCatalog,
  now: number,
): VisitorProfile {
  if (
    !validProfileSubject(input.kind, input.subject, catalog) ||
    input.kind === "preference_changed" ||
    now < profile.startedAt ||
    now >= profile.startedAt + PROFILE_LIFETIME_MS ||
    (!isProjectChoiceKind(input.kind) &&
      input.kind !== "explorer_lens_selected" &&
      profile.signals.some(
        (s) =>
          s.kind === input.kind &&
          s.subject === input.subject &&
          now - s.at < WINDOW,
      ))
  )
    return profile;
  if (
    input.kind === "explorer_lens_selected" &&
    [...profile.signals]
      .reverse()
      .find((s) => s.kind === "explorer_lens_selected")?.subject ===
      input.subject
  )
    return profile;
  const before =
    profile.projectChoices?.[input.subject] ?? EMPTY_PROJECT_CHOICE;
  const after = applyProjectChoice(before, input.kind);
  if (
    isProjectChoiceKind(input.kind) &&
    before.saved === after.saved &&
    before.feedback === after.feedback
  )
    return profile;
  if (
    input.kind === "project_returned" &&
    !isReturningProfileProject(profile, input.subject, now)
  )
    return profile;
  return {
    ...profile,
    ...(isProjectChoiceKind(input.kind)
      ? {
          projectChoices: { ...profile.projectChoices, [input.subject]: after },
        }
      : {}),
    updatedAt: now,
    signals: [
      ...profile.signals,
      { ...input, id: crypto.randomUUID(), at: now },
    ].slice(-240),
  };
}

export function profileInterests(
  profile: VisitorProfile,
  catalog: ProfileCatalog,
  now: number,
): ProfileInterest[] {
  const rows = new Map<string, ProfileInterest>();
  // A navigation chain contributes its strongest depth once per project/window.
  const selected: ProfileSignal[] = [];
  const depth = new Map<string, { at: number; index: number }>();
  for (const signal of [...profile.signals].sort(
    (a, b) => a.at - b.at || a.id.localeCompare(b.id),
  )) {
    if (signal.at > now) continue;
    if (
      [
        "project_opened",
        "project_details_viewed",
        "case_study_viewed",
      ].includes(signal.kind)
    ) {
      const prior = depth.get(signal.subject);
      if (prior && signal.at - prior.at < WINDOW) {
        if (
          SIGNAL_WEIGHTS[signal.kind] >
          SIGNAL_WEIGHTS[selected[prior.index].kind]
        )
          selected[prior.index] = signal;
        continue;
      }
      depth.set(signal.subject, { at: signal.at, index: selected.length });
    }
    selected.push(signal);
  }
  for (const signal of selected) {
    const weight = SIGNAL_WEIGHTS[signal.kind];
    if (!weight || signal.at > now) continue;
    const terms = profileSubjectTerms(signal.kind, signal.subject, catalog);
    for (const term of terms) {
      const siblings = terms.filter((t) => t.facet === term.facet).length;
      const points =
        (weight / siblings) * 2 ** (-(now - signal.at) / HALF_LIFE);
      const row = rows.get(term.id) ?? {
        ...term,
        score: 0,
        inferredScore: 0,
        evidence: [],
      };
      row.inferredScore = Math.min(12, row.inferredScore + points);
      row.evidence.push({ signal, points });
      rows.set(term.id, row);
    }
  }
  for (const pattern of profilePatterns(profile, catalog, now)) {
    if (pattern.kind !== "shared_need" || !pattern.subject) continue;
    const row = rows.get(pattern.subject);
    if (!row) continue;
    const signal = pattern.evidence[pattern.evidence.length - 1];
    const points = 2 * 2 ** (-(now - signal.at) / HALF_LIFE);
    row.inferredScore = Math.min(12, row.inferredScore + points);
    row.evidence.push({ signal, points, pattern: "shared_need" });
  }
  for (const [id, preference] of Object.entries(profile.preferences)) {
    const term = catalog.terms.find((t) => t.id === id);
    if (!term) continue;
    const row = rows.get(id) ?? {
      ...term,
      score: 0,
      inferredScore: 0,
      evidence: [],
    };
    row.preference = preference;
    rows.set(id, row);
  }
  return [...rows.values()]
    .map((row) => ({
      ...row,
      score:
        row.preference === "exclude"
          ? 0
          : row.preference === "priority"
            ? 12
            : row.preference === "interested"
              ? 6
              : row.inferredScore,
    }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

export function setProfilePreference(
  profile: VisitorProfile,
  id: string,
  choice: ProfilePreference | "auto",
  catalog: ProfileCatalog,
  now: number,
): VisitorProfile {
  if (
    now < profile.startedAt ||
    now >= profile.startedAt + PROFILE_LIFETIME_MS ||
    !catalog.terms.some((t) => t.id === id) ||
    ![...choices, "auto"].includes(choice) ||
    (profile.preferences[id] ?? "auto") === choice
  )
    return profile;
  const interest = profileInterests(profile, catalog, now).find(
    (t) => t.id === id,
  );
  const inferredScore = interest?.inferredScore ?? 0;
  const basis: Partial<Record<ProfileSignalKind, number>> = {};
  for (const { signal, points } of interest?.evidence ?? [])
    basis[signal.kind] = (basis[signal.kind] ?? 0) + points;
  const previous = profile.preferences[id] ?? "auto";
  const preferences = { ...profile.preferences };
  if (choice === "auto") delete preferences[id];
  else preferences[id] = choice;
  return {
    ...profile,
    preferences,
    updatedAt: now,
    signals: [
      ...profile.signals,
      {
        id: crypto.randomUUID(),
        kind: "preference_changed" as const,
        subject: id,
        at: now,
        preference: choice,
        inferredScore,
        previous,
        basis,
      },
    ].slice(-240),
  };
}

export function recommendProfileProjects(
  profile: VisitorProfile,
  catalog: ProfileCatalog,
  now: number,
) {
  const interests = profileInterests(profile, catalog, now);
  const active = interests.filter((t) => t.score > 0);
  const facets = [...new Set(active.map((t) => t.facet))];
  const choices = profile.projectChoices ?? {};
  const affinity = (id: string) =>
    Math.min(
      3,
      profile.signals
        .filter(
          (s) =>
            s.at <= now &&
            (s.subject === id || s.subject.startsWith(`${id}|`)) &&
            ["gallery_explored", "proof_opened", "project_returned"].includes(
              s.kind,
            ),
        )
        .reduce((sum, s) => sum + 2 ** (-(now - s.at) / HALF_LIFE), 0),
    );
  return catalog.projects
    .flatMap((project) => {
      if (
        interests.some(
          (t) => t.preference === "exclude" && project.terms.includes(t.id),
        )
      )
        return [];
      const reasons = active.filter((t) => project.terms.includes(t.id));
      // One strong match in a dimension is sufficient; many tags cannot pad rank.
      const topical =
        facets.reduce(
          (sum, facet) =>
            sum +
            Math.max(
              0,
              ...reasons.filter((t) => t.facet === facet).map((t) => t.score),
            ),
          0,
        ) / Math.max(1, facets.length);
      const similarity = (otherId: string) => {
        const other = catalog.projects.find((p) => p.id === otherId);
        if (!other) return 0;
        return (
          project.terms.filter((id) => other.terms.includes(id)).length /
          Math.max(1, new Set([...project.terms, ...other.terms]).size)
        );
      };
      let feedback = 0;
      for (const [id, choice] of Object.entries(choices)) {
        const related = similarity(id);
        feedback += related * (choice.feedback === "more" ? 3 : 0);
        if (choice.saved) feedback += related;
      }
      const score = Math.max(0, topical + affinity(project.id) + feedback);
      return score > 0
        ? [
            {
              project,
              score,
              reasons: reasons.slice(0, 3),
              affinity: affinity(project.id),
              feedback: feedback,
            },
          ]
        : [];
    })
    .sort(
      (a, b) => b.score - a.score || a.project.id.localeCompare(b.project.id),
    );
}

export function restoreVisitorProfile(
  value: unknown,
  catalog: ProfileCatalog,
  now: number,
): VisitorProfile | null {
  if (
    !object(value) ||
    value.version !== 1 ||
    typeof value.startedAt !== "number" ||
    !Number.isFinite(value.startedAt) ||
    value.startedAt > now ||
    now - value.startedAt >= PROFILE_LIFETIME_MS ||
    typeof value.updatedAt !== "number" ||
    !Number.isFinite(value.updatedAt) ||
    value.updatedAt < value.startedAt ||
    value.updatedAt > now ||
    !Array.isArray(value.signals) ||
    value.signals.length > 240 ||
    !object(value.preferences)
  )
    return null;
  const signals: ProfileSignal[] = [];
  for (const s of value.signals) {
    // Retired negative feedback must not invalidate an otherwise remembered profile.
    if (object(s) && s.kind === "project_less") continue;
    if (
      !object(s) ||
      typeof s.id !== "string" ||
      !UUID.test(s.id) ||
      typeof s.at !== "number" ||
      !Number.isFinite(s.at) ||
      s.at < value.startedAt ||
      s.at > now ||
      typeof s.kind !== "string" ||
      typeof s.subject !== "string" ||
      !own(SIGNAL_WEIGHTS, s.kind)
    )
      return null;
    if (!validProfileSubject(s.kind, s.subject, catalog)) continue;
    if (!validCorrection(s)) return null;
    signals.push({
      id: s.id,
      kind: s.kind as ProfileSignalKind,
      subject: s.subject,
      at: s.at,
      ...(s.kind === "preference_changed"
        ? {
            preference: s.preference as ProfilePreference | "auto",
            previous: s.previous as ProfilePreference | "auto",
            inferredScore: s.inferredScore as number,
            basis: s.basis as ProfileSignal["basis"],
          }
        : {}),
    });
  }
  const preferences: Record<string, ProfilePreference> = {};
  for (const [id, choice] of Object.entries(value.preferences)) {
    if (typeof choice !== "string" || !choices.includes(choice)) return null;
    if (catalog.terms.some((t) => t.id === id))
      preferences[id] = choice as ProfilePreference;
  }
  const projectChoices: Record<string, ProjectChoice> = {};
  if (value.projectChoices !== undefined) {
    if (!object(value.projectChoices)) return null;
    for (const [id, choice] of Object.entries(value.projectChoices)) {
      if (
        !object(choice) ||
        typeof choice.saved !== "boolean" ||
        !["more", "less", "auto"].includes(String(choice.feedback))
      )
        return null;
      if (catalog.projects.some((p) => p.id === id))
        projectChoices[id] = {
          saved: choice.saved,
          feedback:
            choice.feedback === "less"
              ? "auto"
              : (choice.feedback as ProjectChoice["feedback"]),
        };
    }
  }
  return {
    version: 1,
    ...(value.projectChoices !== undefined ? { projectChoices } : {}),
    startedAt: value.startedAt,
    updatedAt: value.updatedAt,
    signals,
    preferences,
  };
}

export function isActiveProfileReading(
  state: { visible: boolean; focused: boolean; lastInteraction: number },
  now: number,
) {
  return (
    state.visible &&
    state.focused &&
    now >= state.lastInteraction &&
    now - state.lastInteraction < 60_000
  );
}

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const validProfileToken = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
function validCorrection(event: Record<string, unknown>) {
  if (event.kind !== "preference_changed")
    return (
      event.preference === undefined &&
      event.inferredScore === undefined &&
      event.previous === undefined &&
      event.basis === undefined
    );
  if (
    !object(event.basis) ||
    Object.entries(event.basis).some(
      ([key, points]) =>
        !own(SIGNAL_WEIGHTS, key) ||
        SIGNAL_WEIGHTS[key as ProfileSignalKind] === 0 ||
        typeof points !== "number" ||
        !Number.isFinite(points) ||
        points < 0 ||
        points > 1440,
    )
  )
    return false;
  return (
    typeof event.preference === "string" &&
    [...choices, "auto"].includes(event.preference) &&
    typeof event.previous === "string" &&
    [...choices, "auto"].includes(event.previous) &&
    typeof event.inferredScore === "number" &&
    Number.isFinite(event.inferredScore) &&
    event.inferredScore >= 0 &&
    event.inferredScore <= 12
  );
}
export type SharedProfileEvent = Omit<ProfileSignal, "at">;
export function parseProfileEventBatch(
  value: unknown,
  catalog: ProfileCatalog,
  now = Date.now(),
): {
  version: 1;
  consentAt: number;
  token: string;
  events: SharedProfileEvent[];
} | null {
  if (
    !object(value) ||
    value.version !== 1 ||
    !validProfileToken(value.token) ||
    typeof value.consentAt !== "number" ||
    !Number.isFinite(value.consentAt) ||
    value.consentAt > now ||
    now - value.consentAt >= PROFILE_LIFETIME_MS ||
    Object.keys(value).some(
      (k) => !["version", "consentAt", "token", "events"].includes(k),
    ) ||
    !Array.isArray(value.events) ||
    value.events.length < 1 ||
    value.events.length > 20
  )
    return null;
  const events: SharedProfileEvent[] = [];
  for (const event of value.events) {
    if (
      !object(event) ||
      typeof event.id !== "string" ||
      !UUID.test(event.id) ||
      typeof event.kind !== "string" ||
      typeof event.subject !== "string" ||
      !validProfileSubject(event.kind, event.subject, catalog) ||
      Object.keys(event).some(
        (k) =>
          ![
            "id",
            "kind",
            "subject",
            "preference",
            "inferredScore",
            "previous",
            "basis",
          ].includes(k),
      ) ||
      !validCorrection(event)
    )
      return null;
    events.push({
      id: event.id,
      kind: event.kind as ProfileSignalKind,
      subject: event.subject,
      ...(event.kind === "preference_changed"
        ? {
            preference: event.preference as ProfilePreference | "auto",
            previous: event.previous as ProfilePreference | "auto",
            inferredScore: event.inferredScore as number,
            basis: event.basis as ProfileSignal["basis"],
          }
        : {}),
    });
  }
  return { version: 1, consentAt: value.consentAt, token: value.token, events };
}

/** One tick represents one second; hidden, occluded, unfocused or idle content adds none. */
export function advanceProfileReading(
  seconds: number,
  state: {
    visible: boolean;
    focused: boolean;
    lastInteraction: number;
    inView: boolean;
    covered: boolean;
  },
  now: number,
): number {
  return Math.min(
    15,
    seconds +
      (state.inView && !state.covered && isActiveProfileReading(state, now)
        ? 1
        : 0),
  );
}
