import type { LabProject } from "./analysis";
import { projectIdentityLabels } from "./analysis";

export type ComparisonProject = Pick<
  LabProject,
  | "id"
  | "name"
  | "tools"
  | "languages"
  | "capabilities"
  | "methods"
  | "industries"
  | "productTypes"
> & {
  shortDescription?: string;
  subtitle?: string;
  matching: Pick<LabProject["matching"], "buyerNeeds" | "domains">;
};

export const COMPARISON_FIELDS = [
  { id: "needs", label: "Client needs" },
  { id: "useCases", label: "Use cases" },
  { id: "tools", label: "Tools & libraries" },
  { id: "languages", label: "Languages" },
  { id: "capabilities", label: "Capabilities" },
  { id: "methods", label: "Methods" },
  { id: "formats", label: "Product formats" },
  { id: "sectors", label: "Sectors" },
] as const;
type ComparisonField = (typeof COMPARISON_FIELDS)[number]["id"];
const values = (p: ComparisonProject, field: ComparisonField) =>
  field === "needs"
    ? p.matching.buyerNeeds
    : field === "useCases"
      ? p.matching.domains
      : field === "formats"
        ? p.productTypes
        : field === "sectors"
          ? (p.industries ?? [])
          : p[field];
const key = (value: string) =>
  value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
const labels = (items: string[]) =>
  new Map(items.filter((v) => v.trim()).map((v) => [key(v), v.trim()]));

/** Exact recorded labels after case/spacing normalization; no inferred equivalence. */
export function compareProjectFields(
  a: ComparisonProject,
  b: ComparisonProject,
) {
  return COMPARISON_FIELDS.map((field) => {
    const av = labels(values(a, field.id)),
      bv = labels(values(b, field.id));
    const shared = [...av]
      .filter(([k]) => bv.has(k))
      .map(([, label]) => label)
      .sort();
    const missing = [!av.size ? "a" : null, !bv.size ? "b" : null].filter(
      (v): v is "a" | "b" => v !== null,
    );
    return {
      ...field,
      shared,
      missing,
      onlyA: [...av]
        .filter(([k]) => !bv.has(k))
        .map(([, v]) => v)
        .sort(),
      onlyB: [...bv]
        .filter(([k]) => !av.has(k))
        .map(([, v]) => v)
        .sort(),
      total: new Set([...av.keys(), ...bv.keys()]).size,
      similarity: missing.length
        ? null
        : shared.length / new Set([...av.keys(), ...bv.keys()]).size,
    };
  });
}

/** Descriptive leads, not a fit score: multiple shared needs and disjoint known tools. */
export function crossLensCandidates(
  projects: ComparisonProject[],
  anchorId: string,
) {
  const a = projects.find((p) => p.id === anchorId);
  if (!a) return [];
  return projects
    .filter((b) => b.id !== a.id)
    .flatMap((b) => {
      const rows = compareProjectFields(a, b);
      const needs = rows.find((r) => r.id === "needs")!,
        tools = rows.find((r) => r.id === "tools")!;
      return tools.similarity === 0 &&
        needs.shared.length >= 2 &&
        (needs.similarity ?? 0) >= 0.5
        ? [
            {
              a: a.id,
              b: b.id,
              sharedNeeds: needs.shared,
              totalNeeds: needs.total,
              needSimilarity: needs.similarity!,
            },
          ]
        : [];
    })
    .sort(
      (a, b) =>
        b.sharedNeeds.length - a.sharedNeeds.length ||
        b.needSimilarity - a.needSimilarity ||
        a.b.localeCompare(b.b),
    );
}

/** Both Lab records and Atlas view models retain the short description. */
export function projectComparisonLabels(projects: ComparisonProject[]) {
  return projectIdentityLabels(
    projects.map((project) => ({
      id: project.id,
      name: project.name,
      shortDescription: project.shortDescription ?? project.subtitle,
    })),
  );
}
