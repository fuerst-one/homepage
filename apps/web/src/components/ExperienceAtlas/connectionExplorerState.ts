import type { AtlasProject } from "./model";
import type { SemanticSpace, SpaceLens } from "./spaceTypes";
import { SCALE_FIELDS, type ScaleField } from "./scaleSpace";
import {
  buildConnectionGraph,
  CONNECTION_FIELDS,
  DEFAULT_CONNECTION_WEIGHTS,
  type ConnectionEdge,
  type ConnectionWeights,
} from "./connectionGraph";

export type ConnectionLens = SpaceLens | "manual";
export type FocusMode = "all" | "members" | "bridges" | "nearest";
export type ConnectionNavigation = {
  lens: ConnectionLens;
  model: "overlap" | "similarity";
  project: string;
  mode: FocusMode;
  view: "3d" | "2d";
  weights: ConnectionWeights;
  disabled: string[];
  labels: boolean;
  hulls: boolean;
  links: boolean;
  sector: string;
  fields: ScaleField[];
};
const LENSES = [
  "product",
  "engineering",
  "practice",
  "scale",
  "manual",
] as const;
const MODES = ["all", "members", "bridges", "nearest"] as const;

/** URL input is untrusted; normalize it before using it in scoring or UI state. */
export function readConnectionNavigation(
  query: Pick<URLSearchParams, "get">,
  projects: readonly { id: string }[],
): ConnectionNavigation {
  const ids = new Set(projects.map((p) => p.id));
  const raw = query.get("weights")?.split(",").map(Number);
  const validWeights =
    raw?.length === CONNECTION_FIELDS.length &&
    raw.every((v) => Number.isFinite(v) && v >= 0 && v <= 100) &&
    raw.reduce((a, b) => a + b, 0) <= 100.001;
  const fields = query.get("fields");
  const lens = LENSES.find((l) => l === query.get("lens")) ?? "product";
  return {
    lens,
    model: lens === "manual" ? "overlap" : "similarity",
    project: ids.has(query.get("project") ?? "") ? query.get("project")! : "",
    mode: MODES.find((m) => m === query.get("focus")) ?? "all",
    view:
      query.get("view") === "2d" || query.get("view") === "network"
        ? "2d"
        : "3d",
    weights: validWeights
      ? (Object.fromEntries(
          CONNECTION_FIELDS.map(({ id }, i) => [id, raw![i]]),
        ) as ConnectionWeights)
      : { ...DEFAULT_CONNECTION_WEIGHTS },
    disabled: [
      ...new Set(
        (query.get("disabled") ?? "")
          .split(",")
          .filter((pair) => {
            const parts = pair.split("|");
            return (
              parts.length === 2 &&
              parts[0] !== parts[1] &&
              parts.every((id) => ids.has(id))
            );
          })
          .map((pair) => pair.split("|").sort().join("|")),
      ),
    ].sort(),
    labels: query.get("labels") === "1",
    hulls: query.get("hulls") !== "0",
    links: query.get("links") !== "0",
    sector: query.get("sector") ?? "",
    fields:
      fields === null
        ? SCALE_FIELDS.map((f) => f.id)
        : SCALE_FIELDS.filter((f) => fields.split(",").includes(f.id)).map(
            (f) => f.id,
          ),
  };
}
export function writeConnectionNavigation(
  url: URL,
  state: ConnectionNavigation,
) {
  url.searchParams.delete("model");
  const values = {
    lens: state.lens,
    project: state.project,
    focus: state.mode,
    view: state.view,
    weights: CONNECTION_FIELDS.map((f) => state.weights[f.id]).join(","),
    disabled: state.disabled.join(","),
    labels: state.labels ? "1" : "0",
    hulls: state.hulls ? "1" : "0",
    links: state.links ? "1" : "0",
    sector: state.sector,
    fields: state.fields.join(","),
  };
  for (const [key, value] of Object.entries(values)) {
    if (value || key === "fields") url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export const PERSPECTIVE_TRAITS: Record<SpaceLens, Record<string, number>> = {
  product: { domains: 50, product: 50 },
  engineering: { tools: 50, languages: 50 },
  practice: { ownership: 25, setting: 25, pattern: 25, team: 25 },
  scale: { measurements: 100 },
};

/** Reuse each existing lens's full comparisons as spring strengths; discard its PCA coordinates. */
export function buildPerspectiveGraph(
  projects: AtlasProject[],
  space: Pick<SemanticSpace, "ids" | "similarities" | "fieldTerms">,
  disabled: ReadonlySet<string>,
  lens: SpaceLens,
) {
  const byId = new Map(projects.map((p) => [p.id, p]));
  const allWeights = Object.fromEntries(
    CONNECTION_FIELDS.map((f) => [f.id, 1]),
  ) as ConnectionWeights;
  const overlaps = new Map(
    buildConnectionGraph(projects, allWeights, new Set()).candidates.map(
      (e) => [e.id, e.shared],
    ),
  );
  const extra = (p: AtlasProject): Record<string, string[]> => ({
    domains: p.matching.domains,
    ownership: p.ownership ? [p.ownership] : [],
    setting: p.projectType ? [p.projectType] : [],
    pattern: p.scale?.workingPattern ? [p.scale.workingPattern] : [],
    team:
      p.scale?.teamLow != null && p.scale?.teamHigh != null
        ? [`${p.scale.teamLow}–${p.scale.teamHigh}`]
        : [],
    measurements: lens === "scale" ? (space.fieldTerms?.[p.id] ?? []) : [],
  });
  const ids = space.ids.filter((id) => byId.has(id));
  const indices = new Map(space.ids.map((id, i) => [id, i]));
  const candidates: ConnectionEdge[] = [];
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i],
        b = ids[j],
        id = [a, b].sort().join("|");
      const score = space.similarities[indices.get(a)!]?.[indices.get(b)!];
      if (!Number.isFinite(score) || score <= 0) continue;
      const shared = {
        ...Object.fromEntries(CONNECTION_FIELDS.map((f) => [f.id, []])),
        ...overlaps.get(id),
      } as ConnectionEdge["shared"];
      const left = extra(byId.get(a)!),
        right = extra(byId.get(b)!);
      for (const field of Object.keys(left))
        shared[field] = left[field].filter((v) => right[field].includes(v));
      candidates.push({
        id,
        source: a,
        target: b,
        score: Math.min(1, score),
        shared,
      });
    }
  candidates.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return {
    ids,
    candidates,
    links: candidates.filter((e) => !disabled.has(e.id)),
  };
}

/** Selection changes visibility only, never the physical links. */
export function connectionFocus(
  selected: string,
  mode: FocusMode,
  links: ConnectionEdge[],
  groups: readonly { id: string; ids: string[] }[],
) {
  const group = groups.find((g) => g.ids.includes(selected));
  const ranked = links
    .filter((e) => e.source === selected || e.target === selected)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .map((e) => (e.source === selected ? e.target : e.source));
  let neighbours = ranked;
  if (mode === "members")
    neighbours = ranked.filter((id) => group?.ids.includes(id));
  if (mode === "nearest") neighbours = ranked.slice(0, 6);
  if (mode === "bridges")
    neighbours = groups
      .filter((g) => g !== group)
      .flatMap((g) => {
        const id = ranked.find((id) => g.ids.includes(id));
        return id ? [id] : [];
      });
  return {
    neighbours,
    highlighted:
      !selected || mode === "all"
        ? []
        : [
            ...new Set([
              selected,
              ...(mode === "bridges" ? (group?.ids ?? []) : []),
              ...neighbours,
            ]),
          ],
  };
}
