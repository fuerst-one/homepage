import { localizedPath, type Locale } from "@homepage/content/i18n";
import { enquiryPath } from "@homepage/content/enquiry";
import type { ServiceSlug } from "./services";

type CollaborationCopy = {
  label: string;
  headline: string;
  description: string;
  intro: string;
  teaser: string;
  project: { text: string; outputs: readonly string[] };
  team: { text: string; outputs: readonly string[] };
  inputs: readonly string[];
  milestone: string;
  effort: string;
};

export const serviceCollaborations: Record<
  ServiceSlug,
  Record<Locale, CollaborationCopy>
> = {
  "product-interfaces": {
    en: {
      label: "Product-interface delivery & team collaboration",
      headline:
        "Take the interface from a difficult task to a working product.",
      teaser:
        "Take a configurator, editor or data-heavy interface from concept into code, or bring UX and frontend engineering into your team.",
      description:
        "UX and frontend delivery for configurators, visual editors and data-heavy products. Scope a project with Alexander Fuerst or bring him into your existing team.",
      intro:
        "I connect interaction design and implementation for product teams with a complex interface to build or improve. We can agree a delivery milestone or define a role alongside your designers and developers. An interface review is available when you need a clearer starting point.",
      project: {
        text: "Give one important user task a clear path from concept to implementation. I can take responsibility for the interaction design and frontend, coordinating integration with your developers.",
        outputs: [
          "An agreed flow and acceptance criteria",
          "A testable interaction direction",
          "Implemented states, real data and failure handling",
          "Reviewed code and an agreed handover",
        ],
      },
      team: {
        text: "Bring UX and engineering into the same conversation. I work within your team's product process, design system and codebase, with responsibilities and decision-making agreed at the start.",
        outputs: [
          "A defined area of product responsibility",
          "Design and implementation alongside your team",
          "Regular reviews and visible decisions",
          "Documentation your team can continue with",
        ],
      },
      inputs: [
        "A walkthrough of the product and a task that needs to work better.",
        "A product contact and someone who understands the relevant code and systems.",
        "Access to the existing design system, representative data and development workflow when implementation starts.",
      ],
      milestone:
        "Choose one flow, agree the relevant states and review a working slice with your team. That gives us a concrete basis for the next delivery decision.",
      effort:
        "Effort depends on interaction complexity, the condition of the existing frontend, integration dependencies and the validation needed. We discuss those before agreeing a milestone, schedule and fee.",
    },
    de: {
      label: "Produktinterfaces umsetzen & Teams verstärken",
      headline: "Von der schwierigen Aufgabe zum funktionierenden Interface.",
      teaser:
        "Einen Konfigurator, Editor oder ein Dateninterface vom Konzept in Code bringen oder euer Team mit UX und Frontend-Entwicklung verstärken.",
      description:
        "UX und Frontend-Umsetzung für Konfiguratoren, visuelle Editoren und datenreiche Produkte. Vereinbare ein Projekt mit Alexander Fuerst oder hole ihn in dein Team.",
      intro:
        "Ich verbinde Interaktionsdesign und Umsetzung für Produktteams, die ein komplexes Interface entwickeln oder verbessern wollen. Wir vereinbaren einen Umsetzungsschritt oder eine Rolle an der Seite eurer Designer und Entwickler. Ein Interface-Review hilft, wenn der passende Einstieg noch unklar ist.",
      project: {
        text: "Wir bringen eine wichtige Nutzeraufgabe vom Konzept in die Anwendung. Ich kann Interaktionsdesign und Frontend verantworten und die Integration mit euren Entwicklern abstimmen.",
        outputs: [
          "Ein vereinbarter Ablauf mit Abnahmekriterien",
          "Eine prüfbare Richtung für die Interaktion",
          "Umgesetzte Zustände, echte Daten und Fehlerbehandlung",
          "Geprüfter Code und eine vereinbarte Übergabe",
        ],
      },
      team: {
        text: "UX und Entwicklung kommen an einen Tisch. Ich arbeite in eurem Produktprozess, Designsystem und Codebestand mit. Zuständigkeiten und Entscheidungswege klären wir zu Beginn.",
        outputs: [
          "Ein klarer Verantwortungsbereich im Produkt",
          "Design und Umsetzung gemeinsam mit eurem Team",
          "Regelmäßige Reviews und nachvollziehbare Entscheidungen",
          "Dokumentation, mit der euer Team weiterarbeiten kann",
        ],
      },
      inputs: [
        "Ein gemeinsamer Blick auf das Produkt und eine Aufgabe, die besser funktionieren soll.",
        "Eine Ansprechperson fürs Produkt und jemanden, der den relevanten Code und die Systeme kennt.",
        "Zum Umsetzungsstart Zugang zum Designsystem, repräsentative Daten und Einblick in euren Entwicklungsablauf.",
      ],
      milestone:
        "Wir wählen einen Ablauf, vereinbaren die relevanten Zustände und prüfen einen funktionierenden Ausschnitt mit eurem Team. Damit lässt sich der nächste Umsetzungsschritt konkret entscheiden.",
      effort:
        "Der Aufwand hängt von der Interaktionskomplexität, dem vorhandenen Frontend, Integrationsabhängigkeiten und der nötigen Validierung ab. Das besprechen wir vor der Vereinbarung von Meilenstein, Zeitplan und Honorar.",
    },
  },
  "ai-automation": {
    en: {
      label: "Automation delivery & team collaboration",
      headline: "Build the workflow. Make it work for the people using it.",
      teaser:
        "Build a working data pipeline or automation, or bring implementation support into the team that owns your workflows.",
      description:
        "Build data pipelines, tool integrations and automations with Alexander Fuerst. Agree a delivery milestone or add implementation capacity to your existing team.",
      intro:
        "I help teams turn repeated manual work into connected software. We can deliver one workflow from source to result or work together on your existing systems. The workflow assessment is an optional starting point when the right approach still needs investigation.",
      project: {
        text: "Take one recurring workflow through implementation and validation. We choose rules, APIs or AI around the task, with clear handling for exceptions and human decisions.",
        outputs: [
          "A workflow with agreed inputs and expected results",
          "Connected sources, transformations and destinations",
          "Checks using representative examples and exceptions",
          "Run visibility, operating notes and an agreed handover",
        ],
      },
      team: {
        text: "Add practical engineering capacity for integrations, data processing and browser workflows. I work with the people who do the task and the developers responsible for the connected systems.",
        outputs: [
          "An agreed workflow or integration to own",
          "Implementation within your existing stack",
          "Inspectable results and review points",
          "Shared documentation and operational responsibilities",
        ],
      },
      inputs: [
        "A person who performs the workflow and can explain its exceptions.",
        "Representative inputs and expected outputs, shared through an agreed channel.",
        "Contacts for source-system access, API permissions and the destination of the results.",
      ],
      milestone:
        "Connect the critical path for one workflow, run representative examples and review both successful results and exceptions before expanding the scope.",
      effort:
        "Effort depends on source access, data quality, API limits, exception handling and operating requirements. Model and service costs are considered where relevant; fee and schedule are agreed for the chosen scope.",
    },
    de: {
      label: "Automatisierungen umsetzen & Teams verstärken",
      headline: "Den Ablauf bauen. Und im Arbeitsalltag nutzbar machen.",
      teaser:
        "Eine Datenpipeline oder Automatisierung umsetzen oder euer Team bei der Entwicklung seiner Abläufe unterstützen.",
      description:
        "Datenpipelines, Tool-Integrationen und Automatisierungen mit Alexander Fuerst umsetzen. Als vereinbartes Projekt oder als Unterstützung in deinem bestehenden Team.",
      intro:
        "Ich unterstütze Teams dabei, wiederkehrende Handarbeit in verbundene Software zu überführen. Wir setzen einen Ablauf von der Quelle bis zum Ergebnis um oder arbeiten gemeinsam an euren bestehenden Systemen. Das Workflow-Assessment ist ein möglicher Einstieg, wenn der passende Ansatz noch untersucht werden muss.",
      project: {
        text: "Wir bringen einen wiederkehrenden Ablauf durch Umsetzung und Validierung. Regeln, APIs oder KI richten sich nach der Aufgabe; Ausnahmen und menschliche Entscheidungen bekommen einen klaren Platz.",
        outputs: [
          "Ein Ablauf mit vereinbarten Eingaben und erwarteten Ergebnissen",
          "Verbundene Quellen, Verarbeitungsschritte und Zielsysteme",
          "Prüfungen mit repräsentativen Beispielen und Ausnahmen",
          "Nachvollziehbare Ausführungen, Betriebshinweise und Übergabe",
        ],
      },
      team: {
        text: "Praktische Unterstützung für Integrationen, Datenverarbeitung und Browser-Abläufe. Ich arbeite mit den Menschen, die die Aufgabe erledigen, und den Entwicklern der beteiligten Systeme.",
        outputs: [
          "Ein vereinbarter Ablauf oder eine Integration als Verantwortungsbereich",
          "Umsetzung innerhalb eures bestehenden Stacks",
          "Prüfbare Ergebnisse und klare Review-Punkte",
          "Gemeinsame Dokumentation und Zuständigkeiten für den Betrieb",
        ],
      },
      inputs: [
        "Eine Person, die den Ablauf durchführt und seine Ausnahmen kennt.",
        "Repräsentative Eingaben und erwartete Ergebnisse über einen vereinbarten Kanal.",
        "Ansprechpersonen für Systemzugänge, API-Berechtigungen und die Zielsysteme der Ergebnisse.",
      ],
      milestone:
        "Wir verbinden den entscheidenden Pfad eines Ablaufs, führen repräsentative Beispiele aus und prüfen Ergebnisse und Ausnahmen, bevor der Umfang wächst.",
      effort:
        "Zugänge, Datenqualität, API-Grenzen, Ausnahmebehandlung und Betriebsanforderungen bestimmen den Aufwand. Modell- und Dienstkosten berücksichtigen wir, wo sie anfallen. Honorar und Zeitplan vereinbaren wir für den gewählten Umfang.",
    },
  },
  "ai-products": {
    en: {
      label: "AI product delivery & team collaboration",
      headline: "Give a useful AI feature a place in your product.",
      teaser:
        "Explore and integrate a useful AI feature, with product thinking, interaction design and engineering alongside your team.",
      description:
        "Explore, prototype and integrate an AI product feature with Alexander Fuerst. Connect product thinking, UX and engineering in a project or within your existing team.",
      intro:
        "I work with founders and product teams to find a useful role for AI and build it into the experience. We can test a first idea, take a feature through integration or define ongoing involvement alongside your team.",
      project: {
        text: "Choose one customer or internal task, test a working feature and decide what deserves integration. We agree how to judge usefulness before expanding the build.",
        outputs: [
          "A focused use case and evaluation criteria",
          "A working feature with representative data",
          "Interaction, review and fallback behavior",
          "An integration and operating plan for the agreed stage",
        ],
      },
      team: {
        text: "Bring product thinking, interaction design and AI integration into your team's work. I can take a defined feature area from opportunity through implementation while sharing decisions with your product and engineering leads.",
        outputs: [
          "An agreed feature area and delivery responsibilities",
          "Prototypes and implementation in your product context",
          "Quality, failure-case and cost reviews",
          "Documented decisions and an agreed maintenance owner",
        ],
      },
      inputs: [
        "A product walkthrough and the people who understand its users.",
        "Examples of the task and representative data we are permitted to use.",
        "A product and technical contact to agree integration, access and evaluation.",
      ],
      milestone:
        "Put one useful interaction in someone's hands. Review output quality, how people steer it and what happens when it fails, then decide the next integration step.",
      effort:
        "Effort depends on the task, data access, quality requirements and integration depth. We also consider model costs and evaluation needs before agreeing scope, fee and schedule.",
    },
    de: {
      label: "KI-Produkte umsetzen & Teams verstärken",
      headline: "Eine nützliche KI-Funktion in dein Produkt bringen.",
      teaser:
        "Eine sinnvolle KI-Funktion erkunden und integrieren, mit Produktdenken, Interaktionsdesign und Engineering an der Seite eures Teams.",
      description:
        "KI-Produktfunktionen mit Alexander Fuerst erkunden, testen und integrieren. Produktdenken, UX und Engineering als Projekt oder in deinem bestehenden Team verbinden.",
      intro:
        "Ich arbeite mit Gründern und Produktteams daran, KI eine sinnvolle Aufgabe im Produkt zu geben. Wir können eine erste Idee testen, eine Funktion integrieren oder eine längerfristige Mitarbeit in eurem Team vereinbaren.",
      project: {
        text: "Wir wählen eine Aufgabe für Kunden oder interne Nutzer, testen eine funktionierende Umsetzung und entscheiden, was integriert werden soll. Wie wir den Nutzen beurteilen, klären wir vor dem Ausbau.",
        outputs: [
          "Ein fokussierter Anwendungsfall mit Bewertungskriterien",
          "Eine funktionierende Umsetzung mit repräsentativen Daten",
          "Interaktion, Review und Verhalten bei Fehlern",
          "Ein Integrations- und Betriebsplan für den vereinbarten Stand",
        ],
      },
      team: {
        text: "Produktdenken, Interaktionsdesign und KI-Integration werden Teil eurer gemeinsamen Arbeit. Ich kann einen abgegrenzten Funktionsbereich von der Idee bis zur Umsetzung begleiten und Entscheidungen mit Produkt- und Entwicklungsverantwortlichen abstimmen.",
        outputs: [
          "Ein vereinbarter Funktionsbereich mit klaren Zuständigkeiten",
          "Prototypen und Umsetzung im Kontext eures Produkts",
          "Reviews zu Qualität, Fehlerfällen und Kosten",
          "Dokumentierte Entscheidungen und Zuständigkeit für die Wartung",
        ],
      },
      inputs: [
        "Ein gemeinsamer Blick ins Produkt mit Menschen, die seine Nutzer kennen.",
        "Aufgabenbeispiele und repräsentative Daten, die wir verwenden dürfen.",
        "Eine produktverantwortliche und eine technische Ansprechperson für Integration, Zugänge und Bewertung.",
      ],
      milestone:
        "Wir machen eine nützliche Interaktion benutzbar und prüfen Ergebnisqualität, Steuerbarkeit und Verhalten bei Fehlern. Danach entscheiden wir über den nächsten Integrationsschritt.",
      effort:
        "Aufgabe, Datenzugang, Qualitätsanforderungen und Integrationstiefe bestimmen den Aufwand. Modellkosten und laufende Bewertung fließen ein, bevor wir Umfang, Honorar und Zeitplan vereinbaren.",
    },
  },
};

export function serviceCollaborationPath(slug: ServiceSlug, locale: Locale) {
  return localizedPath(`/services/${slug}/collaboration`, locale);
}

export function collaborationEnquiry(
  slug: ServiceSlug,
  locale: Locale,
  mode: "project" | "team",
) {
  return enquiryPath(
    {
      source: "service",
      service: slug,
      ...(mode === "team" ? { intent: "team" } : {}),
    },
    locale,
  );
}
