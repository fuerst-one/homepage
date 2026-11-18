import type { SpaceConnections } from "./spaceConnections";

/** The 2D chart uses the same recorded fields as the 3D card. */
export function clusterTooltipElement(
  group: SpaceConnections["groups"][number],
): HTMLElement {
  const element = document.createElement("div");
  element.className = "vs-cluster-tooltip-body";
  const title = document.createElement("strong");
  title.textContent = group.label;
  element.append(title);
  const count = document.createElement("span");
  count.textContent = `${group.ids.length} projects · recorded traits`;
  element.append(count);
  for (const term of group.terms.slice(0, 4)) {
    const row = document.createElement("span");
    row.textContent = term.term;
    const value = document.createElement("b");
    value.textContent = `${term.count}/${term.total}`;
    row.append(value);
    element.append(row);
  }
  const hint = document.createElement("small");
  hint.textContent = "Click to explore this cluster";
  element.append(hint);
  return element;
}

export function SpaceClusterTooltip({
  group,
  id,
  className = "",
}: {
  group: SpaceConnections["groups"][number];
  id?: string;
  className?: string;
}) {
  return (
    <div className={`vs-cluster-tooltip ${className}`} role="tooltip" id={id}>
      <strong>{group.label}</strong>
      <span>{group.ids.length} projects · recorded traits</span>
      {group.terms.slice(0, 4).map((term) => (
        <span key={term.term}>
          {term.term}
          <b>
            {term.count}/{term.total}
          </b>
        </span>
      ))}
      <small>Click to explore this cluster</small>
    </div>
  );
}
