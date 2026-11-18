import { createElement } from "react";
import type { Locale } from "@homepage/content/i18n";
export function GeneratedImageDescription({
  description,
  locale,
}: {
  description: string;
  locale: Locale;
}) {
  if (!description) return null;
  return createElement(
    "details",
    { className: "mt-3 text-sm text-neutral-400 select-text" },
    createElement(
      "summary",
      { className: "cursor-pointer py-2 text-neutral-300" },
      locale === "de"
        ? "Automatisch erstellte Bildbeschreibung"
        : "Automatically generated image description",
    ),
    createElement(
      "p",
      { lang: "en", className: "mt-2 leading-relaxed" },
      description,
    ),
  );
}
