"use client";

import { useAtlasCopy } from "./useAtlasCopy";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { EChartsOption, EChartsType } from "echarts";
import { EChart } from "../ProjectLab/chartPrimitives";
import { interactiveSpringForces } from "../ProjectLab/graphForces";
import type { SemanticSpace } from "./spaceTypes";
import type { SpaceNode } from "./SemanticSpaceCharts";
import { projectTooltipElement } from "./projectHover";
import { selectedPointFill } from "./spacePointStyle";
import { useReducedMotion } from "./useReducedMotion";
import type { SpaceViewport } from "./spaceViewport";
import { useChartTooltip } from "./useChartTooltip";

export function SemanticNetwork({
  nodes,
  viewport,
  edges,
  selectedId,
  highlightedIds,
  labels,
  scale,
  onSelect,
}: {
  nodes: SpaceNode[];
  viewport: RefObject<SpaceViewport>;
  edges: SemanticSpace["edges"];
  selectedId: string;
  highlightedIds: string[];
  labels: boolean;
  scale: number;
  onSelect: (id: string) => void;
}) {
  const { locale, t } = useAtlasCopy();
  const chart = useRef<EChartsType | null>(null);
  const tooltip = useChartTooltip(chart, nodes);
  const [repulsion, setRepulsion] = useState(260);
  const [gentle, setGentle] = useState(false);
  const reducedMotion = useReducedMotion();

  // Selection is deliberately absent: selecting a story must not restart physics.
  const option = useMemo<EChartsOption>(
    () => ({
      animation: false,
      backgroundColor: "transparent",
      textStyle: { fontFamily: "ui-monospace, monospace", fontSize: 10 },
      aria: {
        enabled: true,
        label: {
          description: t(
            "Spring network of project similarities. Drag a node to move it and its connections, or drag empty space to pan. Use Jump to a project for keyboard selection. Positions are navigational, not measured distances.",
          ),
        },
      },
      tooltip: {
        confine: true,
        enterable: false,
        hideDelay: 0,
        padding: 12,
        backgroundColor: "#171717",
        borderColor: "#666",
        textStyle: { color: "#ddd", fontSize: 12 },
        formatter: (params: unknown) => {
          const data = (params as { data?: { id?: string } }).data;
          const node = nodes.find((n) => n.id === data?.id);
          return node?.hover && tooltip.show(`project:${node.id}`)
            ? projectTooltipElement(node.hover, locale)
            : "";
        },
      },
      series: [
        {
          id: "semantic-network",
          type: "graph",
          layout: "force",
          roam: true,
          zoom: viewport.current.network?.zoom ?? 0.55,
          center: viewport.current.network?.center,
          draggable: true,
          selectedMode: "single",
          nodeScaleRatio: 0,
          scaleLimit: { min: 0.3, max: 4 },
          force: interactiveSpringForces(
            repulsion,
            gentle || reducedMotion,
            scale,
          ),
          top: 70,
          bottom: 55,
          left: 55,
          right: 55,
          data: nodes.map((n) => ({
            id: n.id,
            // ECharts selection keys prefer name over id, so titles cannot be used here.
            name: n.id,
            symbolSize: n.diameter,
            itemStyle: {
              color: n.color,
              borderColor: n.color,
              borderWidth: 2,
              opacity: 0.2,
            },
            select: {
              itemStyle: {
                color: selectedPointFill(n.color),
                borderColor: n.color,
              },
            },
            emphasis: { itemStyle: { color: "inherit", borderColor: n.color } },
          })),
          links: edges.map((e) => ({
            source: e.a,
            target: e.b,
            value: e.value,
          })),
          label: {
            show: labels,
            position: "right",
            formatter: (params) =>
              nodes.find((node) => node.id === params.name)?.name ?? "",
            color: "#c6d9e5",
            backgroundColor: "#0b1923e8",
            padding: [3, 5],
          },
          labelLayout: { hideOverlap: true },
          lineStyle: { color: "#58778a", opacity: 0.45, width: 1 },
          select: {
            itemStyle: {
              borderWidth: 4,
              opacity: 1,
            },
            label: { show: true, color: "#fff" },
          },
          emphasis: {
            focus: "none",
            scale: false,
            itemStyle: { opacity: 1 },
            lineStyle: { color: "#65e6f0", opacity: 0.9, width: 1.8 },
            label: { show: labels },
          },
          blur: {
            itemStyle: { opacity: 0.4 },
            lineStyle: { opacity: 0.15 },
            label: { opacity: 0.4 },
          },
        },
      ],
    }),
    [
      nodes,
      edges,
      labels,
      repulsion,
      gentle,
      reducedMotion,
      locale,
      t,
      scale,
      viewport,
      tooltip,
    ],
  );
  const selectProject = useCallback(
    (instance: EChartsType) => {
      const index = nodes.findIndex((node) => node.id === selectedId);
      instance.dispatchAction({
        type: "unselect",
        seriesIndex: 0,
        dataIndex: nodes.map((_, index) => index),
      });
      instance.dispatchAction({ type: "downplay", seriesIndex: 0 });
      if (index >= 0)
        instance.dispatchAction({
          type: "select",
          seriesIndex: 0,
          dataIndex: index,
        });
      instance.dispatchAction({
        type: "highlight",
        seriesIndex: 0,
        dataIndex: nodes.flatMap((node, i) =>
          !highlightedIds.length || highlightedIds.includes(node.id) ? [i] : [],
        ),
      });
    },
    [nodes, selectedId, highlightedIds],
  );
  useEffect(() => {
    if (chart.current && !chart.current.isDisposed())
      selectProject(chart.current);
  }, [selectProject, option]);
  const restoreSelection = () =>
    queueMicrotask(() => {
      if (chart.current && !chart.current.isDisposed())
        selectProject(chart.current);
    });

  return (
    <div className="vs-network">
      <div className="vs-network-controls">
        <label>
          <input
            type="checkbox"
            checked={gentle || reducedMotion}
            disabled={reducedMotion}
            onChange={(event) => setGentle(event.target.checked)}
          />
          {t("Gentle springs ")}
        </label>
        <label>
          {t("Spread ")}
          <select
            value={repulsion}
            onChange={(event) => setRepulsion(Number(event.target.value))}
          >
            <option value={120}>{t("Compact")}</option>
            <option value={260}>{t("Balanced")}</option>
            <option value={520}>{t("Open")}</option>
          </select>
        </label>
      </div>
      <div className="vs-network-plot">
        <EChart
          option={option}
          style={{ width: "100%", height: "100%" }}
          onChartReady={(instance: EChartsType) => {
            chart.current = instance;
            selectProject(instance);
          }}
          onEvents={{
            graphroam: () => {
              const series = (
                chart.current?.getOption().series as
                  { zoom?: number; center?: (number | string)[] }[] | undefined
              )?.[0];
              if (series?.zoom)
                viewport.current.network = {
                  zoom: series.zoom,
                  center: series.center,
                };
            },
            mouseout: () => {
              tooltip.leave();
              restoreSelection();
            },
            globalout: () => {
              tooltip.leave();
              restoreSelection();
            },
            click: (event: { dataType: string; data: { id: string } }) => {
              if (event.dataType === "node") {
                onSelect(event.data.id);
                // Clicking the current story must not toggle its marker off.
                if (event.data.id === selectedId) restoreSelection();
              }
            },
          }}
        />
      </div>
    </div>
  );
}
