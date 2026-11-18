import { CvProject } from "@homepage/content/models";
import countBy from "lodash/countBy";
import { projectDeliveryModels } from "@homepage/content/projectTaxonomy";

export type FacetCount = {
  value: string;
  count: number;
};

export type ClientFacet = FacetCount & {
  id: string;
};

export type Facets = {
  tools: FacetCount[];
  industries: FacetCount[];
  productTypes: FacetCount[];
  targetMarket: FacetCount[];
  usageContext: FacetCount[];
  deliveryModels: FacetCount[];
  capabilities: FacetCount[];
  methods: FacetCount[];
  languages: FacetCount[];
  projectTypes: FacetCount[];
  workplaces: FacetCount[];
  clients: ClientFacet[];
  totalProjects: number;
};

export const computeFacets = (projects: CvProject[]): Facets => ({
  tools: countMultiSelect(projects, "tools"),
  industries: countMultiSelect(projects, "industries"),
  productTypes: countMultiSelect(projects, "productTypes"),
  targetMarket: countMultiSelect(projects, "targetMarket"),
  usageContext: countMultiSelect(projects, "usageContext"),
  deliveryModels: toSortedFacets(
    countBy(projects.flatMap(projectDeliveryModels)),
  ),
  capabilities: countMultiSelect(projects, "capabilities"),
  methods: countMultiSelect(projects, "methods"),
  languages: countMultiSelect(projects, "languages"),
  projectTypes: countSingle(projects, "projectType"),
  workplaces: countSingle(projects, "workplace"),
  clients: countClients(projects),
  totalProjects: projects.length,
});

const countMultiSelect = (
  projects: CvProject[],
  key:
    | "tools"
    | "industries"
    | "capabilities"
    | "methods"
    | "languages"
    | "productTypes"
    | "targetMarket"
    | "usageContext",
): FacetCount[] => {
  const counts = countBy(
    projects.flatMap((project) => [...new Set(project[key] ?? [])]),
  );
  return toSortedFacets(counts);
};

const countSingle = (
  projects: CvProject[],
  key: "projectType" | "workplace" | "deliveryModel",
): FacetCount[] => {
  const counts = countBy(
    projects.map((project) => project[key]).filter(Boolean),
  );
  return toSortedFacets(counts);
};

const countClients = (projects: CvProject[]): ClientFacet[] => {
  const clientMap = new Map<string, { name: string; count: number }>();
  for (const project of projects) {
    for (const client of project.clients) {
      const existing = clientMap.get(client.id);
      if (existing) {
        existing.count += 1;
      } else {
        clientMap.set(client.id, { name: client.name, count: 1 });
      }
    }
  }
  return Array.from(clientMap.entries())
    .map(([id, { name, count }]) => ({ id, value: name, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
};

const toSortedFacets = (counts: Record<string, number>): FacetCount[] =>
  Object.entries(counts)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
