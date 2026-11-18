"use client";

import { useAtlasCopy } from "./useAtlasCopy";

import { SPACE_COLORS } from "./spaceTypes";
import type { SpaceConnections } from "./spaceConnections";

export function SpaceClusterGrid({
  groups,
  activeGroup,
  onSelect,
}: {
  groups: SpaceConnections["groups"];
  activeGroup: number;
  onSelect: (index: number) => void;
}) {
  const { t, term } = useAtlasCopy();
  return (
    <div className="vs-clusters" aria-label={t("Project clusters")}>
      {groups.map((group) => (
        <div key={group.index} className="vs-cluster-item">
          <button
            type="button"
            className={`vs-cluster-trigger${activeGroup === group.index ? " is-active" : ""}`}
            onClick={() => onSelect(group.index)}
            aria-controls="vs-inspector"
            aria-label={`${t("Select cluster")} ${group.index + 1}: ${term(group.label)}. ${group.ids.length} ${t("projects")}`}
          >
            <i style={{ background: SPACE_COLORS[group.index] }} />
            <span className="vs-cluster-number">
              {String(group.index + 1).padStart(2, "0")}
            </span>
            <span className="vs-cluster-name">{term(group.label)}</span>
            <small>
              {group.ids.length}{" "}
              {group.ids.length === 1 ? t("project") : t("projects")}
            </small>
          </button>
        </div>
      ))}
    </div>
  );
}
