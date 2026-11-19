"use client";

import { useMemo, useState } from "react";
import {
  mutedProjectIds,
  useProjectListStore,
} from "../Cv/Projects/projectListStore";
import { useProjectFocusStore } from "../Cv/Projects/projectFocusStore";
import { CompactSpace3D } from "./CompactSpace3D";
import type { previewLenses } from "./spaceNodes";
import { useAtlasCopy } from "./useAtlasCopy";

/** Mirrors the project list: its results stay lit, and clicks here steer the list. */
export function ResultsSyncedSpace3D({
  lenses,
}: {
  lenses: ReturnType<typeof previewLenses>;
}) {
  const { t, term } = useAtlasCopy();
  const [lensId, setLensId] = useState(lenses[0].id);
  const lens = lenses.find((item) => item.id === lensId) ?? lenses[0];
  const resultIds = useProjectListStore((s) => s.resultIds);
  const cluster = useProjectListStore((s) => s.cluster);
  const toggleCluster = useProjectListStore((s) => s.toggleCluster);
  const revealProject = useProjectListStore((s) => s.revealProject);
  const hoveredId = useProjectFocusStore((s) => s.hoveredProjectId);
  const inViewIds = useProjectFocusStore((s) => s.inViewProjectIds);
  const mutedIds = useMemo(
    () =>
      mutedProjectIds(
        lens.nodes.map((node) => node.id),
        resultIds,
      ),
    [lens, resultIds],
  );
  return (
    <>
      <div
        role="group"
        aria-label={t("Experience lenses")}
        className="grid grid-cols-2 gap-px border border-white/30 bg-white/30"
      >
        {lenses.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={item.id === lens.id}
            onClick={() => setLensId(item.id)}
            className={`min-h-11 px-3 text-left text-[0.6rem] uppercase tracking-[0.2em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white ${
              item.id === lens.id
                ? "bg-neutral-800 text-white shadow-[inset_0_-2px_0_#fff]"
                : "bg-black text-neutral-400 hover:text-white"
            }`}
          >
            {t(item.label)}
          </button>
        ))}
      </div>
      <p
        data-explorer-lens-question
        className="-mt-px border border-white/30 bg-black px-3 py-2 text-xs text-neutral-300"
      >
        {t(lens.question)}
      </p>
      <div className="-mt-px h-[30vh] min-h-[240px] w-full overflow-hidden border border-white/30 bg-black">
        <CompactSpace3D
          nodes={lens.nodes}
          groups={lens.groups}
          mutedIds={mutedIds}
          ringedIds={inViewIds}
          selectedId={
            hoveredId && !mutedIds.includes(hoveredId) ? hoveredId : ""
          }
          activeGroup={cluster?.lens === lens.id ? cluster.index : -1}
          onSelect={(id) => {
            if (!mutedIds.includes(id)) revealProject(id);
          }}
          onClusterSelect={(index) => {
            const group = lens.groups.find((item) => item.index === index);
            if (group)
              toggleCluster({
                lens: lens.id,
                index,
                ids: group.ids,
                label: term(group.label),
              });
          }}
        />
      </div>
    </>
  );
}
