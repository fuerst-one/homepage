import type { AtlasProject } from "./model";
import { spaceProjectTerms } from "./spaceAxes";
import { rankSpaceNeighbours, type SemanticSpace } from "./spaceTypes";

export type ConnectionMode = "members" | "clusters" | "nearest";
export type ClusterTerm = { term: string; count: number; total: number };

/** Recorded traits describe groups; they are not names for learned dimensions. */
export function describeSpaceConnections(
  space: SemanticSpace,
  projects: AtlasProject[],
  selectedId: string,
) {
  const byId = new Map(projects.map((project) => [project.id, project]));
  const terms = new Map(
    space.ids.map((id) => {
      const project = byId.get(id);
      return [
        id,
        new Set(
          space.fieldTerms
            ? (space.fieldTerms[id] ?? [])
            : project
              ? spaceProjectTerms(project, space.recipe)
              : [],
        ),
      ] as const;
    }),
  );
  const groups = space.groups.map((group, index) => {
    const counts = new Map<string, number>();
    for (const id of group.ids)
      for (const term of terms.get(id) ?? [])
        counts.set(term, (counts.get(term) ?? 0) + 1);
    const traits = [...counts]
      .map(([term, count]) => ({ term, count, total: group.ids.length }))
      .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term));
    // Prefer repeated, prevalent traits that distinguish this group from the map.
    const descriptive = traits.filter(
      (item) => item.count >= 2 && item.count / item.total >= 0.5,
    );
    const prevalence = (term: string) =>
      space.ids.filter((id) => terms.get(id)?.has(term)).length /
      space.ids.length;
    descriptive.sort(
      (a, b) =>
        b.count / b.total -
          prevalence(b.term) -
          (a.count / a.total - prevalence(a.term)) ||
        b.count - a.count ||
        a.term.localeCompare(b.term),
    );
    return {
      index,
      ids: group.ids,
      label:
        descriptive
          .slice(0, 2)
          .map((item) => item.term)
          .join(" / ") || "Mixed recorded traits",
      terms: traits,
    };
  });
  const selectedGroup = space.ids.includes(selectedId)
    ? groups.findIndex((group) => group.ids.includes(selectedId))
    : -1;
  const ranked = rankSpaceNeighbours(space, selectedId).filter((item) =>
    Number.isFinite(item.similarity),
  );
  const shared = (id: string) =>
    [...(terms.get(selectedId) ?? [])]
      .filter((term) => terms.get(id)?.has(term))
      .sort();
  const selected = byId.get(selectedId);
  const crossIndustry = ranked.flatMap((item) => {
    const other = byId.get(item.id);
    const sectors = (project: AtlasProject | undefined) =>
      (project?.industries ?? []).filter(
        (value) =>
          value.trim() && !/^(n\/?a|unknown|unspecified)$/i.test(value),
      );
    const sourceSectors = sectors(selected),
      targetSectors = sectors(other);
    if (
      !selected ||
      !other ||
      !sourceSectors.length ||
      !targetSectors.length ||
      sourceSectors.some((value) => targetSectors.includes(value))
    )
      return [];
    const facts = [
      {
        label: "Shared client need",
        a: selected.matching?.buyerNeeds ?? [],
        b: other.matching?.buyerNeeds ?? [],
      },
      {
        label: "Shared use case",
        a: selected.matching?.domains ?? [],
        b: other.matching?.domains ?? [],
      },
      {
        label: "Shared capability",
        a: selected.capabilities ?? [],
        b: other.capabilities ?? [],
      },
    ];
    const evidence = facts
      .map(({ label, a, b }) => ({
        label,
        values: [...new Set(a.filter((value) => b.includes(value)))].sort(),
      }))
      .filter((fact) => fact.values.length);
    return evidence.some((fact) => fact.label !== "Shared capability")
      ? [{ ...item, sourceSectors, targetSectors, evidence }]
      : [];
  })[0];
  const baseline = groups[selectedGroup];
  const baselineCounts = new Map(
    baseline?.terms.map((item) => [item.term, item.count]),
  );
  const bridges = baseline
    ? groups
        .flatMap((group) => {
          if (group.index === selectedGroup) return [];
          const closest = ranked.find((item) => group.ids.includes(item.id));
          if (!closest) return [];
          // Compare prevalence, not raw counts: cluster sizes can differ substantially.
          const difference = group.terms
            .map((item) => ({
              ...item,
              baselineCount: baselineCounts.get(item.term) ?? 0,
              baselineTotal: baseline.ids.length,
            }))
            .filter(
              (item) =>
                item.count / item.total >
                item.baselineCount / item.baselineTotal,
            )
            .sort(
              (a, b) =>
                b.count / b.total -
                  b.baselineCount / b.baselineTotal -
                  (a.count / a.total - a.baselineCount / a.baselineTotal) ||
                b.count - a.count ||
                a.term.localeCompare(b.term),
            )[0];
          return [
            {
              ...closest,
              group: group.index,
              shared: shared(closest.id),
              difference,
            },
          ];
        })
        .sort((a, b) => b.similarity - a.similarity || a.group - b.group)
    : [];
  return {
    selectedId: space.ids.includes(selectedId) ? selectedId : null,
    selectedGroup,
    groups,
    crossIndustry,
    identicalIds: ranked
      .filter((item) => Math.abs(1 - item.similarity) < 1e-9)
      .map((item) => item.id),
    bridges,
    members: ranked
      .filter((item) => baseline?.ids.includes(item.id))
      .map((item) => ({ ...item, shared: shared(item.id) })),
    nearest: ranked
      .slice(0, 5)
      .map((item) => ({ ...item, shared: shared(item.id) })),
  };
}

export type SpaceConnections = ReturnType<typeof describeSpaceConnections>;

export function spaceHighlightIds(
  model: SpaceConnections,
  mode: ConnectionMode,
  previewGroup: number | null,
): string[] {
  const selected = model.selectedId ? [model.selectedId] : [];
  const members =
    previewGroup !== null ? model.groups[previewGroup]?.ids : undefined;
  if (members) return [...new Set([...selected, ...members])];
  return [
    ...new Set([
      ...selected,
      ...(mode === "nearest"
        ? model.nearest.map((item) => item.id)
        : mode === "members"
          ? model.members.map((item) => item.id)
          : [
              ...(model.groups[model.selectedGroup]?.ids ?? []),
              ...model.bridges.map((item) => item.id),
            ]),
    ]),
  ];
}
