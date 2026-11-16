import { localizedPath, type Locale } from "@homepage/content/i18n";

export const ENQUIRY_INTENTS = [
  "prototype",
  "production",
  "improve",
  "team",
  "explore",
] as const;
export const ENQUIRY_MAX_BODY_BYTES = 100_000;
export type EnquiryIntent = (typeof ENQUIRY_INTENTS)[number];
export type EnquiryContext = {
  source?: "home" | "hire" | "service" | "project";
  projectId?: string;
  service?: "product-interfaces" | "ai-automation";
  offer?: "review" | "assessment";
};
export type Enquiry = {
  id: string;
  locale: Locale;
  intent: EnquiryIntent | "";
  situation: string;
  outcome: string;
  productUrl: string;
  timing: string;
  budget: string;
  capacity: string;
  duration: string;
  workplace: string;
  name: string;
  email: string;
  company: string;
  website: string;
  context: EnquiryContext;
};
export const emptyEnquiry = (locale: Locale): Enquiry => ({
  id: "",
  locale,
  intent: "",
  situation: "",
  outcome: "",
  productUrl: "",
  timing: "",
  budget: "",
  capacity: "",
  duration: "",
  workplace: "",
  name: "",
  email: "",
  company: "",
  website: "",
  context: {},
});
const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));
const isIntent = (value: unknown): value is EnquiryIntent =>
  ENQUIRY_INTENTS.includes(value as EnquiryIntent);
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function enquiryContext(value: unknown): EnquiryContext {
  if (!isRecord(value)) return {};
  const result: EnquiryContext = {};
  if (["home", "hire", "service", "project"].includes(String(value.source)))
    result.source = value.source as EnquiryContext["source"];
  if (
    typeof value.projectId === "string" &&
    /^[a-zA-Z0-9-]{1,100}$/.test(value.projectId)
  )
    result.projectId = value.projectId;
  if (
    value.service === "product-interfaces" ||
    value.service === "ai-automation"
  )
    result.service = value.service;
  if (
    (result.service === "product-interfaces" && value.offer === "review") ||
    (result.service === "ai-automation" && value.offer === "assessment")
  )
    result.offer = value.offer;
  return result;
}

/** Links carry selection identifiers, never the visitor's private brief. */
export function enquiryPath(
  context: EnquiryContext & { intent?: string },
  locale: Locale = "en",
) {
  const query = new URLSearchParams(enquiryContext(context));
  if (isIntent(context.intent)) query.set("intent", context.intent);
  return localizedPath(`/contact${query.size ? `?${query}` : ""}`, locale);
}

const limits: Record<string, number> = {
  situation: 4000,
  outcome: 4000,
  productUrl: 1000,
  timing: 250,
  budget: 250,
  capacity: 250,
  duration: 250,
  workplace: 250,
  name: 150,
  email: 254,
  company: 250,
  website: 0,
};
const validUrl = (value: string) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
};

export function validateStep(step: number, value: Enquiry): string[] {
  if (step === 0) return isIntent(value.intent) ? [] : ["intent"];
  if (step === 1)
    return !validUrl(value.productUrl.trim()) ? ["productUrl"] : [];
  if (step === 4)
    return [
      !value.name.trim() ? "name" : "",
      !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value.email.trim())
        ? "email"
        : "",
    ].filter(Boolean);
  return [];
}

/** Blank descriptions are allowed; the send CTA offers a chance to add them. */
export function missingProjectDetails(value: Enquiry) {
  return (["situation", "outcome"] as const).filter(
    (field) => !value[field].trim(),
  );
}

export function parseEnquiry(
  input: unknown,
): { ok: true; value: Enquiry } | { ok: false; fields: string[] } {
  if (!isRecord(input)) return { ok: false, fields: ["brief"] };
  const value = emptyEnquiry(input.locale === "de" ? "de" : "en");
  const fields: string[] = [];
  if (input.locale !== "en" && input.locale !== "de") fields.push("locale");
  if (typeof input.id !== "string" || !uuid.test(input.id)) fields.push("id");
  else value.id = input.id;
  if (isIntent(input.intent)) value.intent = input.intent;
  for (const [field, limit] of Object.entries(limits)) {
    const raw = input[field] ?? "";
    if (typeof raw !== "string" || raw.length > limit) {
      fields.push(field);
      continue;
    }
    (value as unknown as Record<string, unknown>)[field] = raw.trim();
  }
  value.context = enquiryContext(input.context);
  for (const step of [0, 1, 4]) fields.push(...validateStep(step, value));
  return fields.length
    ? { ok: false, fields: [...new Set(fields)] }
    : { ok: true, value: applyIntent(value, value.intent) };
}

/** Keep the persisted brief identical to the engagement details the visitor sees. */
export function applyIntent(
  value: Enquiry,
  intent: Enquiry["intent"],
): Enquiry {
  return {
    ...value,
    intent,
    ...(intent === "team"
      ? { budget: "" }
      : { capacity: "", duration: "", workplace: "" }),
  };
}

export function restoreEntry(
  saved: { value: Enquiry; step: number; entry?: string },
  locale: Locale,
  intent: Enquiry["intent"],
  context: EnquiryContext,
) {
  const entry = JSON.stringify({ intent, context });
  const changed = saved.entry !== entry && Boolean(intent);
  return {
    value: applyIntent(
      {
        ...saved.value,
        locale,
        context:
          Object.keys(context).length > 0
            ? enquiryContext(context)
            : saved.value.context,
      },
      changed ? intent : saved.value.intent,
    ),
    step: changed ? 1 : saved.step,
  };
}

export const ENQUIRY_DRAFT_KEY = "fuerst-enquiry-v1";
export function restoreDraft(
  raw: string | null,
  now = Date.now(),
): { value: Enquiry; step: number; entry?: string } | null {
  try {
    const saved: unknown = JSON.parse(raw ?? "null");
    if (
      !isRecord(saved) ||
      saved.version !== 1 ||
      typeof saved.savedAt !== "number" ||
      now - saved.savedAt > 7_200_000 ||
      saved.savedAt > now ||
      !Number.isInteger(saved.step) ||
      Number(saved.step) < 0 ||
      Number(saved.step) > 5 ||
      !isRecord(saved.value)
    )
      return null;
    const value = saved.value;
    if (
      typeof value.id !== "string" ||
      !uuid.test(value.id) ||
      (value.intent !== "" && !isIntent(value.intent))
    )
      return null;
    const draft = emptyEnquiry(value.locale === "de" ? "de" : "en");
    for (const [key, limit] of Object.entries(limits)) {
      if (typeof value[key] !== "string" || value[key].length > limit)
        return null;
      (draft as unknown as Record<string, unknown>)[key] = value[key];
    }
    return {
      value: {
        ...draft,
        id: value.id,
        intent: value.intent as Enquiry["intent"],
        context: enquiryContext(value.context),
      },
      step: Number(saved.step),
      entry: typeof saved.entry === "string" ? saved.entry : undefined,
    };
  } catch {
    return null;
  }
}
