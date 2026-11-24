import { localizePersonName, type Locale } from "./i18n";

const brandSpelling = (text: string) =>
  text.replace(/Fuerst\.one/g, "FUERST.ONE");

function mapCopy<T>(value: T, map: (text: string) => string): T {
  if (typeof value === "string") {
    if (/^(?:https?:|mailto:)/i.test(value)) return value;
    return map(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => mapCopy(entry, map)) as T;
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, mapCopy(entry, map)]),
    ) as T;
  }
  return value;
}

/** Apply current identity spelling to published JSON without rewriting source records. */
export function localizePublicIdentity<T>(value: T, locale: Locale): T {
  return mapCopy(value, (text) =>
    brandSpelling(localizePersonName(text, locale)),
  );
}

/** Brand spelling for copy shared by all locales; person names stay per locale. */
export function publicBrandSpelling<T>(value: T): T {
  return mapCopy(value, brandSpelling);
}
