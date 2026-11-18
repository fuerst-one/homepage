import "server-only";
import { cache } from "react";
import type { Locale } from "@homepage/content/i18n";
import { readPublicImageDescriptions } from "@homepage/database/imageDescriptions";

/** Optional enrichment: pages remain available while the worker prepares image text. */
export const getPublicImageDescriptions = cache(
  async (projectId: string, locale: Locale) =>
    readPublicImageDescriptions(projectId, locale).catch(() => []),
);
