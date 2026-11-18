import { localizePersonName, type Locale } from "@homepage/content/i18n";
import { readWebsiteSection } from "@homepage/database/websiteContent";
export const getSiteCopy = async (locale: Locale) => {
  const copy = await readWebsiteSection("copy", undefined, locale);
  return Object.fromEntries(
    Object.entries(copy).map(([key, value]) => [
      key,
      localizePersonName(value, locale),
    ]),
  );
};
