/** Public numeric facts. Raw research notes, repository paths and revisions never leave the source. */
export type ProjectScale = {
  complexity: number | null;
  complexityBasis: "assessment" | "unspecified";
  effortLow: number | null;
  effortHigh: number | null;
  effortBasis: "rebuild-estimate" | "unspecified";
  effortClassSource: string | null;
  effortClassComputed: string | null;
  teamLow: number | null;
  teamHigh: number | null;
  codeSloc: number | null;
  testSloc: number | null;
  sourceFiles: number | null;
  codeMeasuredAt: string | null;
  workingPattern: string;
};
const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const numeric = (
  v: unknown,
  min = 0,
  max = Infinity,
  integer = false,
): number | null =>
  typeof v === "number" &&
  Number.isFinite(v) &&
  v >= min &&
  v <= max &&
  (!integer || Number.isInteger(v))
    ? v
    : null;
export const effortClass = (upper: number | null): string | null =>
  upper == null
    ? null
    : upper <= 5
      ? "XS"
      : upper <= 20
        ? "S"
        : upper <= 60
          ? "M"
          : upper <= 200
            ? "L"
            : upper <= 600
              ? "XL"
              : "XXL";
function range(lo: unknown, hi: unknown, min = 0, integer = false) {
  const low = numeric(lo, min, Infinity, integer),
    high = numeric(hi, min, Infinity, integer);
  return low != null && high != null && low > high
    ? ([null, null] as const)
    : ([low, high] as const);
}
export function publicProjectScale(value: unknown): ProjectScale {
  const p = record(value);
  const [teamLow, teamHigh] = range(p.teamLow, p.teamHigh, 1, true);
  const [effortLow, effortHigh] = range(p.effortLow, p.effortHigh);
  const date = text(p.codeMeasuredAt);
  return {
    complexity: numeric(p.complexity, 1, 5, true),
    complexityBasis:
      p.complexityBasis === "assessment" ? "assessment" : "unspecified",
    effortLow,
    effortHigh,
    effortBasis:
      p.effortBasis === "rebuild-estimate" ? "rebuild-estimate" : "unspecified",
    effortClassSource: ["XS", "S", "M", "L", "XL", "XXL"].includes(
      text(p.effortClassSource),
    )
      ? text(p.effortClassSource)
      : null,
    effortClassComputed: effortClass(effortHigh),
    teamLow,
    teamHigh,
    codeSloc: numeric(p.codeSloc, 0, Infinity, true),
    testSloc: numeric(p.testSloc, 0, Infinity, true),
    sourceFiles: numeric(p.sourceFiles, 0, Infinity, true),
    codeMeasuredAt:
      /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date))
        ? date
        : null,
    workingPattern: text(p.workingPattern),
  };
}
export function readNotionProjectScale(page: unknown): ProjectScale {
  const p = record(record(page).properties);
  const num = (k: string) => record(p[k]).number;
  const rich = (k: string) => {
    const parts = record(p[k]).rich_text;
    return Array.isArray(parts)
      ? parts
          .map(
            (v) =>
              text(record(v).plain_text) ||
              text(record(record(v).text).content),
          )
          .join(" ")
      : "";
  };
  return publicProjectScale({
    complexity: num("Complexity 1-5"),
    complexityBasis: /ASSESSMENT/i.test(rich("Complexity Basis"))
      ? "assessment"
      : "unspecified",
    effortLow: num("Effort Days Low"),
    effortHigh: num("Effort Days High"),
    effortBasis: /rebuild|replacement|recreate/i.test(
      rich("Effort Estimate Basis"),
    )
      ? "rebuild-estimate"
      : "unspecified",
    effortClassSource: record(record(p["Effort Class (upper)"]).select).name,
    teamLow: num("Team Size Low"),
    teamHigh: num("Team Size High"),
    codeSloc: num("Code SLOC"),
    testSloc: num("Test SLOC"),
    sourceFiles: num("Source Files"),
    codeMeasuredAt: text(
      record(record(p["Code Measured At"]).date).start,
    ).slice(0, 10),
    workingPattern: record(record(p["Working pattern"]).select).name,
  });
}
