import { localizePersonName, type Locale } from "./i18n";

/** Apply current identity spelling to published JSON without rewriting source records. */
export function localizePublicIdentity<T>(value: T, locale: Locale): T {
  if (typeof value === "string") {
    if (/^(?:https?:|mailto:)/i.test(value)) return value;
    return localizePersonName(value, locale).replace(
      /Fuerst\.one/g,
      "FUERST.ONE",
    ) as T;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => localizePublicIdentity(entry, locale)) as T;
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        localizePublicIdentity(entry, locale),
      ]),
    ) as T;
  }
  return value;
}
