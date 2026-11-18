import { FilterConfig } from "./Filter/types";

export const filterConfigs: FilterConfig[] = [
  {
    label: "Capabilities",
    projectKey: "capabilities",
    displayType: "treemap",
  },
  { label: "Methods", projectKey: "methods", displayType: "treemap" },
  {
    label: "Industries",
    projectKey: "industries",
    displayType: "treemap",
  },
  {
    label: "Types",
    projectKey: "projectType",
    displayType: "pie",
  },
  {
    label: "Tools",
    projectKey: "tools",
    displayType: "bar",
  },
];
