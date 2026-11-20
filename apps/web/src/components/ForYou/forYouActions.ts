import { enquiryPath } from "@homepage/content/enquiry";
import { parseForYouAction } from "@homepage/content/forYouPlan";
import { localizedPath, personName, type Locale } from "@homepage/content/i18n";
import { caseLabel } from "@homepage/content/projectCase";
import { serviceCopy } from "../../data/services";
import {
  isServiceProductSlug,
  serviceProductPath,
  serviceProducts,
} from "../../data/serviceProducts";

export type ForYouLink = { href: string; label: string };

export function needProjectsPath(need: string, locale: Locale) {
  return localizedPath(
    `/projects?${new URLSearchParams({ buyerNeeds: need })}`,
    locale,
  );
}

/** Plans name actions by id; only the site turns them into links. */
export function forYouActionLink(
  id: string,
  locale: Locale,
  needs: readonly string[],
): ForYouLink | null {
  const action = parseForYouAction(id, needs);
  if (!action) return null;
  const de = locale === "de";
  switch (action.kind) {
    case "enquiry":
      return {
        href: enquiryPath(action, locale),
        label:
          action.offer && isServiceProductSlug(action.service)
            ? serviceProducts[action.service].copy[locale].cta
            : serviceCopy[action.service][locale].cta,
      };
    case "offer":
      return {
        href: serviceProductPath(action.service, locale),
        label: serviceProducts[action.service].copy[locale].heroCta,
      };
    case "hire":
      return {
        href: localizedPath("/hire", locale),
        label: de ? "Mich ins Team holen" : "Bring me into your team",
      };
    case "email":
      return {
        href: "mailto:alexander@fuerst.one",
        label: de
          ? `${personName(locale)} schreiben`
          : `Email ${personName(locale)}`,
      };
    case "explorer":
      return {
        href: localizedPath("/explorer", locale),
        label: de ? "Alle Projekte erkunden" : "Explore all projects",
      };
    case "projects":
      return {
        href: needProjectsPath(action.need, locale),
        label: de
          ? `Projekte zu „${caseLabel(action.need, locale)}“`
          : `Projects for “${action.need}”`,
      };
  }
}
