import { CvProject } from "@homepage/content/models";
import type { FacetKey } from "./utils";

export type DisplayType = "bar" | "pie" | "treemap";

export type FilterConfig = {
  projectKey: FacetKey;
  label: string;
  labelDe: string;
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
