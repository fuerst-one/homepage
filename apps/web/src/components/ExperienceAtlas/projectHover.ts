import type { AtlasProject } from "./model";

export type ProjectHoverDetails = {
  title: string;
  description: string;
  rows: { label: string; value: string }[];
};

export function projectHoverDetails(
  project: Pick<
    AtlasProject,
    "name" | "subtitle" | "summary" | "industries" | "ownership" | "wowFactor"
  >,
  group: number,
  count: number,
): ProjectHoverDetails {
  const description = (project.subtitle || project.summary).trim();
  const rows: ProjectHoverDetails["rows"] = [];
  if (project.industries.length)
    rows.push({ label: "Industry", value: project.industries.join(" · ") });
  if (project.ownership)
    rows.push({ label: "Contribution", value: project.ownership });
  if (group >= 0)
    rows.push({
      label: "Cluster",
      value: `${String(group + 1).padStart(2, "0")} · ${count} ${count === 1 ? "project" : "projects"}`,
    });
  if (project.wowFactor !== null)
    rows.push({ label: "Wow factor", value: `${project.wowFactor}/10` });
  return {
    title: project.name,
    description:
      description.length > 180 ? `${description.slice(0, 179)}…` : description,
    rows,
  };
}

/** ECharts accepts DOM content. textContent keeps every recorded field inert. */
export function projectTooltipElement(
  details: ProjectHoverDetails,
): HTMLElement {
  const element = document.createElement("div");
  element.className = "vs-project-tooltip";
  const title = document.createElement("strong");
  title.textContent = details.title;
  element.append(title);
  if (details.description) {
    const description = document.createElement("p");
    description.textContent = details.description;
    element.append(description);
  }
  const facts = document.createElement("dl");
  for (const row of details.rows) {
    const item = document.createElement("div");
    const label = document.createElement("dt");
    label.textContent = row.label;
    const value = document.createElement("dd");
    value.textContent = row.value;
    item.append(label, value);
    facts.append(item);
  }
  element.append(facts);
  const hint = document.createElement("small");
  hint.textContent = "Click to explore this project";
  element.append(hint);
  return element;
}
