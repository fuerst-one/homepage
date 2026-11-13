import { CvProject } from "../notion/getCvProjects";
import { RichTextField } from "../notion/types";
import { API_BASE_URL } from "./baseUrl";
import { projectPath, SITE_URL } from "@/lib/seo";

export type ProjectListItem = {
  id: string;
  name: string;
  icon: string | null;
  oneLineSummary: string;
  tools: string[];
  industries: string[];
  experiences: string[];
  languages: string[];
  projectType: string;
  workplace: string;
  startDate: string;
  endDate: string | null;
  wowFactor: number;
  featured: boolean;
  clientNames: string[];
  url: string;
  webUrl: string;
};

const SUMMARY_MAX_CHARS = 200;

export const toProjectListItem = (project: CvProject): ProjectListItem => ({
  id: project.id,
  name: project.name,
  icon: project.icon ?? null,
  oneLineSummary: deriveOneLineSummary(project.description),
  tools: project.tools,
  industries: project.industries,
  experiences: project.experiences,
  languages: project.languages,
  projectType: project.projectType,
  workplace: project.workplace,
  startDate: project.startDate,
  endDate: project.endDate,
  wowFactor: project.wowFactor,
  featured: project.featured,
  clientNames: project.clients.map((client) => client.name),
  url: `${API_BASE_URL}/api/projects/${project.id}`,
  webUrl: `${SITE_URL}${projectPath(project)}`,
});

const deriveOneLineSummary = (description: RichTextField): string => {
  const fullText = description.rich_text
    .map((content) => content.plain_text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!fullText) return "";

  const sentenceMatch = fullText.match(/^[^.!?]+[.!?]/);
  const firstSentence = sentenceMatch ? sentenceMatch[0].trim() : fullText;

  if (firstSentence.length <= SUMMARY_MAX_CHARS) {
    return firstSentence;
  }
  return `${firstSentence.slice(0, SUMMARY_MAX_CHARS - 1).trimEnd()}…`;
};
