import "server-only";
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
  return selectServiceEvidence(
    projects,
    slug,
    (project) => projectPath(project, locale),
    {
      locale,
      placement,
      studies,
    },
  );
}
