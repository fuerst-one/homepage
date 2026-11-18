import type { AtlasProject } from "./model";
import type { Locale } from "@homepage/content/i18n";
import { atlasText, atlasTerm, atlasCount } from "./atlasCopy";

export type ProjectHoverDetails = {
  title: string;
  description: string;
  contentLocale?: Locale;
  rows: { label: string; value: string }[];
};

export function projectHoverDetails(
  project: Pick<
    AtlasProject,
    | "name"
    | "subtitle"
    | "summary"
    | "industries"
    | "ownership"
    | "wowFactor"
    | "presentation"
  >,
  group: number,
  count: number,
  locale: Locale = "en",
): ProjectHoverDetails {
  const description = (
    project.presentation?.description ||
    project.subtitle ||
    project.summary
  ).trim();
  const rows: ProjectHoverDetails["rows"] = [];
  if (project.industries.length)
    rows.push({
      label: atlasText(locale, "Industry"),
      value: project.industries
        .map((value) => atlasTerm(locale, value))
        .join(" · "),
    });
  if (project.ownership)
    rows.push({
      label: atlasText(locale, "Contribution"),
      value: atlasTerm(locale, project.ownership),
    });
  if (group >= 0)
    rows.push({
      label: atlasText(locale, "Cluster"),
      value: `${String(group + 1).padStart(2, "0")} · ${atlasCount(locale, count)}`,
    });
  if (project.wowFactor !== null)
    rows.push({
      label: atlasText(locale, "Wow factor"),
      value: `${project.wowFactor}/10`,
    });
  return {
    title: project.name,
    contentLocale: project.presentation?.locale ?? "en",
    description:
      description.length > 180 ? `${description.slice(0, 179)}…` : description,
    rows,
  };
}

/** ECharts accepts DOM content. textContent keeps every recorded field inert. */
export function projectTooltipElement(
  details: ProjectHoverDetails,
  locale: Locale = "en",
): HTMLElement {
  const element = document.createElement("div");
  element.className = "vs-project-tooltip";
  const title = document.createElement("strong");
  title.textContent = details.title;
  element.append(title);
  if (details.description) {
    const description = document.createElement("p");
    description.textContent = details.description;
    description.lang = details.contentLocale ?? "en";
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
  hint.textContent = atlasText(locale, "Click to explore this project");
  element.append(hint);
  return element;
}
