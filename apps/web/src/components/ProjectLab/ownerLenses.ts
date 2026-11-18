import type { LabProject, SemanticPair } from "./analysis";

export type LensCell = { x: string; y: string; ids: string[] };
const distinct = (projects: LabProject[]) => [
  ...new Map(projects.map((p) => [p.id, p])).values(),
];
export const validScore = (
  value: number | null | undefined,
  maximum: number,
) =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 1 &&
  value <= maximum
    ? value
    : null;
export const validRange = (
  low: number | null | undefined,
  high: number | null | undefined,
) =>
  typeof low === "number" &&
  typeof high === "number" &&
  Number.isFinite(low) &&
  Number.isFinite(high) &&
  low >= 0 &&
  high >= low;
export function rangeLabel(
  low: number | null | undefined,
  high: number | null | undefined,
) {
  if (low == null && high == null) return "Unknown";
  return low === high ? String(low) : `${low ?? "?"}–${high ?? "?"}`;
}
function cells(entries: { x: string; y: string; id: string }[]): LensCell[] {
  const groups = new Map<string, LensCell>();
  for (const { x, y, id } of entries) {
    const key = JSON.stringify([x, y]);
    const cell = groups.get(key) ?? { x, y, ids: [] };
    if (!cell.ids.includes(id)) cell.ids.push(id);
    groups.set(key, cell);
  }
  return [...groups.values()];
}
export function appealCells(projects: LabProject[]): LensCell[] {
  return cells(
    distinct(projects).map((p) => ({
      x: String(validScore(p.assessment?.complexity, 5) ?? "Unknown"),
      y: String(validScore(p.assessment?.wow, 10) ?? "Unscored"),
      id: p.id,
    })),
  );
}
export function evidencePriorities(projects: LabProject[], minimum = 8) {
  const unique = distinct(projects);
  const scored = unique
    .filter((p) => (validScore(p.assessment?.wow, 10) ?? -1) >= minimum)
    .sort(
      (a, b) =>
        (b.assessment?.wow ?? 0) - (a.assessment?.wow ?? 0) ||
        a.name.localeCompare(b.name),
    );
  return {
    projects: scored,
    candidates: scored.filter((p) =>
      ["", "No outcome recorded", "Capability only"].includes(p.outcomeBasis),
    ),
    cells: cells(
      scored.map((p) => ({
        x: p.outcomeBasis || "Unknown",
        y: String(p.assessment!.wow),
        id: p.id,
      })),
    ),
    unscored: unique.filter((p) => validScore(p.assessment?.wow, 10) === null)
      .length,
  };
}
export function comparableProjects(
  projects: LabProject[],
  pairs: SemanticPair[],
  focus: string,
) {
  const scoped = new Map(distinct(projects).map((p) => [p.id, p]));
  const anchor = scoped.get(focus);
  if (!anchor) return [];
  const peers = new Map<
    string,
    {
      project: LabProject;
      cosine: number;
      technologyOverlap: number | null;
      sharedTechnology: string[];
      sharedProducts: string[];
    }
  >();
  for (const pair of pairs) {
    if (pair.a !== focus && pair.b !== focus) continue;
    const peer = scoped.get(pair.a === focus ? pair.b : pair.a);
    if (
      !peer ||
      peer.id === focus ||
      !Number.isFinite(pair.cosine) ||
      pair.cosine < -1 ||
      pair.cosine > 1
    )
      continue;
    if ((peers.get(peer.id)?.cosine ?? -Infinity) >= pair.cosine) continue;
    peers.set(peer.id, {
      project: peer,
      cosine: pair.cosine,
      technologyOverlap: pair.technologyOverlap,
      sharedTechnology: pair.sharedTechnology,
      sharedProducts: [...new Set(anchor.productTypes ?? [])].filter((t) =>
        (peer.productTypes ?? []).includes(t),
      ),
    });
  }
  return [...peers.values()].sort(
    (a, b) =>
      b.cosine - a.cosine || a.project.name.localeCompare(b.project.name),
  );
}
export function teamIntervals(projects: LabProject[]) {
  const unique = distinct(projects);
  const rows = unique
    .flatMap((p) => {
      const low = p.assessment?.teamLow,
        high = p.assessment?.teamHigh;
      return validRange(low, high) &&
        Number.isInteger(low) &&
        Number.isInteger(high)
        ? [{ id: p.id, name: p.name, low: low!, high: high! }]
        : [];
    })
    .sort(
      (a, b) =>
        b.high - a.high || b.low - a.low || a.name.localeCompare(b.name),
    );
  return { rows, unknown: unique.length - rows.length };
}
export function contextCells(
  projects: LabProject[],
  field: "workplace" | "workingPattern",
) {
  return cells(
    distinct(projects).map((p) => ({
      x:
        (field === "workplace" ? p.assessment?.workplace : p.workingPattern) ||
        "Unknown",
      y: p.matching.ownership || "Unknown",
      id: p.id,
    })),
  );
}
export function lifecycleCells(projects: LabProject[]) {
  return cells(
    distinct(projects).flatMap((p) =>
      (p.matching.stages.length
        ? [...new Set(p.matching.stages)]
        : ["Not recorded"]
      ).map((stage) => ({
        x: stage,
        y: p.matching.maintenance || "Unknown",
        id: p.id,
      })),
    ),
  );
}
