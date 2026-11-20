import { CASE_VOCABULARY } from "./projectCase";
import {
  CUSTOMER_MARKETS,
  DELIVERY_MODELS,
  LEGACY_DELIVERY_MODELS,
  PRODUCT_FORMATS,
  SECTORS,
  USAGE_CONTEXTS,
} from "./projectTaxonomy";

export type ProjectSourceIssue = {
  field: string;
  reason: "unknown-value" | "unknown-option" | "missing-required";
  values: string[];
};
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const rows = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
/** Notion fields whose values the code only publishes when it knows them. */
export const CONTROLLED_FIELDS: Record<string, readonly string[]> = {
  Sector: Object.keys(SECTORS),
  "Product type": PRODUCT_FORMATS,
  "Target market": CUSTOMER_MARKETS,
  "Usage context": USAGE_CONTEXTS,
  "Delivery model": [...DELIVERY_MODELS, ...LEGACY_DELIVERY_MODELS],
  "Delivery & operation": DELIVERY_MODELS,
  "Buyer Needs": Object.keys(CASE_VOCABULARY.buyerNeeds),
  "Delivery Stages": Object.keys(CASE_VOCABULARY.stages),
  "Project Domains": Object.keys(CASE_VOCABULARY.domains),
  "AI Usage": Object.keys(CASE_VOCABULARY.aiUsage),
  "AI Capabilities": Object.keys(CASE_VOCABULARY.aiCapabilities),
  "Ownership Model": Object.keys(CASE_VOCABULARY.ownership),
  "Maintenance Mode": Object.keys(CASE_VOCABULARY.maintenance),
};
const required = [
  "Name",
  "Project Description",
  "Sector",
  "Product type",
  "Usage context",
  "Buyer Needs",
  "Project Domains",
  "Capabilities",
  "Tools",
];

/** Worker-only review details. Never attach these values to a public DTO. */
export function reviewProjectSource(page: unknown): ProjectSourceIssue[] {
  const source = record(page),
    p = record(source.properties);
  if (source.archived || source.in_trash || record(p.Hidden).checkbox)
    return [];
  const values = (field: string) => {
    const property = record(p[field]);
    return [
      ...rows(property.multi_select).map((v) => record(v).name),
      record(property.select).name,
      ...rows(property.title ?? property.rich_text).map(
        (v) => record(v).plain_text ?? record(record(v).text).content,
      ),
    ].filter((v): v is string => typeof v === "string" && Boolean(v.trim()));
  };
  const issues: ProjectSourceIssue[] = [];
  for (const [field, vocabulary] of Object.entries(CONTROLLED_FIELDS)) {
    const unknown = [
      ...new Set(values(field).filter((v) => !vocabulary.includes(v))),
    ];
    if (unknown.length)
      issues.push({ field, reason: "unknown-value", values: unknown });
  }
  for (const field of required)
    if (
      !values(field).some(
        (v) =>
          !CONTROLLED_FIELDS[field] || CONTROLLED_FIELDS[field].includes(v),
      )
    )
      issues.push({ field, reason: "missing-required", values: [] });
  return issues;
}

/** Options an editor could select today but the code would silently drop. */
export function reviewProjectSchema(
  properties: Record<string, unknown>,
): ProjectSourceIssue[] {
  return Object.entries(CONTROLLED_FIELDS).flatMap(([field, vocabulary]) => {
    const property = record(properties[field]);
    const options = rows(record(property[String(property.type)]).options)
      .map((option) => record(option).name)
      .filter((name): name is string => typeof name === "string");
    const unknown = options.filter((name) => !vocabulary.includes(name));
    return unknown.length
      ? [{ field, reason: "unknown-option" as const, values: unknown }]
      : [];
  });
}
