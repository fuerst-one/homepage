import type { Locale } from "@homepage/content/i18n";
import { sectorLabel, deliveryLabel } from "./projectTaxonomy";

// This allowlist is the public matching vocabulary, not the full editorial record.
export const CASE_VOCABULARY = {
  buyerNeeds: {
    "Launch a new product": "Ein neues Produkt starten",
    "Improve a complex interface": "Ein komplexes Interface verbessern",
    "Automate repetitive work": "Wiederkehrende Arbeit automatisieren",
    "Add AI capabilities": "KI-Funktionen ergänzen",
    "Integrate business systems": "Geschäftssysteme verbinden",
    "Make data actionable": "Daten nutzbar machen",
    "Validate a product idea": "Eine Produktidee prüfen",
    "Improve conversion": "Conversion verbessern",
    "Build internal tooling": "Interne Werkzeuge entwickeln",
    "Enable collaboration": "Zusammenarbeit ermöglichen",
    "Create an interactive experience": "Ein interaktives Erlebnis entwickeln",
    "Deliver an industry-specific workflow":
      "Branchenspezifische Abläufe umsetzen",
    "Create a public website": "Eine öffentliche Website entwickeln",
    "Connect software and hardware": "Software und Hardware verbinden",
    "Maintain and evolve a product":
      "Ein Produkt betreuen und weiterentwickeln",
    "Work in a team": "Im Team arbeiten",
    "Sell products": "Produkte verkaufen",
  },
  stages: {
    Discovery: "Konzeption",
    Prototype: "Prototyp",
    MVP: "MVP",
    Production: "Produktiv eingesetzt",
    "Production (restricted access)":
      "Produktiv eingesetzt (beschränkter Zugang)",
    Retired: "Außer Betrieb",
    Improvement: "Weiterentwicklung",
    "Internal use": "Interne Nutzung",
    "Ongoing maintenance": "Laufende Betreuung",
  },
  domains: {
    "Interactive art": "Interaktive Kunst",
    "Animal deterrence": "Tierabwehr",
    "Website assistance": "Website-Assistenz",
    "Knowledge retrieval": "Wissensabruf",
    "Business operations": "Geschäftsabläufe",
    "Software testing": "Softwaretests",
    "Travel planning": "Reiseplanung",
    "Development automation": "Entwicklungsautomatisierung",
    "Games and entertainment": "Spiele und Unterhaltung",
    "Product configuration": "Produktkonfiguration",
    "Logistics operations": "Logistikabläufe",
    "Route planning": "Routenplanung",
    "Public information": "Öffentliche Informationen",
    "Health information": "Gesundheitsinformationen",
    "Interface exploration": "Interface-Experimente",
    "Recipe and shopping planning": "Rezept- und Einkaufsplanung",
    "Physical product design": "Gestaltung physischer Produkte",
    "EV charging planning": "Ladeplanung für Elektrofahrzeuge",
    Learning: "Lernen",
    "Product comparison": "Produktvergleich",
    "Music discovery": "Musik entdecken",
    "Data exploration": "Daten erkunden",
    "Creative editing": "Kreative Bearbeitung",
    "Sustainability reporting": "Nachhaltigkeitsnachweise",
    "Developer tooling": "Entwicklerwerkzeuge",
    "Logistics and maritime": "Logistik und Schifffahrt",
    "E-commerce": "E-Commerce",
    "Marketing and research": "Marketing und Forschung",
    "Tourism and travel": "Tourismus und Reisen",
    "Public sector": "Öffentlicher Sektor",
    Nonprofit: "Gemeinnützigkeit",
    Healthcare: "Gesundheitswesen",
    Education: "Bildung",
    Entertainment: "Unterhaltung",
    Automotive: "Automobil",
    "Personal productivity": "Persönliche Produktivität",
    "Embedded systems": "Eingebettete Systeme",
    "Brand and portfolio": "Marke und Portfolio",
    Sustainability: "Nachhaltigkeit",
    "Geospatial analysis": "Geodatenanalyse",
  },
  aiUsage: {
    "AI product feature": "KI-Funktion im Produkt",
    "AI-powered developer tool": "KI-gestütztes Entwicklerwerkzeug",
    "AI-assisted implementation": "KI-unterstützte Umsetzung",
    "Computer vision": "Computer Vision",
  },
  aiCapabilities: {
    "Design generation": "Designgenerierung",
    "Conversational assistance": "Dialogassistenz",
    "Customer support": "Kundensupport",
    "Product data management": "Produktdatenpflege",
    "Analytics interpretation": "Analyseauswertung",
    Translation: "Übersetzung",
    "Survey generation": "Umfrageerstellung",
    "Survey analysis": "Umfrageauswertung",
    "Agent orchestration": "Agenten-Orchestrierung",
    "Browser automation": "Browserautomatisierung",
    "Knowledge retrieval": "Wissensabruf",
    "Agent memory": "Agentengedächtnis",
    "Computer vision detection": "Visuelle Objekterkennung",
    "Data parsing": "Datenextraktion und -verarbeitung",
    "Code refactoring": "Code-Refactoring",
    "Geo suggestion": "Ortsvorschläge",
    "Trip planning": "Reiseplanung",
    Routing: "Routenberechnung",
  },
  ownership: {
    "Solo delivery": "Eigenständige Umsetzung",
    "Product engineering owner": "Produktverantwortung im Engineering",
    "Team contributor": "Beitrag im Entwicklungsteam",
  },
  maintenance: {
    "Active development": "Aktive Weiterentwicklung",
    "Occasional maintenance": "Gelegentliche Wartung",
    "Engagement ended": "Zusammenarbeit beendet",
  },
} as const;

export type ProjectCase = {
  buyerNeeds: string[];
  stages: string[];
  domains: string[];
  aiUsage: string[];
  aiCapabilities: string[];
  ownership: string;
  maintenance: string;
  summary: string;
};
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** Never expose hidden cases, evidence gaps, contact fields or unreviewed prose. */
export function readPublicProjectCase(page: unknown): ProjectCase | null {
  const source = record(page);
  const p = record(source.properties);
  if (source.archived || source.in_trash || record(p.Hidden).checkbox)
    return null;
  const multi = (property: string, vocabulary: object) => [
    ...new Set(
      list(record(p[property]).multi_select)
        .map((value) => record(value).name)
        .filter(
          (value): value is string =>
            typeof value === "string" && Object.hasOwn(vocabulary, value),
        ),
    ),
  ];
  const select = (property: string, vocabulary: object) => {
    const value = record(record(p[property]).select).name;
    return typeof value === "string" && Object.hasOwn(vocabulary, value)
      ? value
      : "";
  };
  return {
    buyerNeeds: multi("Buyer Needs", CASE_VOCABULARY.buyerNeeds),
    stages: multi("Delivery Stages", CASE_VOCABULARY.stages),
    domains: multi("Project Domains", CASE_VOCABULARY.domains),
    aiUsage: multi("AI Usage", CASE_VOCABULARY.aiUsage),
    aiCapabilities: multi("AI Capabilities", CASE_VOCABULARY.aiCapabilities),
    ownership: select("Ownership Model", CASE_VOCABULARY.ownership),
    maintenance: select("Maintenance Mode", CASE_VOCABULARY.maintenance),
    summary: list(record(p["Case Context"]).rich_text)
      .map((value) => record(value).plain_text)
      .filter((value): value is string => typeof value === "string")
      .join("")
      .slice(0, 600),
  };
}

const germanLabels: Record<string, string> = Object.assign(
  {
    "Developer tool": "Entwicklerwerkzeug",
    "Open Source": "Quelloffene Distribution",
    "Automated Testing": "Automatisierte Tests",
  },
  ...Object.values(CASE_VOCABULARY),
);
export function caseLabel(value: string, locale: Locale) {
  return locale === "de"
    ? (germanLabels[value] ?? deliveryLabel(sectorLabel(value, locale), locale))
    : value;
}
