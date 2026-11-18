"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@homepage/content/i18n";
import { sectorLabel } from "@homepage/content/projectTaxonomy";
import type { ItemCount } from "../Cv/Projects/Filter/types";
import { projectFacetHref } from "../Cv/Projects/Filter/utils";
import { treemapOption } from "../Cv/Projects/Filter/treemapOptions";
import { WorkChart } from "./WorkChart";

export default function ProjectBreakdownChart({
  items,
  facet,
  label,
  locale,
}: {
  items: ItemCount[];
  facet: "capabilities" | "industries" | "methods";
  label: string;
  locale: Locale;
}) {
  const router = useRouter();
  const option = treemapOption(items, label);
  const display = (value: string) =>
    facet === "industries" ? sectorLabel(value, locale) : value;
  return (
    <WorkChart
      option={{
        ...option,
        tooltip: {
          ...option.tooltip,
          renderMode: "richText",
          formatter: (item: { name: string; value: number }) =>
            `${display(item.name)}: ${item.value}`,
        },
        series: option.series.map((series) => ({
          ...series,
          nodeClick: false,
          data: series.data.map((item, index) => {
            const color =
              item.itemStyle?.color ??
              option.color[index % option.color.length];
            const rgb = [1, 3, 5].map((offset) =>
              parseInt(color.slice(offset, offset + 2), 16),
            );
            const brightness =
              (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
            return {
              ...item,
              itemStyle: { ...item.itemStyle, color },
              label: { color: brightness >= 145 ? "#10100e" : "#fff" },
            };
          }),
          label: {
            ...series.label,
            // A concrete font lets ECharts measure text as it appears in SVG.
            fontFamily: "monospace",
            fontSize: 11,
            lineHeight: 15,
            padding: 4,
            overflow: "truncate",
            textBorderWidth: 0,
            formatter: (item: { name: string; value: number }) =>
              `${display(item.name)}\n${item.value}`,
          },
        })),
      }}
      opts={{ renderer: "svg" }}
      style={{ height: "100%", width: "100%" }}
      onEvents={{
        click: (item: { name: string }) => {
          if (items.some((entry) => entry.itemKey === item.name))
            router.push(projectFacetHref(facet, item.name, locale));
        },
      }}
    />
  );
}
