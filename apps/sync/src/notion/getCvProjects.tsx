import type { ProjectScale } from "@homepage/content/projectScale";
import type { ProjectCase } from "@homepage/content/projectCase";
import type { ProjectTaxonomy } from "@homepage/content/projectTaxonomy";

import {
  fetchNotionProjectsDatabase,
  NotionProject,
} from "./fetchNotionProjectsDatabase";
import uniq from "lodash/uniq";
import { NotionClient, fetchNotionClient } from "./fetchNotionClient";
import { RichTextField } from "./types";
import { buildNotionImageProxyPath } from "./notionImageProxy";
import { embedProjectsTo3D } from "./embedProjectsTo3D";

const PROJECT_LOGO_PROPERTY = "Logo";
const PROJECT_SCREENSHOTS_PROPERTY = "Screenshots";

const toProxyUrls = (
  pageId: string,
  propertyName: string,
  files: string[] | null,
): string[] | null => {
  if (!files?.length) return files;
  return files.map((_, index) =>
    buildNotionImageProxyPath(pageId, propertyName, index),
  );
};

export type CvProject = ProjectTaxonomy & {
  matching?: ProjectCase;
  id: string;
  name: string;
  logo: string[] | null;
  icon: string | null;
  screenshots: string[] | null;
  description: RichTextField;
  kpis: RichTextField;
  descriptionDe?: RichTextField;
  kpisDe?: RichTextField;
  germanReady?: boolean;
  caseStudyEn?: string | null;
  caseStudyDe?: string | null;
  contentLocale?: "en" | "de";
  wowFactor: number;
  status: string;
  featured: boolean;
  projectType: string;
  startDate: string;
  endDate: string | null;
  websiteUrl: string | null;
  githubUrl: string | null;
  industries: string[];
  capabilities: string[];
  methods: string[];
  scale?: ProjectScale;
  tools: string[];
  languages: string[];
  workplace: string;
  clients: CvClient[];
  position3d: [number, number, number];
};

export type CvClient = {
  id: string;
  name: string;
  url: string | null;
};

export type CvContact = {
  id: string;
  name: string;
  email: string | null;
  position: string | null;
  knowledge: string[];
};

export const getCvProjects = async (sourceProjects?: NotionProject[]) => {
  try {
    const projects = (
      sourceProjects ?? (await fetchNotionProjectsDatabase())
    ).filter((project) => !project.hidden);
    const clients = await getClientsFromNotionProjects(projects);
    const merged = mergeProjectData(projects, clients)
      .sort((a, b) => {
        if (a.endDate === null) return -1;
        if (b.endDate === null) return 1;
        return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      })
      .sort((a, b) => {
        return b.wowFactor - a.wowFactor;
      });
    return embedProjectsTo3D(merged);
  } catch (error) {
    console.error("Notion portfolio refresh failed");
    // Never cache an upstream failure as an empty public portfolio or sitemap.
    throw error;
  }
};

const getClientsFromNotionProjects = async (projects: NotionProject[]) => {
  const clientRelations = projects
    .map((project) => project.clients)
    .flat()
    .filter(Boolean);
  const clientIds = uniq(clientRelations.map((relation) => relation.id));
  const clients: NotionClient[] = [];
  for (const id of clientIds) clients.push(await fetchNotionClient(id));
  return clients;
};

const mergeProjectData = (
  projects: NotionProject[],
  clients: NotionClient[],
): Omit<CvProject, "position3d">[] => {
  const publicClients = clients.map((client) => ({
    id: client.id,
    name: client.Name,
    url: client.URL || null,
  }));

  const filteredProjects = projects.filter((project) => !project.hidden);

  return filteredProjects.map((project) => {
    const mappedClients = project.clients.map((relation) =>
      publicClients.find((client) => client.id === relation.id)!,
    );
    return {
      ...project,
      logo: toProxyUrls(project.id, PROJECT_LOGO_PROPERTY, project.logo),
      screenshots: toProxyUrls(
        project.id,
        PROJECT_SCREENSHOTS_PROPERTY,
        project.screenshots,
      ),
      clients: mappedClients.filter(
        (client): client is NonNullable<typeof client> => !!client,
      ),
    };
  });
};
