import { ProjectScreenshots } from "../Cv/Projects/ProjectScreenshots";
import type { ServiceLocale } from "../../data/services";
import type { ServiceVisual } from "./serviceVisuals";

export function ServiceProjectVisuals({
  visuals,
  projectName,
  locale,
  priority = false,
}: {
  visuals: ServiceVisual[];
  projectName: string;
  locale: ServiceLocale;
  priority?: boolean;
}) {
  if (!visuals.length) return null;
  return (
    <ProjectScreenshots
      screenshots={visuals.map((visual) => visual.src)}
      projectName={projectName}
      locale={locale}
      imageDetails={Object.fromEntries(
        visuals.map((visual) => [visual.src, visual]),
      )}
      fit="contain"
      priority={priority}
    />
  );
}
