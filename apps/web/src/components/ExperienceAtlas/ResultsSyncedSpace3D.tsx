"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import {
  mutedProjectIds,
  useProjectListStore,
} from "../Cv/Projects/projectListStore";
import { useProjectFocusStore } from "../Cv/Projects/projectFocusStore";
import { DeferredWorkView } from "../HomeWork/DeferredWorkView";
import { SpaceBoundary } from "./SpaceBoundary";
import { GraphLoadingOverlay } from "./GraphLoadingOverlay";
import { useAtlasCopy } from "./useAtlasCopy";
import { useReducedMotion } from "./useReducedMotion";
import { useScaleSpace } from "./useScaleSpace";
import { useConnectionAnalysis } from "./useConnectionAnalysis";
import {
  buildExplorerGraph,
  CONNECTION_CONTRAST,
} from "./connectionComparison";
import { DEFAULT_CONNECTION_WEIGHTS } from "./connectionGraph";
import { PERSPECTIVE_TRAITS } from "./connectionExplorerState";
import { SCALE_FIELDS, SPACE_LENSES } from "./scaleSpace";
import type { AtlasProject } from "./model";
import type { SemanticDataset, SpaceLens } from "./spaceTypes";
import "./semantic-space.css";

const Graph3D = dynamic(() => import("./ConnectionExplorerGraph3D"), {
  ssr: false,
  loading: Loading,
});
const fields = SCALE_FIELDS.map((f) => f.id);
const disabled = new Set<string>();
type Props = {
  projects: AtlasProject[];
  semanticData: SemanticDataset;
  locale: "en" | "de";
};
function Loading() {
  const { t } = useAtlasCopy();
  return (
    <p
      className="flex min-h-[240px] items-center justify-center text-xs text-neutral-400"
      role="status"
    >
      {t("Initializing spatial renderer…")}
    </p>
  );
}

/** Mirrors the list without refitting the graph when its visible results change. */
function LiveResultsGraph({ projects, semanticData, locale }: Props) {
  const { t, term } = useAtlasCopy();
  const [lensId, setLensId] = useState<SpaceLens>("product");
  const lens = SPACE_LENSES.find((item) => item.id === lensId)!;
  const scale = useScaleSpace(projects, fields);
  const space =
    lensId === "scale" ? scale.result?.space : semanticData.spaces[lensId];
  const graph = useMemo(
    () =>
      buildExplorerGraph(
        projects,
        space,
        lensId,
        "similarity",
        DEFAULT_CONNECTION_WEIGHTS,
        fields,
        disabled,
      ),
    [projects, space, lensId],
  );
  const input = useMemo(
    () => ({
      ids: graph.ids,
      links: graph.links,
      weights: DEFAULT_CONNECTION_WEIGHTS,
      contrast: CONNECTION_CONTRAST,
      traitWeights: PERSPECTIVE_TRAITS[lensId],
    }),
    [graph, lensId],
  );
  const analysis = useConnectionAnalysis(input);
  const groups = analysis.pending ? undefined : analysis.result?.groups;
  const nodes = useMemo(
    () =>
      projects.map((p) => ({
        id: p.id,
        label: p.label,
        accentColor: p.presentation?.accentColor ?? null,
      })),
    [projects],
  );
  const reducedMotion = useReducedMotion();
  const resultIds = useProjectListStore((s) => s.resultIds);
  const cluster = useProjectListStore((s) => s.cluster);
  const toggleCluster = useProjectListStore((s) => s.toggleCluster);
  const revealProject = useProjectListStore((s) => s.revealProject);
  const hoveredId = useProjectFocusStore((s) => s.hoveredProjectId);
  const inViewIds = useProjectFocusStore((s) => s.inViewProjectIds);
  const mutedIds = useMemo(
    () =>
      mutedProjectIds(
        nodes.map((n) => n.id),
        resultIds,
      ),
    [nodes, resultIds],
  );
  const visibleLinks = useMemo(
    () =>
      resultIds === null
        ? null
        : graph.links
            .filter(
              (e) =>
                resultIds.includes(e.source) && resultIds.includes(e.target),
            )
            .map((e) => e.id),
    [graph.links, resultIds],
  );
  return (
    <>
      <div
        role="group"
        aria-label={t("Experience lenses")}
        className="grid grid-cols-2 gap-px border border-white/30 bg-white/30"
      >
        {SPACE_LENSES.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={item.id === lensId}
            onClick={() => setLensId(item.id)}
            className={`min-h-11 px-3 text-left text-[0.6rem] uppercase tracking-[0.2em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white ${item.id === lensId ? "bg-neutral-800 text-white shadow-[inset_0_-2px_0_#fff]" : "bg-black text-neutral-400 hover:text-white"}`}
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
      <div
        data-connection-preview
        className="relative -mt-px h-[30vh] min-h-[240px] w-full overflow-hidden border border-white/30 bg-black"
        onWheelCapture={(event) => {
          if (!event.shiftKey) event.stopPropagation();
        }}
      >
        <SpaceBoundary
          fallback={
            <p className="p-4 text-xs text-neutral-400">
              {t("3D rendering is unavailable in this browser.")}
            </p>
          }
        >
          <Graph3D
            compact
            nodes={nodes}
            links={graph.links}
            perspective={`${lensId}:similarity`}
            projects={projects}
            locale={locale}
            groups={groups}
            activeGroup={
              cluster?.lens === lensId ? groups?.[cluster.index]?.id : undefined
            }
            selectedId={
              hoveredId && !mutedIds.includes(hoveredId) ? hoveredId : ""
            }
            mutedIds={mutedIds}
            ringedIds={inViewIds}
            highlightedIds={[]}
            visibleLinkIds={visibleLinks}
            showLinks
            showHulls={!analysis.error}
            contrast={CONNECTION_CONTRAST}
            labels={false}
            resetView={0}
            reducedMotion={reducedMotion}
            flat={false}
            onSelect={(id) => {
              if (!mutedIds.includes(id)) revealProject(id);
            }}
            onClusterSelect={(index) => {
              const group = groups?.[index];
              if (group)
                toggleCluster({
                  lens: lensId,
                  index,
                  ids: group.ids,
                  label: group.traits.length
                    ? term(group.traits[0].value)
                    : `${t("Group")} ${index + 1}`,
                });
            }}
          />
        </SpaceBoundary>
        {(analysis.pending || (lensId === "scale" && scale.pending)) &&
          !(lensId === "scale" && scale.error) && (
            <GraphLoadingOverlay
              locale={locale}
              comparingMeasurements={lensId === "scale" && scale.pending}
            />
          )}
        {lensId === "scale" && scale.error && (
          <p
            role="status"
            className="absolute bottom-2 left-2 right-2 border border-white/30 bg-neutral-950 p-2 text-xs text-neutral-300"
          >
            {locale === "de"
              ? "Messwerte konnten nicht verglichen werden. Die Projektliste bleibt verfügbar."
              : "Measurements could not be compared. The project list remains available."}
          </p>
        )}
        {analysis.error &&
          !(lensId === "scale" && (scale.pending || scale.error)) && (
            <p
              role="status"
              className="absolute bottom-2 left-2 right-2 border border-white/30 bg-neutral-950 p-2 text-xs text-neutral-300"
            >
              {locale === "de"
                ? "Die Gruppenanalyse ist gerade nicht verfügbar."
                : "Cluster analysis is currently unavailable."}
            </p>
          )}
      </div>
      <p className="border-x border-b border-white/30 px-3 py-2 text-[0.6rem] text-neutral-400">
        {locale === "de"
          ? "Punkte ziehen · Umschalt + Scrollen: zoomen"
          : "Drag nodes · Shift + scroll to zoom"}
      </p>
    </>
  );
}

export function ResultsSyncedSpace3D(props: Props) {
  return (
    <DeferredWorkView fallback={<Loading />}>
      <LiveResultsGraph {...props} />
    </DeferredWorkView>
  );
}
