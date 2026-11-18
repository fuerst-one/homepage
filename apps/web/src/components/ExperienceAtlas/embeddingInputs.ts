import { createHash } from "node:crypto";
import type { LabProject } from "../ProjectLab/analysis";
import type { SpaceRecipe } from "./spaceTypes";

import { DEFAULT_FIELDS, fieldsInput } from "./embeddingFields";

/** Canonical public fields; titles, identities and audit material are excluded. */
export function embeddingInput(
  project: LabProject,
  recipe: SpaceRecipe,
): string {
  return fieldsInput(project, DEFAULT_FIELDS[recipe]);
}

export function embeddingKey(
  project: LabProject,
  recipe: SpaceRecipe,
  model: string,
) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        "atlas-semantic-v1",
        model,
        recipe,
        embeddingInput(project, recipe),
      ]),
    )
    .digest("hex");
}
