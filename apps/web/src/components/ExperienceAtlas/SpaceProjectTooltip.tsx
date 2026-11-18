"use client";

import { useAtlasCopy } from "./useAtlasCopy";
import type { ProjectHoverDetails } from "./projectHover";

export function SpaceProjectTooltip({
  details,
  compact = false,
}: {
  details: ProjectHoverDetails;
  compact?: boolean;
}) {
  const { t } = useAtlasCopy();
  return (
    <div
      className="vs-cluster-tooltip vs-spatial-tooltip vs-project-tooltip"
      role="tooltip"
      data-space-tooltip="project"
    >
      <strong>{details.title}</strong>
      {details.description && (
        <p lang={details.contentLocale}>{details.description}</p>
      )}
      {!compact && (
        <dl>
          {details.rows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {!compact && <small>{t("Click to explore this project")}</small>}
    </div>
  );
}
