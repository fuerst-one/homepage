import type { Locale } from "@homepage/content/i18n";
import type { RichTextField } from "@homepage/content/models";

type TranslatableProject = {
  description: RichTextField;
  kpis: RichTextField;
  descriptionDe?: RichTextField;
  kpisDe?: RichTextField;
  germanReady?: boolean;
};

const hasText = (field?: RichTextField) =>
  !!field?.rich_text?.some((text) => text.plain_text.trim());

export const hasGermanTranslation = (
  project: TranslatableProject & { availableLocales?: Locale[] },
) =>
  project.availableLocales
    ? project.availableLocales.includes("de")
    : project.germanReady === true &&
      hasText(project.descriptionDe) &&
      (!hasText(project.kpis) || hasText(project.kpisDe));

export function localizeProject<T extends TranslatableProject>(
  project: T,
  locale: Locale,
): T & { contentLocale: Locale } {
  if (locale !== "de" || !hasGermanTranslation(project))
    return { ...project, contentLocale: "en" };
  return {
    ...project,
    description: project.descriptionDe!,
    kpis: project.kpisDe ?? project.kpis,
    contentLocale: "de",
  };
}

/** Only selected, published prose may cross an API or client component boundary. */
export function toPublicProject<T extends TranslatableProject>(
  project: T,
): Omit<T, "descriptionDe" | "kpisDe" | "germanReady"> {
  const result = { ...project };
  delete result.descriptionDe;
  delete result.kpisDe;
  delete result.germanReady;
  return result;
}
