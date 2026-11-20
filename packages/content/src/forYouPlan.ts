import {
  ENQUIRY_INTENTS,
  enquiryContext,
  type EnquiryContext,
  type EnquiryIntent,
} from "@homepage/content/enquiry";
import { isLocale, type Locale } from "@homepage/content/i18n";

export const FOR_YOU_PLAN_VERSION = 1;
export const FOR_YOU_MIN_SECTIONS = 4;
export const FOR_YOU_MAX_SECTIONS = 7;
export const FOR_YOU_SECTION_TYPES = [
  "hero",
  "bridge",
  "proofGrid",
  "spotlight",
  "secondNeed",
  "approach",
  "offer",
  "questions",
  "closing",
] as const;
export type ForYouSectionType = (typeof FOR_YOU_SECTION_TYPES)[number];

/** Character limits keep generated copy within what the section layouts hold. */
export const FOR_YOU_TEXT_LIMITS = {
  headline: 90,
  heading: 90,
  lead: 320,
  text: 480,
  fit: 180,
  story: 320,
  stepTitle: 60,
  stepText: 240,
} as const;
type TextLimit = keyof typeof FOR_YOU_TEXT_LIMITS;

export const FOR_YOU_PROOF_PROJECTS = { min: 2, max: 4 } as const;
export const FOR_YOU_BRIDGE_PROJECTS = { min: 1, max: 3 } as const;
export const FOR_YOU_SECOND_NEED_PROJECTS = { min: 1, max: 2 } as const;
export const FOR_YOU_APPROACH_STEPS = 3;
export const FOR_YOU_FAQ_PICKS = { min: 2, max: 3 } as const;

export type ForYouService = NonNullable<EnquiryContext["service"]>;
const SERVICES: readonly ForYouService[] = [
  "product-interfaces",
  "ai-automation",
  "ai-products",
];
export const FOR_YOU_STARTING_OFFERS = [
  "product-interfaces",
  "ai-automation",
] as const;
export type ForYouStartingOffer = (typeof FOR_YOU_STARTING_OFFERS)[number];
type EnquiryOffer = NonNullable<EnquiryContext["offer"]>;

export type ForYouAction =
  | {
      kind: "enquiry";
      service: ForYouService;
      offer?: EnquiryOffer;
      intent: EnquiryIntent;
    }
  | { kind: "offer"; service: ForYouStartingOffer }
  | { kind: "hire" }
  | { kind: "email" }
  | { kind: "explorer" }
  | { kind: "projects"; need: string };

export type ForYouProjectNote = { projectId: string; fit: string };
export type ForYouSection =
  | { type: "hero"; headline: string; lead: string; action: string }
  | { type: "bridge"; heading: string; text: string; projectIds: string[] }
  | { type: "proofGrid"; heading: string; items: ForYouProjectNote[] }
  | {
      type: "spotlight";
      projectId: string;
      problem: string;
      built: string;
      result: string;
      image: string;
    }
  | {
      type: "secondNeed";
      need: string;
      heading: string;
      text: string;
      projectIds: string[];
    }
  | {
      type: "approach";
      heading: string;
      steps: { title: string; text: string }[];
    }
  | { type: "offer"; offer: ForYouStartingOffer; text: string }
  | { type: "questions"; faqIds: string[] }
  | { type: "closing"; heading: string; text: string; action: string };

export type ForYouPlan = {
  version: typeof FOR_YOU_PLAN_VERSION;
  locale: Locale;
  sections: ForYouSection[];
};

/** What the site hands the model to pick from; every id in a plan must come from here. */
export type ForYouPlanContext = {
  projects: readonly {
    id: string;
    /** Opened projects are the bridge's material; unopened ones are the proof. */
    opened: boolean;
    images: readonly string[];
  }[];
  faqIds: readonly string[];
  /** Buyer needs a second-need section or a project filter may name. */
  needs: readonly string[];
};

export type ForYouSectionCheck =
  | { ok: true; section: ForYouSection }
  | { ok: false; type: string | null; reason: string };
export type ForYouDroppedSection = {
  index: number;
  type: string | null;
  reason: string;
};
export type ForYouPlanCheck =
  | { ok: true; plan: ForYouPlan; dropped: ForYouDroppedSection[] }
  | { ok: false; reason: string; dropped: ForYouDroppedSection[] };

export function forYouImageRef(projectId: string, number: number) {
  return `${projectId}#${number}`;
}
/** Image numbers are one-based positions in the project's published screenshots. */
export function parseForYouImageRef(ref: string) {
  const match = /^([A-Za-z0-9-]{1,100})#([1-9]\d{0,2})$/.exec(ref);
  return match ? { projectId: match[1], number: Number(match[2]) } : null;
}

export function forYouActionIds(needs: readonly string[]): string[] {
  const enquiries = SERVICES.flatMap((service) => {
    const offer = enquiryOffer(service);
    return ENQUIRY_INTENTS.flatMap((intent) => [
      `enquiry:${service}:${intent}`,
      ...(offer ? [`enquiry:${service}:${offer}:${intent}`] : []),
    ]);
  });
  return [
    ...enquiries,
    ...FOR_YOU_STARTING_OFFERS.map((service) => `offer:${service}`),
    "hire",
    "email",
    "explorer",
    ...[...new Set(needs)].map((need) => `projects:${need}`),
  ];
}

export function parseForYouAction(
  id: string,
  needs: readonly string[],
): ForYouAction | null {
  if (id === "hire" || id === "email" || id === "explorer") return { kind: id };
  if (id.startsWith("projects:")) {
    const need = id.slice("projects:".length);
    return needs.includes(need) ? { kind: "projects", need } : null;
  }
  const [kind, ...parts] = id.split(":");
  if (kind === "offer" && parts.length === 1)
    return isStartingOffer(parts[0])
      ? { kind: "offer", service: parts[0] }
      : null;
  if (kind !== "enquiry" || parts.length < 2 || parts.length > 3) return null;
  const [service, offer, intent] =
    parts.length === 2 ? [parts[0], undefined, parts[1]] : parts;
  if (!SERVICES.includes(service as ForYouService)) return null;
  if (!ENQUIRY_INTENTS.includes(intent as EnquiryIntent)) return null;
  if (offer !== undefined && enquiryOffer(service as ForYouService) !== offer)
    return null;
  return {
    kind: "enquiry",
    service: service as ForYouService,
    ...(offer ? { offer: offer as EnquiryOffer } : {}),
    intent: intent as EnquiryIntent,
  };
}

/** Check one finished section, as it arrives, against the sections accepted before it. */
export function checkForYouSection(
  input: unknown,
  context: ForYouPlanContext,
  accepted: readonly ForYouSection[],
): ForYouSectionCheck {
  if (!isRecord(input))
    return { ok: false, type: null, reason: "not an object" };
  const type = typeof input.type === "string" ? input.type : null;
  const fail = (reason: string): ForYouSectionCheck => ({
    ok: false,
    type,
    reason,
  });
  if (!isSectionType(type)) return fail("unknown section type");
  if (accepted.length >= FOR_YOU_MAX_SECTIONS)
    return fail(`over the limit of ${FOR_YOU_MAX_SECTIONS} sections`);
  if (accepted.some((section) => section.type === type))
    return fail(`a ${type} section may appear only once`);
  if (type === "hero" && accepted.length)
    return fail("a hero may only be the first section");
  const problem = sectionProblem(type, input, context);
  return problem
    ? fail(problem)
    : { ok: true, section: input as ForYouSection };
}

/** Check a whole plan: invalid sections are dropped, the rest stays valid. */
export function validateForYouPlan(
  input: unknown,
  context: ForYouPlanContext,
): ForYouPlanCheck {
  if (!isRecord(input))
    return { ok: false, reason: "not an object", dropped: [] };
  if (input.version !== FOR_YOU_PLAN_VERSION)
    return { ok: false, reason: "unknown plan version", dropped: [] };
  if (typeof input.locale !== "string" || !isLocale(input.locale))
    return { ok: false, reason: "unknown language", dropped: [] };
  if (!Array.isArray(input.sections))
    return { ok: false, reason: "sections are not a list", dropped: [] };
  const extra = Object.keys(input).find(
    (key) => !["version", "locale", "sections"].includes(key),
  );
  if (extra)
    return { ok: false, reason: `unknown field ${extra}`, dropped: [] };
  const sections: ForYouSection[] = [];
  const dropped: ForYouDroppedSection[] = [];
  input.sections.forEach((raw, index) => {
    const result = checkForYouSection(raw, context, sections);
    if (result.ok) sections.push(result.section);
    else dropped.push({ index, type: result.type, reason: result.reason });
  });
  if (sections.length < FOR_YOU_MIN_SECTIONS)
    return {
      ok: false,
      reason: `fewer than four valid sections (${sections.length})`,
      dropped,
    };
  return {
    ok: true,
    plan: { version: FOR_YOU_PLAN_VERSION, locale: input.locale, sections },
    dropped,
  };
}

const SECTION_FIELDS: Record<ForYouSectionType, readonly string[]> = {
  hero: ["headline", "lead", "action"],
  bridge: ["heading", "text", "projectIds"],
  proofGrid: ["heading", "items"],
  spotlight: ["projectId", "problem", "built", "result", "image"],
  secondNeed: ["need", "heading", "text", "projectIds"],
  approach: ["heading", "steps"],
  offer: ["offer", "text"],
  questions: ["faqIds"],
  closing: ["heading", "text", "action"],
};

function sectionProblem(
  type: ForYouSectionType,
  section: Record<string, unknown>,
  context: ForYouPlanContext,
): string | null {
  const fields = Object.keys(section).filter((key) => key !== "type");
  const unknown = fields.find((key) => !SECTION_FIELDS[type].includes(key));
  if (unknown) return `unknown field ${unknown}`;
  const project = (id: unknown) =>
    context.projects.find((candidate) => candidate.id === id);
  const action = (field: string) =>
    typeof section[field] === "string" &&
    parseForYouAction(section[field], context.needs)
      ? null
      : `${field} is not an allowed call to action`;
  switch (type) {
    case "hero":
      return (
        text(section, "headline", "headline") ??
        text(section, "lead", "lead") ??
        action("action")
      );
    case "bridge":
      return (
        text(section, "heading", "heading") ??
        text(section, "text", "text") ??
        idList(
          section.projectIds,
          "projectIds",
          FOR_YOU_BRIDGE_PROJECTS,
          (id) => (project(id)?.opened ? null : "is not a viewed project"),
        )
      );
    case "proofGrid": {
      const heading = text(section, "heading", "heading");
      if (heading) return heading;
      const items = section.items;
      if (!Array.isArray(items) || !items.every(isRecord))
        return "items is not a list of projects";
      const bad = items.findIndex(
        (item) =>
          Object.keys(item).some(
            (key) => !["projectId", "fit"].includes(key),
          ) || text(item, "fit", "fit"),
      );
      if (bad >= 0) return `items[${bad}] needs a projectId and a fit sentence`;
      return idList(
        items.map((item) => item.projectId),
        "items",
        FOR_YOU_PROOF_PROJECTS,
        (id) => {
          const candidate = project(id);
          if (!candidate) return "is not a candidate project";
          return candidate.opened ? "was already opened" : null;
        },
      );
    }
    case "spotlight": {
      const candidate = project(section.projectId);
      if (!candidate) return "projectId is not a candidate project";
      return (
        text(section, "problem", "story") ??
        text(section, "built", "story") ??
        text(section, "result", "story") ??
        (typeof section.image === "string" &&
        candidate.images.includes(section.image)
          ? null
          : "image is not one of the project's images")
      );
    }
    case "secondNeed":
      if (!context.needs.includes(section.need as string))
        return "need is not a known buyer need";
      return (
        text(section, "heading", "heading") ??
        text(section, "text", "text") ??
        idList(
          section.projectIds,
          "projectIds",
          FOR_YOU_SECOND_NEED_PROJECTS,
          (id) => (project(id) ? null : "is not a candidate project"),
        )
      );
    case "approach": {
      const heading = text(section, "heading", "heading");
      if (heading) return heading;
      const steps = section.steps;
      if (!Array.isArray(steps) || steps.length !== FOR_YOU_APPROACH_STEPS)
        return `steps must hold ${FOR_YOU_APPROACH_STEPS} steps`;
      for (const [index, step] of steps.entries()) {
        if (
          !isRecord(step) ||
          Object.keys(step).some((key) => !["title", "text"].includes(key))
        )
          return `steps[${index}] needs a title and a text`;
        const problem =
          text(step, "title", "stepTitle") ?? text(step, "text", "stepText");
        if (problem) return `steps[${index}]: ${problem}`;
      }
      return null;
    }
    case "offer":
      return isStartingOffer(section.offer)
        ? text(section, "text", "fit")
        : "offer is not one of the starting offers";
    case "questions":
      return idList(section.faqIds, "faqIds", FOR_YOU_FAQ_PICKS, (id) =>
        context.faqIds.includes(id) ? null : "is not a known FAQ entry",
      );
    case "closing":
      return (
        text(section, "heading", "heading") ??
        text(section, "text", "text") ??
        action("action")
      );
  }
}

// The model never writes a link; a URL in copy would bypass the action allowlist.
const URL_IN_TEXT = /[a-z][a-z0-9+.-]*:\/\/|\bwww\.|\bmailto:/i;

function text(
  record: Record<string, unknown>,
  field: string,
  limit: TextLimit,
): string | null {
  const value = record[field];
  if (typeof value !== "string" || !value.trim()) return `${field} is empty`;
  if (value.length > FOR_YOU_TEXT_LIMITS[limit])
    return `${field} is longer than ${FOR_YOU_TEXT_LIMITS[limit]} characters`;
  if (URL_IN_TEXT.test(value)) return `${field} contains a URL`;
  return null;
}

function idList(
  value: unknown,
  field: string,
  count: { min: number; max: number },
  problem: (id: string) => string | null,
): string | null {
  if (!Array.isArray(value) || !value.every((id) => typeof id === "string"))
    return `${field} is not a list of ids`;
  if (value.length < count.min || value.length > count.max)
    return `${field} must hold ${count.min} to ${count.max} entries`;
  if (new Set(value).size !== value.length) return `${field} repeats an entry`;
  for (const id of value) {
    const reason = problem(id);
    if (reason) return `${field}: ${id} ${reason}`;
  }
  return null;
}

function enquiryOffer(service: ForYouService): EnquiryOffer | undefined {
  return (
    enquiryContext({ service, offer: "review" }).offer ??
    enquiryContext({ service, offer: "assessment" }).offer
  );
}
const isStartingOffer = (value: unknown): value is ForYouStartingOffer =>
  FOR_YOU_STARTING_OFFERS.includes(value as ForYouStartingOffer);
const isSectionType = (value: unknown): value is ForYouSectionType =>
  FOR_YOU_SECTION_TYPES.includes(value as ForYouSectionType);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));
