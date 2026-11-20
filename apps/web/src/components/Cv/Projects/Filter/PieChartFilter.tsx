import { ClientChartWrapper } from "./ClientChartWrapper";
import { FilterConfig } from "./types";
import { getFilterOptionCounts } from "./utils";
import { CvProject } from "@homepage/content/models";
import { facetColor, type FacetPalette } from "../facetColors";

export const PieChartFilter = ({
  filterConfig,
  projects,
  palette,
}: {
  filterConfig: FilterConfig;
  projects: CvProject[];
  palette: FacetPalette;
}) => {
  const { projectKey } = filterConfig;
  const itemCounts = getFilterOptionCounts(projects, projectKey);

  const data = itemCounts.map(({ itemKey, count }) => ({
    name: itemKey,
    value: count,
    itemStyle: {
      color: facetColor(palette, itemKey),
      borderColor: "#000",
      borderWidth: 1,
    },
  }));

  const seriesColors = data.map((d) => d.itemStyle.color);

  return (
    <div className="h-full min-h-0 w-full">
      <ClientChartWrapper
        projectKey={projectKey}
        chartProps={{
          notMerge: true,
          option: {
            tooltip: {
              trigger: "item",
              formatter: "{b}: {c} ({d}%)",
              backgroundColor: "#000",
              borderColor: "#fff",
              confine: true,
              textStyle: { color: "#fff" },
            },
            series: [
              {
                name: filterConfig.label,
                type: "pie",
                colorBy: "data",
                color: seriesColors,
                radius: "95%",
                center: ["50%", "50%"],
                data: data,
                label: {
                  position: "inside",
                  color: "#fff",
                  textBorderColor: "#000",
                  textBorderWidth: 2,
                  fontFamily: "var(--font-plex), monospace",
                  fontSize: 11,
                },
              },
            ],
          },
        }}
      />
      <dl className="hidden">
        {itemCounts.map(({ itemKey, count }) => (
          <div key={itemKey}>
            <dt>{itemKey}</dt>
            <dd>{count}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};
