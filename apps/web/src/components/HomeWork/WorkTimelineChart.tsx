"use client";
import { WorkChart } from "./WorkChart";

export default function WorkTimelineChart({
  rows,
  locale,
  cumulative = false,
}: {
  rows: { month: string; count: number }[];
  locale: string;
  cumulative?: boolean;
}) {
  return (
    <WorkChart
      style={{ height: "100%", width: "100%" }}
      notMerge
      opts={{ renderer: "svg" }}
      option={{
        animation: false,
        backgroundColor: "transparent",
        grid: { left: 42, right: 20, top: 26, bottom: 30 },
        xAxis: {
          type: "category",
          data: rows.map((r) => r.month),
          axisLine: { lineStyle: { color: "#44443b" } },
          axisTick: { show: false },
          axisLabel: {
            color: "#aaa79e",
            fontFamily: "monospace",
            formatter: (v: string) => (v.endsWith("-01") ? v.slice(0, 4) : ""),
            interval: 0,
            hideOverlap: true,
          },
        },
        yAxis: {
          type: "value",
          minInterval: 1,
          splitLine: { lineStyle: { color: "#ffffff0d" } },
          axisLabel: { color: "#aaa79e", fontFamily: "monospace" },
        },
        tooltip: {
          trigger: "axis",
          renderMode: "richText",
          backgroundColor: "#171714",
          borderColor: "#55554b",
          textStyle: { color: "#f0eee8", fontFamily: "monospace" },
          valueFormatter: (v: number) =>
            new Intl.NumberFormat(locale).format(v),
        },
        series: [
          {
            type: cumulative ? "line" : "bar",
            data: rows.map((r) => r.count),
            symbol: "none",
            lineStyle: { color: "#c6dc96", width: 2 },
            itemStyle: { color: "#c6dc96" },
            areaStyle: cumulative ? { color: "#c6dc9615" } : undefined,
            barMaxWidth: 16,
          },
        ],
      }}
    />
  );
}
