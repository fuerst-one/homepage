"use client";
import { useEffect, useRef, useState } from "react";
import { WorkChart } from "./WorkChart";
import type {
  WorkProject,
  WorkGroup,
  landscapePoints,
} from "@homepage/content/workPortfolio";

export type LandscapeProps = {
  projects: WorkProject[];
  points: ReturnType<typeof landscapePoints>;
  groups: WorkGroup[];
  selectedId: string;
  matchingIds: string[];
  onSelect: (id: string) => void;
};
export default function WorkLandscapePlot({
  projects,
  points,
  groups,
  selectedId,
  matchingIds,
  onSelect,
}: LandscapeProps) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(700);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const narrow = width < 480;
  const rows = Math.ceil(groups.length / 2);
  const rowHeight = 4.3 / Math.max(rows, 1);
  const displayed = points.map((point) => {
    if (!narrow) return point;
    const index = groups.findIndex((g) => g.id === point.group);
    const center: [number, number, number] = [
      index % 2 ? 1.5 : -1.5,
      ((rows - 1) / 2 - Math.floor(index / 2)) * rowHeight,
      0,
    ];
    return {
      ...point,
      center,
      position: [
        center[0] + point.position[0] - point.center[0],
        center[1] +
          (point.position[1] - point.center[1]) * Math.min(1, rowHeight * 0.4) -
          rowHeight * 0.12,
        0,
      ],
    };
  });
  const byId = new Map(projects.map((p) => [p.id, p]));
  const active = new Set(matchingIds);
  return (
    <div ref={container} style={{ height: "100%", width: "100%" }}>
      <WorkChart
        style={{ height: "100%", width: "100%" }}
        opts={{ renderer: "svg" }}
        notMerge
        option={{
          animation: false,
          backgroundColor: "transparent",
          grid: {
            top: 52,
            right: narrow ? 12 : 46,
            bottom: 35,
            left: narrow ? 12 : 46,
          },
          xAxis: { type: "value", show: false, min: -3.2, max: 3.2 },
          yAxis: { type: "value", show: false, min: -2.4, max: 2.4 },
          tooltip: {
            trigger: "item",
            renderMode: "richText",
            formatter: (p: { data: { name?: string } }) => p.data.name ?? "",
            backgroundColor: "#171714",
            borderColor: "#55554b",
            textStyle: { color: "#f0eee8", fontFamily: "monospace" },
          },
          series: [
            {
              type: "scatter",
              silent: true,
              symbolSize: 0,
              data: groups.flatMap((g) => {
                const point = displayed.find((p) => p.group === g.id);
                return point
                  ? [
                      {
                        value: [
                          point.center[0],
                          point.center[1] + (narrow ? rowHeight * 0.46 : 0.66),
                        ],
                        name: g.label,
                        label: {
                          show: true,
                          formatter: g.label,
                          color: g.color,
                          fontFamily: "monospace",
                          fontSize: 10,
                          width: narrow ? (width - 36) / 2 : 130,
                          overflow: "breakAll",
                          align: "center",
                        },
                      },
                    ]
                  : [];
              }),
            },
            {
              type: "scatter",
              data: displayed.map((p) => ({
                id: p.id,
                name: byId.get(p.id)?.label,
                value: p.position.slice(0, 2),
                symbolSize: p.id === selectedId ? 19 : 11,
                itemStyle: {
                  color: p.color,
                  opacity: active.has(p.id) ? 0.9 : 0.18,
                  borderColor: p.id === selectedId ? "#ffffff" : "#141412",
                  borderWidth: p.id === selectedId ? 2 : 1,
                },
                label: {
                  show: p.id === selectedId && !narrow,
                  formatter: byId.get(p.id)?.label,
                  position: "bottom",
                  distance: 10,
                  color: "#f5f3eb",
                  fontFamily: "monospace",
                  backgroundColor: "#141412",
                  padding: [5, 8],
                  width: narrow ? 110 : 200,
                  overflow: "truncate",
                },
              })),
              emphasis: {
                label: {
                  show: true,
                  formatter: "{b}",
                  color: "#fff",
                  position: "bottom",
                  backgroundColor: "#141412",
                  padding: 5,
                },
              },
            },
          ],
        }}
        onEvents={{
          click: (p: { data?: { id?: string } }) => {
            if (p.data?.id) onSelect(p.data.id);
          },
        }}
      />
    </div>
  );
}
