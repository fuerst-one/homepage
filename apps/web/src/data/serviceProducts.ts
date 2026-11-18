import { localizedPath, type Locale } from "@homepage/content/i18n";
import type { ServiceSlug } from "./services";

export const serviceProductSlugs = [
  "product-interfaces",
  "ai-automation",
] as const;
export type ServiceProductSlug = (typeof serviceProductSlugs)[number];

export function isServiceProductSlug(
  service: ServiceSlug,
): service is ServiceProductSlug {
  return serviceProductSlugs.some((slug) => slug === service);
}

type ProductCopy = {
  label: string;
  title: string;
  description: string;
  headline: string;
  intro: string;
  teaser: string;
  decision: string;
  fit: string;
  deliverables: readonly { title: string; text: string }[];
  inputs: readonly string[];
  boundary: string;
  cta: string;
  heroCta: string;
  subject: string;
  brief: string;
};

export const serviceProducts: Record<
  ServiceProductSlug,
  { segment: string; copy: Record<Locale, ProductCopy> }
> = {
  "product-interfaces": {
    segment: "review",
    copy: {
      en: {
        label: "Product-interface review",
        title:
          "Product-interface review for configurators & editors — Alexander Fuerst",
        description:
          "A focused UX and frontend review of one important product flow. Get annotated findings, clear priorities and an implementation brief before planning a bigger redesign.",
        headline: "Know what to fix before you redesign.",
        intro:
          "One important task. A fresh look at where people get stuck. A concrete direction your team can act on. Start with a focused review of your configurator, visual editor or data-heavy application.",
        teaser:
          "Start with one critical flow: an annotated review, prioritized improvements and a brief your team can build from.",
        decision:
          "Leave with a clearer answer to: what should we change first, why does it matter, and what would implementation involve?",
        fit: "For product teams with a working interface, a recurring usability problem or a redesign decision ahead. Especially useful when support keeps explaining the same task, or a powerful feature is difficult to use.",
        deliverables: [
          {
            title: "An annotated walkthrough",
            text: "A review of the agreed task, with screenshots and observations connecting interface behavior to the user's goal. Findings distinguish observed problems from assumptions that need validation.",
          },
          {
            title: "A prioritized improvement list",
            text: "A short list of changes ordered by user impact and implementation considerations. Each recommendation explains the problem it addresses and any dependencies.",
          },
          {
            title: "A proposed interaction direction",
            text: "A focused sketch or flow showing how the most important interaction could work. The format is agreed for your task; this is a direction to review, not a full redesign.",
          },
          {
            title: "A brief for the next implementation step",
            text: "A handover describing the proposed scope, relevant states and open questions, so your developers or a future implementation partner can assess the next step.",
          },
        ],
        inputs: [
          "A product link, screenshots or a walkthrough of the relevant flow.",
          "One task users need to complete and the problem you are seeing.",
          "Existing research, support examples and technical constraints, if available.",
        ],
        boundary:
          "The review covers one agreed flow. New user research, a complete design system, production code and a full product redesign require a separate scope. A review alone does not establish a conversion lift.",
        cta: "Discuss an interface review",
        heroCta: "Review one flow",
        subject: "Product-interface review enquiry",
        brief:
          "Hi Alexander,\n\nOur product or a link:\nThe one flow we'd like reviewed:\nWhat users struggle with:\n\nOptional: existing evidence, constraints or timing.\n",
      },
      de: {
        label: "Produktinterface-Review",
        title:
          "UX-Review für Konfiguratoren & visuelle Editoren — Alexander Fürst",
        description:
          "Ein fokussiertes UX- und Frontend-Review für einen wichtigen Produktablauf: kommentierte Befunde, klare Prioritäten und ein Briefing für die nächste Umsetzung.",
        headline: "Erst wissen, was hilft. Dann neu gestalten.",
        intro:
          "Eine wichtige Aufgabe. Ein frischer Blick auf die Stellen, an denen Nutzer hängen bleiben. Eine konkrete Richtung, mit der dein Team weiterarbeiten kann. Starte mit einem fokussierten Review deines Konfigurators, visuellen Editors oder Dateninterfaces.",
        teaser:
          "Starte mit einem entscheidenden Ablauf: kommentierte Befunde, priorisierte Verbesserungen und ein Briefing für dein Entwicklerteam.",
        decision:
          "Am Ende ist klarer: Was sollten wir zuerst verändern, warum ist es relevant und was würde die Umsetzung erfordern?",
        fit: "Für Produktteams mit einem bestehenden Interface, wiederkehrenden Bedienproblemen oder einem anstehenden Redesign. Besonders sinnvoll, wenn der Support immer dieselbe Aufgabe erklärt oder eine leistungsfähige Funktion schwer bedienbar ist.",
        deliverables: [
          {
            title: "Ein kommentierter Durchgang",
            text: "Screenshots und konkrete Beobachtungen zum vereinbarten Ablauf verbinden das Verhalten des Interfaces mit dem Nutzerziel. Beobachtete Probleme und noch zu prüfende Annahmen bleiben unterscheidbar.",
          },
          {
            title: "Eine priorisierte Verbesserungsliste",
            text: "Eine überschaubare Liste sinnvoller Änderungen, geordnet nach Nutzerrelevanz und Überlegungen zur Umsetzung. Jede Empfehlung benennt das Problem und mögliche Abhängigkeiten.",
          },
          {
            title: "Ein Vorschlag für die Interaktion",
            text: "Eine gezielte Skizze oder ein Ablauf zeigt, wie die wichtigste Interaktion funktionieren könnte. Das passende Format vereinbaren wir für deine Aufgabe: eine prüfbare Richtung, kein komplettes Redesign.",
          },
          {
            title: "Ein Briefing für die nächste Umsetzung",
            text: "Eine Übergabe beschreibt den vorgeschlagenen Umfang, wichtige Zustände und offene Fragen. Damit kann dein Team oder ein späterer Umsetzungspartner den nächsten Schritt einschätzen.",
          },
        ],
        inputs: [
          "Ein Produktlink, Screenshots oder ein gemeinsamer Durchgang durch den Ablauf.",
          "Eine Aufgabe, die Nutzer erledigen sollen, und das beobachtete Problem.",
          "Vorhandenes Research, Supportbeispiele und technische Grenzen, sofern verfügbar.",
        ],
        boundary:
          "Das Review umfasst einen vereinbarten Ablauf. Neues Nutzerresearch, ein vollständiges Designsystem, Produktivcode und ein komplettes Redesign brauchen einen eigenen Umfang. Ein Review allein belegt keine Conversion-Steigerung.",
        cta: "Interface-Review besprechen",
        heroCta: "Einen Ablauf prüfen",
        subject: "Anfrage zum Produktinterface-Review",
        brief:
          "Hi Alexander,\n\nUnser Produkt oder ein Link:\nDiesen Ablauf möchten wir prüfen lassen:\nHier haben Nutzer Schwierigkeiten:\n\nOptional: vorhandene Erkenntnisse, Grenzen oder Zeitrahmen.\n",
      },
    },
  },
  "ai-automation": {
    segment: "assessment",
    copy: {
      en: {
        label: "Workflow & automation assessment",
        title: "Workflow & automation assessment — Alexander Fuerst",
        description:
          "Find a useful first automation before committing to a build. Assess one workflow, compare AI and conventional options, and get a practical implementation and validation brief.",
        headline: "Find the right workflow to automate first.",
        intro:
          "Before choosing tools, understand the work they need to do. We examine one recurring workflow and turn a promising idea into a practical decision about what to build, what to keep human and what to leave alone.",
        teaser:
          "Map one recurring workflow, compare AI and conventional automation, and define a useful first implementation step.",
        decision:
          "Leave with a grounded decision: automate this step, test this assumption first, or keep the current approach — with the reasoning written down.",
        fit: "For teams copying information between tools, manually processing repeated inputs or considering an AI integration without a clear starting point. You need access to the people who do the work; you do not need a technical specification.",
        deliverables: [
          {
            title: "A map of the current workflow",
            text: "Triggers, inputs, tools, handoffs and exceptions for one agreed process, including where people currently check or correct the work.",
          },
          {
            title: "A comparison of useful options",
            text: "Conventional rules, API integrations and AI are considered against the same task. The recommendation explains where AI adds value, where it creates uncertainty and where a person should remain involved.",
          },
          {
            title: "A feasibility and assumptions brief",
            text: "Required data and access, integration constraints, operating considerations and unresolved questions. Any effort or value estimates identify their assumptions rather than promising savings.",
          },
          {
            title: "A first implementation and validation plan",
            text: "A small proposed scope, example inputs and acceptance criteria that make the result testable before a larger commitment. Your team can use the brief to evaluate implementation options.",
          },
        ],
        inputs: [
          "A walkthrough with someone who regularly performs the task.",
          "The tools involved and a few representative examples, redacted where needed.",
          "The outcome you want, important exceptions and access or data constraints.",
        ],
        boundary:
          "The assessment covers one agreed workflow. Production integrations, a working prototype, model training and ongoing operation are separate engagements. If the evidence does not support automation, that is a useful finding too.",
        cta: "Discuss a workflow assessment",
        heroCta: "Assess one workflow",
        subject: "Workflow & automation assessment enquiry",
        brief:
          "Hi Alexander,\n\nThe recurring workflow:\nThe sources, tools and people involved:\nHow often it repeats:\nWhere the result should go:\nWhat we'd like to improve:\n\nOptional: frequency, an example or constraints.\n",
      },
      de: {
        label: "Workflow- und Automatisierungs-Assessment",
        title:
          "Workflow- und Automatisierungs-Assessment & Automatisierungsplanung — Alexander Fürst",
        description:
          "Den richtigen Einstieg in die Automatisierung finden: einen Ablauf prüfen, KI mit klassischen Lösungen vergleichen und Umsetzung sowie Erfolgskriterien konkret planen.",
        headline: "Finde den richtigen Ablauf für die erste Automatisierung.",
        intro:
          "Bevor wir Tools auswählen, muss klar sein, welche Arbeit sie übernehmen sollen. Wir prüfen einen wiederkehrenden Ablauf und klären konkret, was sich bauen lässt, wo Menschen entscheiden sollten und was besser so bleibt.",
        teaser:
          "Einen wiederkehrenden Ablauf verstehen, KI und klassische Automatisierung vergleichen und einen sinnvollen ersten Umsetzungsschritt festlegen.",
        decision:
          "Du gehst mit einer begründeten Entscheidung weiter: diesen Schritt automatisieren, diese Annahme zuerst prüfen oder den bisherigen Ablauf beibehalten — mit nachvollziehbarer Begründung.",
        fit: "Für Teams, die Informationen zwischen Tools kopieren, wiederkehrende Eingaben manuell verarbeiten oder KI einsetzen möchten, ohne einen klaren Einstieg zu haben. Wir brauchen den Blick der Menschen, die die Aufgabe erledigen, kein technisches Lastenheft.",
        deliverables: [
          {
            title: "Eine Karte des heutigen Ablaufs",
            text: "Auslöser, Eingaben, Tools, Übergaben und Ausnahmen für einen vereinbarten Prozess. Einschließlich der Stellen, an denen Menschen Ergebnisse heute prüfen oder korrigieren.",
          },
          {
            title: "Ein Vergleich sinnvoller Lösungswege",
            text: "Klassische Regeln, API-Integrationen und KI werden an derselben Aufgabe gemessen. Die Empfehlung erklärt, wo KI hilft, wo Unsicherheit entsteht und wo ein Mensch beteiligt bleiben sollte.",
          },
          {
            title: "Ein Briefing zu Machbarkeit und Annahmen",
            text: "Benötigte Daten und Zugriffe, technische Grenzen, Überlegungen zum Betrieb und offene Fragen. Mögliche Aufwands- oder Nutzenschätzungen nennen ihre Annahmen, statt Einsparungen zu versprechen.",
          },
          {
            title: "Ein Plan für Umsetzung und Prüfung",
            text: "Ein kleiner vorgeschlagener Umfang, Beispieleingaben und Abnahmekriterien machen das Ergebnis vor einer größeren Beauftragung prüfbar. Dein Team kann damit verschiedene Umsetzungsmöglichkeiten einschätzen.",
          },
        ],
        inputs: [
          "Ein gemeinsamer Durchgang mit jemandem, der die Aufgabe regelmäßig erledigt.",
          "Die beteiligten Tools und einige typische Beispiele, bei Bedarf anonymisiert.",
          "Das gewünschte Ergebnis, wichtige Ausnahmen und Grenzen bei Daten oder Zugriffen.",
        ],
        boundary:
          "Das Assessment umfasst einen vereinbarten Workflow. Produktive Integrationen, ein funktionierender Prototyp, Modelltraining und laufender Betrieb sind eigene Aufträge. Wenn die Erkenntnisse gegen eine Automatisierung sprechen, ist auch das ein nützliches Ergebnis.",
        cta: "Workflow-Assessment besprechen",
        heroCta: "Workflow prüfen lassen",
        subject: "Anfrage zum Workflow- und Automatisierungs-Assessment",
        brief:
          "Hi Alexander,\n\nDer wiederkehrende Ablauf:\nBeteiligte Quellen, Tools und Personen:\nSo oft wiederholt sich die Aufgabe:\nHier soll das Ergebnis ankommen:\nDas möchten wir verbessern:\n\nOptional: Häufigkeit, ein Beispiel oder wichtige Grenzen.\n",
      },
    },
  },
};

export const isServiceProduct = (
  service: ServiceSlug,
  product: string,
): service is ServiceProductSlug =>
  isServiceProductSlug(service) && serviceProducts[service].segment === product;

export const serviceProductPath = (
  service: ServiceProductSlug,
  locale: Locale,
) =>
  localizedPath(
    `/services/${service}/${serviceProducts[service].segment}`,
    locale,
  );

export function serviceProductEmail(
  service: ServiceProductSlug,
  locale: Locale,
) {
  const copy = serviceProducts[service].copy[locale];
  return `mailto:alexander@fuerst.one?subject=${encodeURIComponent(copy.subject)}&body=${encodeURIComponent(copy.brief)}`;
}
