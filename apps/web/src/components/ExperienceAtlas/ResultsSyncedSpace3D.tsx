"use client";

import { useMemo } from "react";
import {
  mutedProjectIds,
  useProjectListStore,
} from "../Cv/Projects/projectListStore";
import { useProjectFocusStore } from "../Cv/Projects/projectFocusStore";
import { CompactSpace3D } from "./CompactSpace3D";
import type { SpaceNode } from "./SemanticSpaceCharts";
import type { SpaceConnections } from "./spaceConnections";
import { useAtlasCopy } from "./useAtlasCopy";

/** Mirrors the project list: its results stay lit, and clicks here steer the list. */
export function ResultsSyncedSpace3D({
  nodes,
  groups,
}: {
  nodes: SpaceNode[];
  groups: SpaceConnections["groups"];
}) {
  const { term } = useAtlasCopy();
  const resultIds = useProjectListStore((s) => s.resultIds);
  const cluster = useProjectListStore((s) => s.cluster);
  const toggleCluster = useProjectListStore((s) => s.toggleCluster);
  const revealProject = useProjectListStore((s) => s.revealProject);
  const hoveredId = useProjectFocusStore((s) => s.hoveredProjectId);
  const inViewIds = useProjectFocusStore((s) => s.inViewProjectIds);
  const mutedIds = useMemo(
    () =>
      mutedProjectIds(
        nodes.map((node) => node.id),
        resultIds,
      ),
    [nodes, resultIds],
  );
  return (
    <CompactSpace3D
      nodes={nodes}
      groups={groups}
      mutedIds={mutedIds}
      ringedIds={inViewIds}
      selectedId={hoveredId && !mutedIds.includes(hoveredId) ? hoveredId : ""}
      activeGroup={cluster?.index ?? -1}
      onSelect={(id) => {
        if (!mutedIds.includes(id)) revealProject(id);
      }}
      onClusterSelect={(index) => {
        const group = groups.find((item) => item.index === index);
        if (group)
          toggleCluster({ index, ids: group.ids, label: term(group.label) });
      }}
    />
  );
}
