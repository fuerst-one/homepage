import { getAnalyticsConfig } from "./analytics/umami";

/** Shared release switches for the homepage, legal disclosures and API admission. */
export function getSiteFeatures() {
  return {
    assistantEnabled:
      process.env.NEXT_PUBLIC_KNOWLEDGE_ASSISTANT_ENABLED === "true" &&
      process.env.KNOWLEDGE_ASSISTANT_ENABLED === "true",
    analyticsEnabled: getAnalyticsConfig() !== null,
  };
}
