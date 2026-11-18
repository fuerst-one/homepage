/** Scores are transparent v1 heuristics, not probabilities or identified people. */
export const PROFILE_VERSION = 1;
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
};
export type ProfileInterest = ProfileTerm & {
  score: number;
  inferredScore: number;
  preference?: ProfilePreference;
  evidence: { signal: ProfileSignal; points: number }[];
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
  if (project) return { kind: "project_opened", subject: project.id };
  if (
    path === "/en/projects" &&
    focusedId &&
    catalog.projects.some((p) => p.id === focusedId)
  )
    return { kind: "project_opened", subject: focusedId };
  const service = path.match(
    /^\/en\/services\/(product-interfaces|ai-automation|ai-products)(?:\/|$)/,
  )?.[1];
  return service ? { kind: "service_viewed", subject: service } : null;
}

export function profileSubjectTerms(
  kind: ProfileSignalKind,
  subject: string,
  catalog: ProfileCatalog,
): ProfileTerm[] {
  const ids =
    kind === "filter_selected" || kind === "preference_changed"
      ? [subject]
      : kind === "service_viewed"
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
  if (kind === "service_viewed") return own(services, subject);
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
    profile.signals.some(
      (s) =>
        s.kind === input.kind &&
        s.subject === input.subject &&
        now - s.at < WINDOW,
    )
  )
    return profile;
  return {
    ...profile,
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
  for (const signal of profile.signals) {
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
  if (!facets.length) return [];
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
      const score =
        facets.reduce(
          (sum, facet) =>
            sum +
            Math.max(
              0,
              ...reasons.filter((t) => t.facet === facet).map((t) => t.score),
            ),
          0,
        ) / facets.length;
      return score > 0
        ? [{ project, score, reasons: reasons.slice(0, 3) }]
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
  return {
    version: 1,
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
