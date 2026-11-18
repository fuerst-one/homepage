import "server-only";
import { getPublicImageDescriptions } from "./getPublicImageDescriptions";
import { readWebsiteSections } from "@homepage/database/websiteContent";
import { projectPath } from "../../lib/seo";
import type { ServiceLocale, ServiceSlug } from "../../data/services";
import { selectServiceEvidence } from "../../components/Services/serviceEvidence";

export async function getServiceEvidence(
  slug: ServiceSlug,
  locale: ServiceLocale,
  placement: "service" | "offer" = "service",
) {
  const { projects, studies } = await readWebsiteSections(
    ["projects", "studies"],
    undefined,
    locale,
  );
  const evidence = selectServiceEvidence(
    projects,
    slug,
    (project) => projectPath(project, locale),
    {
      locale,
      placement,
      studies,
    },
  );
  return Promise.all(
    evidence.map(async (project) => ({
      ...project,
      imageDescriptions: (
        await getPublicImageDescriptions(project.id, locale)
      ).filter((row) =>
        [...project.visuals, ...project.heroVisuals].some(
          (visual) => visual.src === row.href,
        ),
      ),
    })),
  );
}
