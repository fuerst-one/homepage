import { ArrowUpRight } from "lucide-react";
import type { KeyboardEvent, PointerEvent } from "react";
import type { AtlasProject } from "./model";
import { SPACE_COLORS } from "./spaceTypes";
import type { ConnectionMode, SpaceConnections } from "./spaceConnections";

export function SpaceConnectionSidebar({
  model,
  mode,
  onMode,
  projectById,
  numeric,
  structured,
  emptyReason,
  onSelect,
  onHover,
  onFocus,
}: {
  model?: SpaceConnections;
  mode: ConnectionMode;
  onMode: (mode: ConnectionMode) => void;
  projectById: Map<string, AtlasProject>;
  numeric: boolean;
  structured?: boolean;
  emptyReason?: string;
  onSelect: (id: string) => void;
  onHover: (group: number | null) => void;
  onFocus: (group: number | null) => void;
}) {
  const crossIndustry = model?.crossIndustry;
  const crossProject = crossIndustry && projectById.get(crossIndustry.id);
  const scoreLabel = numeric || structured ? "Proximity" : "Cosine similarity";
  const preview = (group: number) => ({
    // Reordering cards under a stationary pointer must not preview a new group.
    onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType !== "touch") onHover(group);
    },
    onPointerLeave: () => onHover(null),
    onFocus: () => onFocus(group),
    onBlur: () => onFocus(null),
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "Escape") {
        onHover(null);
        onFocus(null);
        event.currentTarget.blur();
      }
    },
  });
  return (
    <div className="vs-connections">
      {mode === "clusters" && crossIndustry && crossProject && !emptyReason && (
        <section className="vs-transfer" aria-label="Cross-industry connection">
          <p className="vs-kicker">ACROSS INDUSTRIES</p>
          <button type="button" onClick={() => onSelect(crossProject.id)}>
            <strong>{crossProject.name}</strong>
            <ArrowUpRight size={14} />
          </button>
          <p>
            {crossIndustry.sourceSectors.join(" / ")} →{" "}
            {crossIndustry.targetSectors.join(" / ")}
          </p>
          {crossIndustry.evidence.slice(0, 1).map((fact) => (
            <p key={fact.label}>
              <b>{fact.label}</b>
              {fact.values.slice(0, 2).join(" · ")}
            </p>
          ))}
        </section>
      )}
      {!!model?.identicalIds.length && !emptyReason && (
        <details className="vs-identical">
          <summary>
            {model.identicalIds.length + 1} projects share this profile
          </summary>
          <p>
            These inputs produce the same position. Select each project to see
            its individual work.
          </p>
          {model.identicalIds.map((id) => (
            <button type="button" key={id} onClick={() => onSelect(id)}>
              {projectById.get(id)?.label ?? id}
              <ArrowUpRight size={12} />
            </button>
          ))}
        </details>
      )}
      <div
        className="vs-connection-modes"
        role="group"
        aria-label="Connection perspective"
      >
        <button
          type="button"
          aria-pressed={mode === "members"}
          onClick={() => onMode("members")}
        >
          Same cluster
        </button>
        <button
          type="button"
          aria-pressed={mode === "clusters"}
          onClick={() => onMode("clusters")}
        >
          Across clusters
        </button>
        <button
          type="button"
          aria-pressed={mode === "nearest"}
          onClick={() => onMode("nearest")}
        >
          Closest matches
        </button>
      </div>
      {emptyReason ? (
        <p className="vs-exclusion">{emptyReason}</p>
      ) : (
        model &&
        (mode === "members" ? (
          <>
            <div className="vs-neighbours-heading">
              <h4>Other cluster members</h4>
              <span>{model.members.length} projects</span>
            </div>
            <p className="vs-connection-intro">
              {model.groups[model.selectedGroup]?.label}
            </p>
            <div
              className="vs-connection-scroll vs-members"
              role="region"
              aria-label="Other cluster members"
              tabIndex={0}
            >
              <ul>
                {model.members.map((member) => {
                  const project = projectById.get(member.id);
                  return (
                    project && (
                      <li key={member.id}>
                        <button
                          type="button"
                          onClick={() => onSelect(member.id)}
                          aria-label={`Explore ${project.label}`}
                        >
                          <i
                            style={{
                              background: SPACE_COLORS[model.selectedGroup],
                            }}
                          />
                          <span>
                            <strong>{project.label}</strong>
                            <small>
                              {member.shared.slice(0, 2).join(" · ") ||
                                project.subtitle}
                            </small>
                          </span>
                          <ArrowUpRight size={12} />
                        </button>
                      </li>
                    )
                  );
                })}
              </ul>
              {!model.members.length && (
                <p className="vs-exclusion">
                  No other projects in this cluster.
                </p>
              )}
            </div>
          </>
        ) : mode === "clusters" ? (
          <>
            <div className="vs-neighbours-heading">
              <h4>Connections across clusters</h4>
            </div>
            <p className="vs-connection-intro">
              The closest project in each other group.
            </p>
            {model.bridges.length ? (
              <div
                className="vs-connection-scroll"
                role="region"
                aria-label="Connections across clusters"
                tabIndex={0}
              >
                <ol className="vs-bridges">
                  {model.bridges.map((bridge) => {
                    const project = projectById.get(bridge.id);
                    if (!project) return null;
                    const group = model.groups[bridge.group];
                    return (
                      <li key={bridge.group}>
                        <button
                          type="button"
                          {...preview(bridge.group)}
                          onClick={() => onSelect(bridge.id)}
                          aria-label={`Explore ${project.label}, closest project in cluster ${bridge.group + 1}, ${group.ids.length} projects`}
                          aria-describedby={`vs-bridge-shared-${project.id}`}
                        >
                          <span className="vs-cluster-heading">
                            <i
                              style={{ background: SPACE_COLORS[bridge.group] }}
                            />
                            CLUSTER {String(bridge.group + 1).padStart(2, "0")}
                            <small>{group.ids.length} projects</small>
                          </span>
                          <strong>
                            {project.name} <ArrowUpRight size={13} />
                          </strong>
                          <span
                            className="vs-bridge-shared"
                            id={`vs-bridge-shared-${project.id}`}
                          >
                            <b>Shared</b>
                            {bridge.shared.length
                              ? bridge.shared.slice(0, 2).join(" · ")
                              : "No shared recorded tags"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ) : (
              <p className="vs-exclusion">
                No separate clusters to compare in this selection. Closest
                matches still lets you explore individual projects.
              </p>
            )}
          </>
        ) : (
          <>
            <div className="vs-neighbours-heading">
              <h4>Closest in this lens</h4>
              <span>{numeric || structured ? "proximity ↗" : "cosine ↗"}</span>
            </div>
            <ol className="vs-neighbours">
              {model.nearest.map((neighbour, index) => {
                const project = projectById.get(neighbour.id);
                if (!project) return null;
                return (
                  <li key={neighbour.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(neighbour.id)}
                      aria-label={`Select neighbour ${project.label}`}
                      aria-describedby={`vs-neighbour-context-${project.id} vs-neighbour-score-${project.id}`}
                    >
                      <span className="vs-rank">0{index + 1}</span>
                      <span className="vs-neighbour-copy">
                        <strong>{project.name}</strong>
                        <small id={`vs-neighbour-context-${project.id}`}>
                          {neighbour.shared.length
                            ? neighbour.shared.slice(0, 2).join(" · ")
                            : "No shared recorded tags"}
                        </small>
                        <span className="vs-similarity-track">
                          <i
                            style={{
                              width: `${Math.max(0, Math.min(1, neighbour.similarity)) * 100}%`,
                            }}
                          />
                        </span>
                      </span>
                      <span
                        className="vs-score"
                        id={`vs-neighbour-score-${project.id}`}
                      >
                        <span className="vs-sr-only">{scoreLabel} </span>
                        {neighbour.similarity.toFixed(3)}
                        <ArrowUpRight size={12} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </>
        ))
      )}
      {model && !emptyReason && (
        <p className="vs-ranking-note">
          Compared in the full space. Map positions are approximate.
        </p>
      )}
    </div>
  );
}

export function SpaceClusterSidebar({
  group,
  projectById,
  onSelect,
}: {
  group: SpaceConnections["groups"][number];
  projectById: Map<string, AtlasProject>;
  onSelect: (id: string) => void;
}) {
  return (
    <section
      className="vs-cluster-detail"
      aria-label={`Cluster ${group.index + 1} projects`}
    >
      <p className="vs-kicker">
        <i style={{ background: SPACE_COLORS[group.index] }} />
        CLUSTER {String(group.index + 1).padStart(2, "0")} · {group.ids.length}{" "}
        PROJECTS
      </p>
      <h3>{group.label}</h3>
      <p className="vs-connection-intro">
        Recorded traits in this group. Select a project to explore its
        individual contribution.
      </p>
      <div className="vs-cluster-traits">
        {group.terms.slice(0, 6).map((item) => (
          <span key={item.term}>
            {item.term}
            <small>
              {item.count}/{item.total}
            </small>
          </span>
        ))}
      </div>
      <div className="vs-members">
        <h4>Projects in this cluster</h4>
        <ul>
          {group.ids.map((id) => {
            const project = projectById.get(id);
            return (
              project && (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => onSelect(id)}
                    aria-label={`Explore ${project.label}`}
                  >
                    <i style={{ background: SPACE_COLORS[group.index] }} />
                    <span>
                      <strong>{project.label}</strong>
                      <small>{project.subtitle || project.ownership}</small>
                    </span>
                    <ArrowUpRight size={12} />
                  </button>
                </li>
              )
            );
          })}
        </ul>
      </div>
    </section>
  );
}
