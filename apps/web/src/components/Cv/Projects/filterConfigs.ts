import { DisplayType, FilterConfig } from "./Filter/types";

/** Beyond these counts, slices and tiles get too small to label, so a list reads better. */
const CHART_VALUES_MAX: Partial<Record<DisplayType, number>> = {
  pie: 6,
  treemap: 10,
};

export const chartTypeFor = (
  { displayType, keepChart }: Pick<FilterConfig, "displayType" | "keepChart">,
  valueCount: number,
): DisplayType =>
  !keepChart && valueCount > (CHART_VALUES_MAX[displayType] ?? Infinity)
    ? "bar"
    : displayType;

export const filterConfigs: FilterConfig[] = [
  {
    label: "Industries",
    labelDe: "Branchen",
    projectKey: "industries",
    displayType: "treemap",
    keepChart: true,
  },
  {
    label: "Project setting",
    labelDe: "Projektrahmen",
    projectKey: "projectType",
    displayType: "pie",
  },
  {
    label: "Expertise",
    labelDe: "Expertise",
    projectKey: "capabilities",
    displayType: "bar",
  },
  {
    label: "Methods & principles",
    labelDe: "Methoden & Prinzipien",
    projectKey: "methods",
    displayType: "treemap",
  },
  {
    label: "Technologies",
    labelDe: "Technologien",
    projectKey: "tools",
    displayType: "bar",
  },
  {
    label: "Buyer needs",
    labelDe: "Bedarf",
    projectKey: "buyerNeeds",
    displayType: "bar",
  },
  {
    label: "Product formats",
    labelDe: "Produktformate",
    projectKey: "productTypes",
    displayType: "treemap",
  },
  {
    label: "Delivery stage",
    labelDe: "Umsetzungsstand",
    projectKey: "stages",
    displayType: "bar",
  },
  {
    label: "Target market",
    labelDe: "Zielmarkt",
    projectKey: "targetMarket",
    displayType: "pie",
  },
];
