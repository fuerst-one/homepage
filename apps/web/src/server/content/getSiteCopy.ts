import type { Locale } from "@homepage/content/i18n";
import { readWebsiteSection } from "@homepage/database/websiteContent";
export const getSiteCopy = (locale: Locale) =>
  readWebsiteSection("copy", undefined, locale);
