import type { Locale } from "@homepage/content/i18n";
import { readWebsiteSection } from "@homepage/database/websiteContent";
export const getPublicProjectCases = () => readWebsiteSection("cases");
export async function getEnquiryEvidence(locale: Locale) {
  try {
    return await readWebsiteSection("evidence", undefined, locale);
  } catch {
    console.error("Enquiry project evidence unavailable");
    return [];
  }
}
