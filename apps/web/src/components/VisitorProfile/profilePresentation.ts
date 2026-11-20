import { richSignalNames } from "./profileSignalLabels";
import { filterConfigs } from "../Cv/Projects/filterConfigs";
import { facetValueLabel } from "../Cv/Projects/Filter/utils";
import {
  PROFILE_FACETS,
  type ProfileFacet,
  type ProfileSignal,
  type ProfileCatalog,
  type ProfileInterest,
  type ProfileTerm,
  type ProfilePreference,
} from "@homepage/content/visitorProfile";

export const MAX_PROFILE_SCORE = 12;
export const RADAR_INTERESTS = PROFILE_FACETS.length;
export const preferenceNames: Record<
  ProfilePreference | "auto",
  [string, string]
> = {
  auto: ["Automatic", "Automatisch"],
  exclude: ["Not relevant", "Nicht relevant"],
  interested: ["Interested", "Interessiert"],
  priority: ["A priority", "Besonders wichtig"],
};
export const SIGNAL_LOG_PAGE_SIZE = 15;

/**
 * Hue per dimension, starting with the site's lime for needs. Shared by the
 * filters and the radar so a colour always means the same dimension.
 */
export const facetHues: Record<ProfileFacet, number> = {
  buyerNeeds: 81,
  capabilities: 190,
  methods: 290,
  industries: 20,
  productTypes: 340,
  tools: 140,
  stages: 240,
};

/**
 * The overview ("all") holds the strongest interest of every dimension in a
 * fixed order; a dimension shows its strongest interests. Interests without a
 * score yet fill up the rest from `terms` at zero, except those marked as not
 * relevant. Expects interests in the descending score order
 * `profileInterests` returns.
 */
export function topInterests(
  interests: ProfileInterest[],
  facet: ProfileFacet | "all",
  terms: ProfileTerm[] = [],
  limit = RADAR_INTERESTS,
) {
  const known = new Set(interests.map((i) => i.id));
  const ranked = [
    ...interests.filter((i) => i.score > 0),
    ...terms
      .filter((t) => !known.has(t.id))
      .map((t) => ({ ...t, score: 0, inferredScore: 0, evidence: [] })),
  ];
  if (facet !== "all")
    return ranked.filter((i) => i.facet === facet).slice(0, limit);
  return PROFILE_FACETS.flatMap((f) => ranked.find((i) => i.facet === f) ?? []);
}

export type RadarSlot = {
  interest: ProfileInterest | null;
  /** The slot's dimension colour, also when it is empty. */
  hue: number;
  /** Score as a share of the highest possible score, from 0 to 1. */
  value: number;
};

/**
 * One fixed slot per dimension, so every view shares the same axes and a
 * change of filter only changes values. The overview fills each dimension's
 * slot with its strongest interest; a dimension starts at its own slot with
 * its strongest interest and continues clockwise. Unused slots stay empty.
 */
export function radarSlots(
  interests: ProfileInterest[],
  facet: ProfileFacet | "all",
): RadarSlot[] {
  const count = PROFILE_FACETS.length;
  const slots: RadarSlot[] = PROFILE_FACETS.map((slotFacet) => ({
    interest: null,
    hue: facetHues[facet === "all" ? slotFacet : facet],
    value: 0,
  }));
  interests.forEach((interest, i) => {
    const slot =
      facet === "all"
        ? PROFILE_FACETS.indexOf(interest.facet)
        : (PROFILE_FACETS.indexOf(facet) + i) % count;
    slots[slot] = {
      ...slots[slot],
      interest,
      value: interest.score / MAX_PROFILE_SCORE,
    };
  });
  return slots;
}

export function signalLogPage(
  signals: ProfileSignal[],
  page: number,
  size = SIGNAL_LOG_PAGE_SIZE,
) {
  const pages = Math.max(1, Math.ceil(signals.length / size));
  const current = Math.min(Math.max(page, 0), pages - 1);
  const newestFirst = [...signals].reverse();
  return {
    entries: newestFirst.slice(current * size, (current + 1) * size),
    page: current,
    pages,
  };
}

/** The project analysis views own these names, so both pages always say the same. */
export const facetNames = Object.fromEntries(
  PROFILE_FACETS.map((facet) => {
    const config = filterConfigs.find((c) => c.projectKey === facet);
    if (!config) throw new Error(`No analysis view for ${facet}`);
    return [facet, [config.label, config.labelDe]];
  }),
) as Record<ProfileFacet, [string, string]>;

/** Stored values stay English; readers see the shared translation. */
export const termLabel = (
  term: Pick<ProfileTerm, "facet" | "value">,
  locale: "en" | "de",
) => facetValueLabel(term.facet, term.value, locale);
export const signalNames: Record<ProfileSignal["kind"], [string, string]> = {
  ...richSignalNames,
  project_opened: ["Opened a project", "Projekt geöffnet"],
  project_read: ["Active reading", "Aktiv gelesen"],
  filter_selected: ["Selected a filter", "Filter gewählt"],
  service_viewed: ["Viewed a service", "Leistung angesehen"],
  enquiry_started: ["Started an enquiry", "Anfrage begonnen"],
  enquiry_submitted: ["Enquiry sent", "Anfrage gesendet"],
  recommendation_shown: ["Suggestion displayed", "Vorschlag angezeigt"],
  recommendation_opened: ["Opened a suggestion", "Vorschlag geöffnet"],
  preference_changed: ["You adjusted an interest", "Interesse angepasst"],
};
export function subjectName(
  signal: ProfileSignal,
  catalog: ProfileCatalog,
  locale: "en" | "de" = "en",
): string {
  const sectionNames: Record<string, [string, string]> = {
    outcomes: ["Outcomes", "Ergebnisse"],
    architecture: ["Architecture & technology", "Architektur & Technologie"],
    process: ["Process & methods", "Vorgehen & Methoden"],
    delivery: ["Delivery & operation", "Umsetzung & Betrieb"],
    github: ["Implementation evidence", "Implementierungsbelege"],
    live: ["Live product", "Live-Produkt"],
    deliverables: ["Deliverables", "Ergebnisse des Auftrags"],
    commercial: ["Scope & terms", "Umfang & Konditionen"],
    collaboration: ["Collaboration", "Zusammenarbeit"],
    product: ["Product purpose", "Produktzweck"],
    engineering: ["Engineering", "Entwicklung"],
    contribution: ["Contribution model", "Beitragsmodell"],
    scale: ["Scale & delivery", "Größe & Umsetzung"],
    needs: ["Buyer needs", "Bedarf"],
    details: ["Project facts", "Projektdaten"],
    home: ["Home page", "Startseite"],
    hire: ["Work with me", "Zusammenarbeiten"],
  };
  if (signal.subject.includes("|"))
    return signal.subject
      .split("|")
      .map(
        (subject) =>
          catalog.projects.find((p) => p.id === subject)?.name ??
          sectionNames[subject]?.[locale === "de" ? 1 : 0] ??
          subjectName({ ...signal, subject }, catalog, locale),
      )
      .join(" · ");
  if (sectionNames[signal.subject])
    return sectionNames[signal.subject][locale === "de" ? 1 : 0];
  const term = catalog.terms.find((t) => t.id === signal.subject);
  return (
    (term && termLabel(term, locale)) ??
    catalog.projects.find((p) => p.id === signal.subject)?.name ??
    {
      "ai-automation": "AI & automation",
      "ai-products": "AI products",
      "product-interfaces": "Product interfaces",
      enquiry: "Contact",
    }[signal.subject] ??
    signal.subject
  );
}
