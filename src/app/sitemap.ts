import type { MetadataRoute } from "next";
import { getCachedCvProjects } from "@/server/notion/getCachedCvProjects";
import { projectPath, SITE_URL } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projects = await getCachedCvProjects();
  return [
    ...[
      "/",
      "/cv",
      "/projects",
      "/contact",
      "/hire",
      "/plasma",
      "/legal-notice",
      "/privacy",
      "/impressum",
      "/datenschutz",
    ].map((path) => ({ url: `${SITE_URL}${path}` })),
    ...projects.map((project) => ({
      url: `${SITE_URL}${projectPath(project)}`,
    })),
  ];
}
