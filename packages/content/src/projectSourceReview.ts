import { CASE_VOCABULARY } from "./projectCase";
import {
  CUSTOMER_MARKETS,
  DELIVERY_MODELS,
  PRODUCT_FORMATS,
  SECTORS,
  USAGE_CONTEXTS,
} from "./projectTaxonomy";

export type ProjectSourceIssue = {
  field: string;
  reason: "unknown-value" | "missing-required";
  values: string[];
};
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const rows = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const controlled: Record<string, readonly string[]> = {
  Sector: Object.keys(SECTORS),
  "Product type": PRODUCT_FORMATS,
  "Target market": CUSTOMER_MARKETS,
  "Usage context": USAGE_CONTEXTS,
  "Delivery model": DELIVERY_MODELS,
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
  for (const [field, vocabulary] of Object.entries(controlled)) {
    const unknown = [
      ...new Set(values(field).filter((v) => !vocabulary.includes(v))),
    ];
    if (unknown.length)
      issues.push({ field, reason: "unknown-value", values: unknown });
  }
  for (const field of required)
    if (
      !values(field).some(
        (v) => !controlled[field] || controlled[field].includes(v),
      )
    )
      issues.push({ field, reason: "missing-required", values: [] });
  return issues;
}
