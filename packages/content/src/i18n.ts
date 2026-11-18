export const locales = ["en", "de"] as const;
export type Locale = (typeof locales)[number];
export type LocaleParams = { params: Promise<{ locale: string }> };

export const isLocale = (value: string): value is Locale =>
  value === "en" || value === "de";

/** Explicit link locales can represent a published translation fallback. */
export function localizedLinkPath(path: string, locale: Locale) {
  return /^\/(en|de)(\/|[?#]|$)/.test(path)
    ? path
    : localizedPath(path, locale);
}

/** Change page language without changing API, asset or external URLs. */
export function localizedPath(path: string, locale: Locale): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  const pathname = path.split(/[?#]/, 1)[0];
  if (/^\/(?:api|_next)(?:\/|$)/.test(pathname)) return path;
  if (
    pathname !== "/cv.pdf" &&
    /(?:\.[a-z0-9]+$|^\/opengraph-image$)/i.test(pathname)
  )
    return path;
  let withoutLocale = path.replace(/^\/(?:en|de)(?=\/|[?#]|$)/, "");
  const pagePaths: Record<string, Record<Locale, string>> = {
    "/explore": { en: "/explorer", de: "/explorer" },
    "/entdecken": { en: "/explorer", de: "/explorer" },
    "/legal-notice": { en: "/legal-notice", de: "/impressum" },
    "/impressum": { en: "/legal-notice", de: "/impressum" },
    "/privacy": { en: "/privacy", de: "/datenschutz" },
    "/datenschutz": { en: "/privacy", de: "/datenschutz" },
  };
  const page = withoutLocale.split(/[?#]/, 1)[0];
  if (pagePaths[page])
    withoutLocale = pagePaths[page][locale] + withoutLocale.slice(page.length);
  return `/${locale}${withoutLocale === "/" ? "" : withoutLocale.startsWith("/?") || withoutLocale.startsWith("/#") ? withoutLocale.slice(1) : withoutLocale}`;
}

export const localeFromPath = (path: string): Locale =>
  path.startsWith("/de/") || path === "/de" ? "de" : "en";

export function languageAlternates(path: string) {
  return {
    en: `https://fuerst.one${localizedPath(path, "en")}`,
    de: `https://fuerst.one${localizedPath(path, "de")}`,
    "x-default": `https://fuerst.one${localizedPath(path, "en")}`,
  };
}
