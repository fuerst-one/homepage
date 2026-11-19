"use client";
import { WorkChart } from "./WorkChart";

export default function WorkTimelineChart({
  rows,
  locale,
  cumulative = false,
}: {
  rows: { month: string; count: number; projects?: string[] }[];
  locale: string;
  cumulative?: boolean;
}) {
  const de = locale === "de";
  const monthLabel = new Intl.DateTimeFormat(de ? "de-DE" : "en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const numbers = new Intl.NumberFormat(locale);
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
          confine: true,
          formatter: (params: { dataIndex: number }[]) => {
            const row = rows[params[0]?.dataIndex];
            if (!row) return "";
            const unit = de
              ? row.count === 1
                ? "Projekt"
                : "Projekte"
              : row.count === 1
                ? "project"
                : "projects";
            return [
              monthLabel.format(new Date(`${row.month}-01T00:00:00Z`)),
              `${numbers.format(row.count)} ${unit}`,
              ...(row.projects?.length ? ["", ...row.projects] : []),
            ].join("\n");
          },
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
