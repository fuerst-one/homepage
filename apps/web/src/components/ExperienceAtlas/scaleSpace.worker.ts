import { buildScaleSpace, type ScaleField } from "./scaleSpace";
import type { ProjectScale } from "@homepage/content/projectScale";

self.onmessage = (
  event: MessageEvent<{
    projects: { id: string; scale?: ProjectScale }[];
    fields: ScaleField[];
  }>,
) => {
  try {
    self.postMessage({
      result: buildScaleSpace(event.data.projects, event.data.fields),
    });
  } catch {
    self.postMessage({
      error: "The numeric map could not be calculated. Try another selection.",
    });
  }
};
