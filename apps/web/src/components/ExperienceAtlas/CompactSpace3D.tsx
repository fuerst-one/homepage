"use client";

import dynamic from "next/dynamic";
import { useRef, type ComponentProps } from "react";
import { DeferredWorkView } from "../HomeWork/DeferredWorkView";
import type { SpaceNode } from "./SemanticSpaceCharts";
import type { SpaceConnections } from "./spaceConnections";
import { createSpaceViewport } from "./spaceViewport";
import { SpaceBoundary } from "./SpaceBoundary";
import { useAtlasCopy } from "./useAtlasCopy";
import "./semantic-space.css";

function Loading() {
  const { t } = useAtlasCopy();
  return (
    <p
      className="flex h-full items-center justify-center px-4 text-center text-xs text-neutral-400"
      role="status"
    >
      {t("Initializing spatial renderer…")}
    </p>
  );
}

const Space3D = dynamic(() => import("./SemanticSpace3D"), {
  ssr: false,
  loading: Loading,
});

export function CompactSpace3D({
  nodes,
  groups,
  selectedId = "",
  activeGroup = -1,
  ...interaction
}: {
  nodes: SpaceNode[];
  groups: SpaceConnections["groups"];
} & Partial<
  Pick<
    ComponentProps<typeof Space3D>,
    | "selectedId"
    | "activeGroup"
    | "mutedIds"
    | "ringedIds"
    | "onSelect"
    | "onClusterSelect"
  >
>) {
  const { t } = useAtlasCopy();
  const viewport = useRef(createSpaceViewport());
  const unavailable = (
    <p className="flex h-full items-center justify-center px-4 text-center text-xs text-neutral-400">
      {t(
        nodes.length < 2
          ? "More current vectors are needed for this lens."
          : "3D rendering is unavailable in this browser.",
      )}
    </p>
  );
  if (nodes.length < 2) return unavailable;
  return (
    <DeferredWorkView fallback={<Loading />}>
      <SpaceBoundary fallback={unavailable}>
        <Space3D
          compact
          viewport={viewport}
          nodes={nodes}
          groups={groups}
          axes={[]}
          hulls={groups.length > 1}
          selectedId={selectedId}
          neighbours={[]}
          highlightedIds={[]}
          activeGroup={activeGroup}
          clusterSelected={activeGroup >= 0}
          labels={false}
          {...interaction}
        />
      </SpaceBoundary>
    </DeferredWorkView>
  );
}
