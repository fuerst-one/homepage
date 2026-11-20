import { FilterConfig } from "./Filter/types";

export const filterConfigs: FilterConfig[] = [
  {
    label: "Industries",
    projectKey: "industries",
    displayType: "treemap",
  },
  {
    label: "Project setting",
    projectKey: "projectType",
    displayType: "pie",
  },
  {
    label: "Capabilities",
    projectKey: "capabilities",
    displayType: "treemap",
  },
  { label: "Methods", projectKey: "methods", displayType: "treemap" },
  {
    label: "Tools",
    projectKey: "tools",
    displayType: "bar",
  },
];
