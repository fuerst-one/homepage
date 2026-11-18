import { contentDate } from "@homepage/content/contentDates";
import type { Locale } from "@homepage/content/i18n";

export function ContentUpdatedAt({
  date,
  locale,
}: {
  date?: string;
  locale: Locale;
}) {
  const updatedAt = contentDate(date);
  if (!updatedAt) return null;
  const label = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    dateStyle: "medium",
    timeZone: "Europe/Berlin",
  }).format(new Date(updatedAt));
  return (
    <p className="text-xs text-neutral-400">
      {locale === "de" ? "Zuletzt aktualisiert" : "Last updated"}:{" "}
      <time dateTime={updatedAt}>{label}</time>
    </p>
  );
}
