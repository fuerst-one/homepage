import { Fragment } from "react";
import { Progress } from "../../../ui/progress";
import { Tag } from "../Tag";
import { FilterConfig } from "./types";
import { getFilterOptionCounts } from "./utils";
import { CvProject } from "@homepage/content/models";
import maxBy from "lodash/maxBy";
import type { CSSProperties } from "react";
import { facetColor, type FacetPalette } from "../facetColors";

export const BarChartFilter = ({
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
  const maxCount = maxBy(itemCounts, "count")?.count ?? 0;

  if (!itemCounts.length || maxCount === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xs text-neutral-500">
        No data available yet
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto pr-1">
      <div className="flex flex-col gap-2 text-xs text-neutral-200">
        {itemCounts.map(({ itemKey, count }) => (
          <Fragment key={itemKey}>
            <Tag
              searchParamKey={projectKey}
              value={itemKey}
              className="flex items-center gap-0.5 border-none py-0"
            >
              <span className="w-1/2 flex-shrink-0 overflow-hidden text-ellipsis whitespace-nowrap">
                {itemKey} <span className="text-neutral-400">({count})</span>
              </span>
              <Progress
                value={(count / maxCount) * 100}
                className="h-1.5 bg-white/10"
                indicatorClassName="bg-[var(--facet-color)]"
                style={
                  {
                    "--facet-color": facetColor(palette, itemKey),
                  } as CSSProperties
                }
              />
            </Tag>
          </Fragment>
        ))}
      </div>
    </div>
  );
};
