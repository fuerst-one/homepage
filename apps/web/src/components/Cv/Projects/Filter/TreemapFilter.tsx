import { FilterConfig } from "./types";
import { CvProject } from "@homepage/content/models";
import { getFilterOptionCounts } from "./utils";
import { ClientChartWrapper } from "./ClientChartWrapper";
import { treemapOption } from "./treemapOptions";

export const TreemapFilter = ({
  filterConfig,
  projects,
}: {
  filterConfig: FilterConfig;
  projects: CvProject[];
}) => {
  const { projectKey } = filterConfig;
  const itemCounts = getFilterOptionCounts(projects, projectKey);
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
