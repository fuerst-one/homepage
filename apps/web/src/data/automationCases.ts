type CaseStory = {
  label: string;
  headline?: string;
  context: string;
  summary: string;
  input: string;
  output: string;
};

// Editorial summaries of documented work, not inferred benefits or live-service claims.
export const automationCases: readonly {
  id: string;
  featured: boolean;
  screenshotIndex?: number;
  en: CaseStory;
  de: CaseStory;
}[] = [
  {
    id: "35686514-f736-8019-921c-e5d8d77e7f23",
    featured: true,
    screenshotIndex: 2,
    en: {
      label: "Browser automation",
      headline: "Turn a user journey into a browser-agent check.",
      context: "Personal project · solo delivery · occasional internal use",
      summary:
        "A local tool for describing user flows in natural language and running them with browser agents. Queued runs, step results and screenshots make the execution available for review.",
      input: "A user flow and the checks it should satisfy",
      output: "Browser actions, per-step results and screenshots to inspect",
    },
    de: {
      label: "Browser-Automatisierung",
      headline: "Nutzerabläufe mit Browser-Agenten prüfen.",
      context:
        "Eigenes Projekt · allein umgesetzt · gelegentlich intern genutzt",
      summary:
        "Ein lokales Tool, mit dem sich Nutzerabläufe in natürlicher Sprache definieren und durch Browser-Agenten ausführen lassen. Warteschlangen, Schrittergebnisse und Screenshots machen die Ausführung überprüfbar.",
      input: "Ein Nutzerablauf mit den zu prüfenden Erwartungen",
      output:
        "Browser-Aktionen, Ergebnisse pro Schritt und Screenshots zur Prüfung",
    },
  },
  {
    id: "b77109b3-803c-4132-a07b-44b9b9ccc5df",
    featured: true,
    en: {
      label: "Data pipelines",
      headline: "Scattered vehicle data. One updated database.",
      context:
        "Startup project · pipeline contribution within a team · historical implementation",
      summary:
        "Vehicle information from several sources, brought into a shared data model. My contribution included source-specific parsing, field mapping, normalization and background refresh workers.",
      input: "Vehicle specifications, ratings and source-specific page formats",
      output:
        "Structured records in NocoDB, with age-based refresh and a publishing workflow",
    },
    de: {
      label: "Datenpipelines",
      headline: "Verteilte Fahrzeugdaten. Eine aktuelle Datenbank.",
      context:
        "Startup-Projekt · Pipeline-Beitrag im Team · historische Umsetzung",
      summary:
        "Fahrzeuginformationen aus mehreren Quellen in einem gemeinsamen Datenmodell. Mein Beitrag umfasste quellenspezifisches Parsing, Feldzuordnung, Normalisierung und Hintergrund-Worker für Aktualisierungen.",
      input: "Fahrzeugdaten, Bewertungen und unterschiedliche Seitenformate",
      output:
        "Strukturierte Datensätze in NocoDB, mit altersabhängiger Aktualisierung und Veröffentlichungsablauf",
    },
  },
  {
    id: "41786514-f736-8074-8dcb-dd79f906d12a",
    featured: true,
    en: {
      label: "Connected business tools",
      headline: "Messages, meetings and project updates. One workspace.",
      context: "Personal project · internal use",
      summary:
        "Background collectors bring updates from connected providers into a project-based workspace, alongside tasks, documents, time and finances. Individual collection jobs keep source updates separate and make failures visible.",
      input: "Messages, calendar events and activity from connected providers",
      output:
        "A project-based overview with collected updates and links back to their sources",
    },
    de: {
      label: "Verbundene Business-Tools",
      headline: "Nachrichten, Termine und Projektinfos. Ein Arbeitsbereich.",
      context: "Eigenes Projekt · intern genutzt",
      summary:
        "Hintergrundprozesse sammeln Updates angebundener Dienste in einem projektbezogenen Arbeitsbereich, neben Aufgaben, Dokumenten, Zeiten und Finanzen. Einzelne Abrufaufträge halten Quellenaktualisierungen getrennt und machen Fehler sichtbar.",
      input:
        "Nachrichten, Kalendertermine und Aktivitäten angebundener Dienste",
      output:
        "Eine projektbezogene Übersicht mit gesammelten Updates und Links zu den Quellen",
    },
  },
  {
    id: "11d86514-f736-80ed-935c-e6fe30b59d42",
    featured: false,
    en: {
      label: "AI in a product",
      context: "Startup project · product, design and development · MVP",
      summary:
        "A B2B survey product connecting creation, website embedding and analysis. Implemented AI features support survey creation, translation and evaluation within that workflow.",
      input: "Survey goals, questions and collected responses",
      output: "AI-assisted survey creation, translations and analysis",
    },
    de: {
      label: "KI im Produkt",
      context: "Startup-Projekt · Produkt, Design und Entwicklung · MVP",
      summary:
        "Ein B2B-Umfrageprodukt für Erstellung, Website-Einbindung und Auswertung. Umgesetzte KI-Funktionen unterstützen das Erstellen, Übersetzen und Auswerten von Umfragen innerhalb dieses Ablaufs.",
      input: "Umfrageziele, Fragen und eingegangene Antworten",
      output: "KI-gestützte Umfrageerstellung, Übersetzungen und Auswertungen",
    },
  },
  {
    id: "41c86514-f736-801e-8825-cbf28db44596",
    featured: false,
    en: {
      label: "Structured web extraction",
      context: "Personal prototype",
      summary:
        "AI-assisted extraction schemas combined with deterministic parsing, schema caching and pagination. A prototype for turning variable pages into structured output.",
      input: "Web pages and a requested data structure",
      output: "Structured extraction through CLI, HTTP and MCP interfaces",
    },
    de: {
      label: "Strukturierte Web-Extraktion",
      context: "Eigener Prototyp",
      summary:
        "KI-gestützte Extraktionsschemata mit deterministischem Parsing, Schema-Cache und Paginierung. Ein Prototyp, der unterschiedliche Seiten in strukturierte Ausgaben überführt.",
      input: "Webseiten und eine gewünschte Datenstruktur",
      output:
        "Strukturierte Extraktion über CLI-, HTTP- und MCP-Schnittstellen",
    },
  },
  {
    id: "35486514-f736-8020-bde8-e0f741a1a77a",
    featured: false,
    en: {
      label: "Agent orchestration",
      context: "Personal project · internal use",
      summary:
        "A development tool coordinating AI agents through specification, implementation and review, with live status and controls for steering the work.",
      input: "A development task and its specification",
      output: "Staged agent runs with status, steering and review",
    },
    de: {
      label: "Agenten-Orchestrierung",
      context: "Eigenes Projekt · intern genutzt",
      summary:
        "Ein Entwicklungstool, das KI-Agenten durch Spezifikation, Umsetzung und Review koordiniert. Mit Live-Status und Eingriffsmöglichkeiten zur Steuerung der Arbeit.",
      input: "Eine Entwicklungsaufgabe und ihre Spezifikation",
      output: "Mehrstufige Agentenläufe mit Status, Steuerung und Review",
    },
  },
];
