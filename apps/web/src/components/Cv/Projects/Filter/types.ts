import { CvProject } from "@homepage/content/models";

export type DisplayType = "bar" | "pie" | "treemap";

export type FilterConfig = {
  projectKey: keyof CvProject;
  label: string;
  displayType: DisplayType;
};

export type FilterOption = {
  label: string;
  projectKey: keyof CvProject;
  displayType: DisplayType;
  itemCounts: ItemCount[];
};

export type ItemCount = {
  itemKey: string;
  count: number;
  color?: string;
};
