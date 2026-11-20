import { FilterConfig } from "./types";
import { CvProject } from "@homepage/content/models";
import { getFilterOptionCounts } from "./utils";
import { ClientChartWrapper } from "./ClientChartWrapper";
import { treemapOption } from "./treemapOptions";
import { facetColor, type FacetPalette } from "../facetColors";

export const TreemapFilter = ({
  filterConfig,
  projects,
  palette,
}: {
  filterConfig: FilterConfig;
  projects: CvProject[];
  palette: FacetPalette;
}) => {
  const { projectKey } = filterConfig;
  const itemCounts = getFilterOptionCounts(projects, projectKey).map(
    (item) => ({ ...item, color: facetColor(palette, item.itemKey) }),
  );
  return (
    <div className="h-full min-h-0 w-full">
      <div className="h-full w-full overflow-hidden">
        <ClientChartWrapper
          projectKey={projectKey}
          chartProps={{ option: treemapOption(itemCounts, filterConfig.label) }}
        />
      </div>
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
