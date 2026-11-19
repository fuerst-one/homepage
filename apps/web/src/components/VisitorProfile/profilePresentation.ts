import { richSignalNames } from "./profileSignalLabels";
import type {
  ProfileFacet,
  ProfileSignal,
  ProfileCatalog,
} from "@homepage/content/visitorProfile";

export const facetNames: Record<ProfileFacet, [string, string]> = {
  buyerNeeds: ["Needs", "Bedarf"],
  capabilities: ["Capabilities", "Kompetenzen"],
  methods: ["Methods", "Methoden"],
  industries: ["Sectors", "Branchen"],
  tools: ["Tools", "Tools"],
  productTypes: ["Formats", "Formate"],
  stages: ["Stages", "Phasen"],
};
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
  return (
    catalog.terms.find((t) => t.id === signal.subject)?.value ??
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
