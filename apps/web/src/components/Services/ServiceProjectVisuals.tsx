import type { PublicImageDescription } from "@homepage/database/imageDescriptions";
import { ProjectScreenshots } from "../Cv/Projects/ProjectScreenshots";
import type { ServiceLocale } from "../../data/services";
import type { ServiceVisual } from "./serviceVisuals";

export function ServiceProjectVisuals({
  visuals,
  projectName,
  projectId,
  initialDescriptions = [],
  locale,
  priority = false,
}: {
  visuals: ServiceVisual[];
  projectName: string;
  projectId: string;
  initialDescriptions?: PublicImageDescription[];
  locale: ServiceLocale;
  priority?: boolean;
}) {
  if (!visuals.length) return null;
  return (
    <ProjectScreenshots
      screenshots={visuals.map((visual) => visual.src)}
      projectName={projectName}
      projectId={projectId}
      initialDescriptions={initialDescriptions.filter((row) =>
        visuals.some((visual) => visual.src === row.href),
      )}
      locale={locale}
      imageDetails={Object.fromEntries(
        visuals.map((visual) => [visual.src, visual]),
      )}
      fit="contain"
      priority={priority}
    />
  );
}
