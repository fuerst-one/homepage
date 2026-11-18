"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, type ComponentProps } from "react";
import type { EChartsOption, EChartsType } from "echarts";
export { graphSpringForces } from "./graphForces";
const LazyEChart = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => <p className="lab-loading">Loading chart…</p>,
});

export function EChart(props: ComponentProps<typeof LazyEChart>) {
  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<EChartsType | null>(null);
  useEffect(() => {
    if (!host.current) return;
    // The library's first size-sensor callback can skip a real viewport change.
    // Observe available space directly, including a return from mobile to desktop.
    const observer = new ResizeObserver(() => {
      const instance = chart.current;
      if (instance && !instance.isDisposed())
        instance.resize({ width: "auto", height: "auto" });
    });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={host}
      style={{
        minWidth: 0,
        width: props.style?.width,
        height: props.style?.height ?? 300,
      }}
    >
      <LazyEChart
        {...props}
        style={{ ...props.style, width: "100%", height: "100%" }}
        autoResize={false}
        onChartReady={(instance: EChartsType) => {
          chart.current = instance;
          props.onChartReady?.(instance);
        }}
      />
    </div>
  );
}
export const INK = "#b8c6c5",
  ACCENT = "#c5f77a",
  TEAL = "#52c8c2";
export const palette = [
  ACCENT,
  TEAL,
  "#9fb5ed",
  "#e3ba87",
  "#cf9ed9",
  "#da8d8b",
];
export const shortName = (name: string) =>
  name.includes("ASCII Plasma")
    ? "ASCII Plasma"
    : name.split(/ - | – | — |, /)[0].trim();
export const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export const baseOption: EChartsOption = {
  backgroundColor: "transparent",
  animation: false,
  textStyle: { fontFamily: "Menlo, monospace", color: INK, fontSize: 11 },
  tooltip: {
    confine: true,
    backgroundColor: "#182421",
    borderColor: "#486254",
    textStyle: { color: "#edf1e8", fontSize: 12 },
  },
  aria: { enabled: true },
};

export function ChartRecords({
  rows,
  onSelect,
}: {
  rows: { label: string; ids: string[] }[];
  onSelect: (label: string, ids: string[]) => void;
}) {
  return (
    <details className="lab-details">
      <summary>Chart values & keyboard selection</summary>
      <div className="lab-chart-table">
        <table>
          <thead>
            <tr>
              <th scope="col">Intersection</th>
              <th scope="col">Projects</th>
              <th scope="col">Inspect</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={JSON.stringify([row.label, row.ids])}>
                <th scope="row">{row.label}</th>
                <td>{row.ids.length}</td>
                <td>
                  <button
                    aria-label={`Inspect ${row.label}`}
                    onClick={() => onSelect(row.label, row.ids)}
                  >
                    Select →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
