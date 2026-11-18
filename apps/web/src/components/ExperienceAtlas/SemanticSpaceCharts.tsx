"use client";

import { useAtlasCopy } from "./useAtlasCopy";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { CustomSeriesOption, EChartsOption, EChartsType } from "echarts";
import { EChart } from "../ProjectLab/chartPrimitives";
import type { SemanticSpace } from "./spaceTypes";
import { SemanticNetwork } from "./SemanticNetwork";
import {
  projectTooltipElement,
  type ProjectHoverDetails,
} from "./projectHover";
import { selectedPointFill } from "./spacePointStyle";
import { paddedHull2d } from "./clusterHulls";
import { axisEndLabel, type AxisDescription } from "./spaceAxes";
import { useReducedMotion } from "./useReducedMotion";
import { SPACE_TRANSITION_MS } from "./spaceMotion";
import type { SpaceViewport } from "./spaceViewport";
import { clusterTooltipElement } from "./SpaceClusterTooltip";
import type { SpaceConnections } from "./spaceConnections";
import { useChartTooltip } from "./useChartTooltip";
import { chartTooltipPosition } from "./spaceTooltip";

export type SpaceNode = {
  id: string;
  name: string;
  label: string;
  color: string;
  xy: number[];
  xyz: number[];
  group: number;
  wowFactor: number | null;
  diameter: number;
  hover?: ProjectHoverDetails;
};

export function SemanticSpaceCharts({
  nodes,
  viewport,
  space,
  groups,
  selectedId,
  neighbours,
  highlightedIds,
  activeGroup,
  clusterSelected,
  view,
  labels,
  hulls,
  axes,
  onSelect,
  onClusterSelect,
}: {
  nodes: SpaceNode[];
  viewport: RefObject<SpaceViewport>;
  space: SemanticSpace;
  groups: SpaceConnections["groups"];
  selectedId: string;
  neighbours: string[];
  highlightedIds: string[];
  activeGroup: number;
  clusterSelected: boolean;
  view: "2d" | "network";
  labels: boolean;
  hulls: boolean;
  axes: AxisDescription[];
  onSelect: (id: string) => void;
  onClusterSelect: (index: number) => void;
}) {
  const { locale, t } = useAtlasCopy();
  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<EChartsType | null>(null);
  const tooltip = useChartTooltip(chart, nodes);
  const [hoveredCluster, setHoveredCluster] = useState<{
    index: number;
    nodes: SpaceNode[];
  } | null>(null);
  const preview =
    hoveredCluster?.nodes === nodes && hulls && view === "2d"
      ? groups.find((group) => group.index === hoveredCluster.index)
      : undefined;
  const visibleGroup = preview?.index ?? activeGroup;
  const reducedMotion = useReducedMotion();
  const [size, setSize] = useState({ width: 800, height: 500 });
  useEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  // Match units per pixel on both axes: a wide plot must not stretch geometry.
  const aspect = Math.max(1, size.width - 130) / Math.max(1, size.height - 127);
  const yExtent =
    Math.max(
      0.01,
      ...nodes.map((n) => Math.abs(n.xy[1])),
      ...nodes.map((n) => Math.abs(n.xy[0]) / aspect),
    ) * 1.18;
  const networkScale = Math.max(
    0.35,
    Math.min(1.25, Math.min(size.width - 110, size.height - 110) / 500),
  );
  const near = new Set(neighbours);
  const highlighted = new Set(preview?.ids ?? highlightedIds);
  const envelopes: CustomSeriesOption[] = hulls
    ? [...new Set(nodes.map((node) => node.group))]
        .filter((group) => group >= 0)
        .map((group) => {
          const members = nodes.filter((node) => node.group === group);
          return {
            type: "custom",
            id: `cluster-${members
              .map((n) => n.id)
              .sort()
              .join(":")}`,
            silent: false,
            z: 1,
            data: [{ value: [0, 0], cluster: group }],
            renderItem: (_params, api) => ({
              type: "polygon",
              transition: ["shape", "style"],
              enterFrom: { shape: {}, style: { opacity: 0 } },
              leaveTo: { shape: {}, style: { opacity: 0 } },
              shape: {
                points: paddedHull2d(
                  members.map((node) => api.coord(node.xy)),
                  Math.max(...members.map((node) => node.diameter)) / 2 + 6,
                ),
              },
              style: {
                opacity: 1,
                fill: members[0].color,
                fillOpacity:
                  group === visibleGroup
                    ? 0.085
                    : clusterSelected
                      ? 0.009
                      : 0.035,
                stroke: members[0].color,
                strokeOpacity:
                  group === visibleGroup ? 0.5 : clusterSelected ? 0.06 : 0.18,
                lineWidth: 1,
              },
            }),
          };
        })
    : [];
  const axisName = (index: number) =>
    axes[index]?.label ??
    `${axisEndLabel(axes[index]?.negative ?? null, 21)} ↔\n${axisEndLabel(axes[index]?.positive ?? null, 21)}`;
  const option: EChartsOption = {
    animation: !reducedMotion,
    animationDuration: SPACE_TRANSITION_MS,
    animationDurationUpdate: SPACE_TRANSITION_MS,
    animationEasingUpdate: "cubicInOut",
    backgroundColor: "transparent",
    textStyle: {
      fontFamily: "ui-monospace, monospace",
      color: "#8ba3b6",
      fontSize: 10,
    },
    tooltip: {
      position: (point, _params, _dom, _rect, size) =>
        chartTooltipPosition(point, size),
      transitionDuration: 0,
      confine: true,
      enterable: false,
      hideDelay: 0,
      padding: 12,
      backgroundColor: "rgba(16, 16, 16, 0.75)",
      extraCssText:
        "-webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px)",
      borderColor: "#666",
      textStyle: { color: "#ddd", fontSize: 12 },
      formatter: (params: unknown) => {
        const data = (params as { data?: { id?: string; cluster?: number } })
          .data;
        const node = nodes.find((n) => n.id === data?.id);
        if (!node && data?.cluster !== undefined) {
          const group = groups.find((item) => item.index === data.cluster);
          return group && tooltip.show(`cluster:${group.index}`)
            ? clusterTooltipElement(group, locale)
            : "";
        }
        return node?.hover && tooltip.show(`project:${node.id}`)
          ? projectTooltipElement(node.hover, locale)
          : "";
      },
    },
    aria: {
      enabled: true,
      label: {
        description: t(
          "Project similarity space. Use the project selector, cluster previews or sidebar connections for keyboard navigation.",
        ),
      },
    },
    grid: { left: 65, right: 65, top: 65, bottom: 62 },
    xAxis: {
      type: "value" as const,
      name: axisName(0),
      min: -yExtent * aspect,
      max: yExtent * aspect,
      nameLocation: "middle" as const,
      nameGap: 32,
      nameTextStyle: { color: "#b5b5b5", lineHeight: 13 },
      splitLine: {
        lineStyle: { color: "#192d3a", type: "dotted" as const },
      },
      axisLabel: { formatter: (v: number) => v.toFixed(1) },
    },
    yAxis: {
      type: "value" as const,
      name: axisName(1),
      nameLocation: "middle" as const,
      nameRotate: 90,
      nameGap: 38,
      nameTextStyle: { color: "#b5b5b5", lineHeight: 13 },
      min: -yExtent,
      max: yExtent,
      splitLine: {
        lineStyle: { color: "#192d3a", type: "dotted" as const },
      },
      axisLabel: { formatter: (v: number) => v.toFixed(1) },
    },
    series: [
      ...envelopes,
      {
        id: "project-points",
        type: "scatter" as const,
        z: 2,
        clip: false,
        data: nodes.map((n) => ({
          id: n.id,
          name: n.name,
          value: n.xy,
          symbolSize: n.diameter,
          itemStyle: {
            color: n.color,
            opacity:
              !highlighted.size || highlighted.has(n.id)
                ? 1
                : clusterSelected
                  ? 0.16
                  : 0.38,
            borderColor: n.color,
            borderWidth: 0,
          },
          label: {
            show: n.id !== selectedId && (labels || near.has(n.id)),
            formatter: n.name,
            position: "top" as const,
            color: n.id === selectedId ? "#ffffff" : "#adc3d1",
            backgroundColor: "#0b1923d9",
            padding: [3, 5],
            opacity:
              !highlighted.size || highlighted.has(n.id)
                ? 1
                : clusterSelected
                  ? 0.25
                  : 0.6,
          },
        })),
        labelLayout: { hideOverlap: true },
        emphasis: {
          scale: false,
          itemStyle: { opacity: 1, color: "inherit" },
          label: { show: true, opacity: 1 },
        },
      },
      {
        // Separate overlay keeps identical profiles from covering the selection.
        id: "project-selection",
        type: "scatter" as const,
        z: 5,
        clip: false,
        data: nodes
          .filter((node) => node.id === selectedId)
          .map((node) => ({
            id: node.id,
            name: node.name,
            value: node.xy,
            symbolSize: node.diameter,
            itemStyle: {
              color: selectedPointFill(node.color),
              opacity: 1,
              borderColor: node.color,
              borderWidth: 2,
            },
            label: {
              show: true,
              formatter: node.name,
              position: "top" as const,
              color: "#fff",
              backgroundColor: "#0b1923d9",
              padding: [3, 5],
            },
          })),
        emphasis: { scale: false, itemStyle: { color: "inherit" } },
      },
    ],
  };
  return (
    <div ref={host} style={{ width: "100%", height: "100%" }}>
      {view === "network" ? (
        <SemanticNetwork
          viewport={viewport}
          nodes={nodes}
          edges={space.edges}
          selectedId={selectedId}
          highlightedIds={highlightedIds}
          labels={labels}
          scale={networkScale}
          onSelect={onSelect}
        />
      ) : (
        <EChart
          option={option}
          replaceMerge={["series"]}
          style={{ width: "100%", height: "100%" }}
          onChartReady={(instance: EChartsType) => {
            chart.current = instance;
          }}
          onEvents={{
            mouseover: (event: { data?: { cluster?: number } }) => {
              setHoveredCluster(
                event.data?.cluster === undefined
                  ? null
                  : { index: event.data.cluster, nodes },
              );
            },
            mouseout: () => {
              tooltip.leave();
              setHoveredCluster(null);
            },
            globalout: () => {
              tooltip.leave();
              setHoveredCluster(null);
            },
            click: (event: { data?: { id?: string; cluster?: number } }) => {
              if (event.data?.id && nodes.some((n) => n.id === event.data!.id))
                onSelect(event.data.id);
              else if (
                event.data?.cluster !== undefined &&
                groups.some((group) => group.index === event.data!.cluster)
              )
                onClusterSelect(event.data.cluster);
            },
          }}
        />
      )}
    </div>
  );
}
