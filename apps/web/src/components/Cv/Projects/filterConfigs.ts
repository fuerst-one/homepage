import { FilterConfig } from "./Filter/types";

export const filterConfigs: FilterConfig[] = [
  {
    label: "Industries",
    labelDe: "Branchen",
    projectKey: "industries",
    displayType: "treemap",
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
