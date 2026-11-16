import type { Locale } from "@/lib/i18n";
import { readWebsiteSection } from "./websiteContent";

export async function getSiteCopy(
  locale: Locale,
): Promise<Record<string, string>> {
  return Object.fromEntries(
    (await readWebsiteSection("copy")).map((row) => [
      row.key,
      row[locale] || row.en,
    ]),
  );
}
