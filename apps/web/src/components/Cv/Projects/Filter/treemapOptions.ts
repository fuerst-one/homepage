import type { ItemCount } from "./types";

export const TREEMAP_ITEMS_MAX = 12;
const GRAYSCALE_PALETTE = [
  "#f5f5f5",
  "#dcdcdc",
  "#bdbdbd",
  "#a0a0a0",
  "#878787",
  "#6e6e6e",
  "#575757",
  "#454545",
  "#363636",
  "#2a2a2a",
  "#1f1f1f",
  "#161616",
];

/** Shared chart presentation for sidebar filters and homepage project views. */
/** Chart items keep their stored value as name, so clicks filter by it; labelOf only changes what is shown. */
export function treemapOption(
  items: ItemCount[],
  label: string,
  labelOf: (value: string) => string = (value) => value,
) {
  return {
    tooltip: {
      trigger: "item",
      formatter: ({ name, value }: { name: string; value: number }) =>
        `${labelOf(name)}: ${value}`,
      backgroundColor: "#000",
      borderColor: "#fff",
      confine: true,
      textStyle: { color: "#fff" },
    },
    color: GRAYSCALE_PALETTE,
    series: [
      {
        name: label,
        type: "treemap",
        data: items
          .slice(0, TREEMAP_ITEMS_MAX)
          .map(({ itemKey, count, color }) => ({
            name: itemKey,
            value: count,
            ...(color ? { itemStyle: { color } } : {}),
          })),
        roam: false,
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        itemStyle: { borderColor: "#000", borderWidth: 1 },
        label: {
          show: true,
          formatter: ({ name }: { name: string }) => labelOf(name),
          fontSize: 10,
          color: "#fff",
          textBorderColor: "#000",
          textBorderWidth: 2,
          fontFamily: "var(--font-plex), monospace",
        },
        breadcrumb: { show: false },
      },
    ],
  };
}
