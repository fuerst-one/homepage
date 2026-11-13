import { localizedPath, type Locale } from "../lib/i18n";

export type ServiceLocale = Locale;
export const serviceSlugs = ["product-interfaces", "ai-automation"] as const;
export type ServiceSlug = (typeof serviceSlugs)[number];

export function isServiceSlug(value: string): value is ServiceSlug {
  return serviceSlugs.some((slug) => slug === value);
}

export function servicePath(slug: ServiceSlug, locale: ServiceLocale) {
  return localizedPath(`/services/${slug}`, locale);
}

export const serviceProjects: Record<ServiceSlug, readonly string[]> = {
  "product-interfaces": [
    "15b86514-f736-803e-b9b7-e47ebc2406d1",
    "153f6668-f4d6-490a-8345-0b999b35305a",
  ],
  "ai-automation": [
    "11d86514-f736-80ed-935c-e6fe30b59d42",
    "35486514-f736-8020-bde8-e0f741a1a77a",
  ],
};

type ServiceCopy = {
  label: string;
  title: string;
  description: string;
  headline: string;
  intro: string;
  cta: string;
  emailSubject: string;
  emailBody: string;
  reassurance: string;
  evidenceIntro: string;
  workHeading: string;
  workIntro: string;
  deliverables: readonly { title: string; text: string; output: string }[];
  process: readonly { title: string; text: string }[];
  fit: string;
  questions: readonly { question: string; answer: string }[];
  closing: string;
  closingText: string;
};

export const serviceCopy: Record<
  ServiceSlug,
  Record<ServiceLocale, ServiceCopy>
> = {
  "product-interfaces": {
    en: {
      label: "Complex product interfaces",
      title:
        "Configurators, visual editors & product interfaces — Alexander Fuerst",
      description:
        "Turn complex products into interfaces people can use. Alexander Fuerst combines UX and engineering for configurators, visual editors and data-heavy applications.",
      headline: "Your product is complex. Using it shouldn’t be.",
      intro:
        "Help customers configure with confidence. Give experts a clearer view of their data. I design and build interfaces that make demanding tasks feel manageable — from the first interaction to the details that make them work.",
      cta: "Let’s untangle your product",
      emailSubject: "Let's talk about a product interface",
      emailBody:
        "Hi Alexander,\n\nOur product / interface:\nThe task users struggle with:\nWhat we'd like to change:\n\nOptional: a link, screenshot, or timeline.\n",
      reassurance:
        "A few lines about your product are enough to start. You’ll speak directly with me.",
      evidenceIntro:
        "From motorcycle decal design to maritime logistics: different industries, the same challenge — making complex decisions easier to act on.",
      workHeading: "Keep the capability. Lose the friction.",
      workIntro:
        "When users need a walkthrough for every task, another feature rarely solves the problem. A clearer workflow can.",
      deliverables: [
        {
          title: "Configurators that make choices tangible",
          text: "Guide people through variants, dependencies and customization. Show what changes as they make a decision, so they can understand the result before moving forward.",
          output: "Interaction concept · configuration flow · working frontend",
        },
        {
          title: "Visual editors built for real work",
          text: "Turn specialist tasks into usable tools: canvas interactions, direct manipulation, previews and the small controls that keep creative work flowing.",
          output:
            "Editor UX · interactive prototype · production implementation",
        },
        {
          title: "Data interfaces that support decisions",
          text: "Bring dense information into focus with useful filters, maps and visualizations. Design around what people need to decide, rather than everything a database can show.",
          output: "User journeys · data visualization · reusable components",
        },
      ],
      process: [
        {
          title: "Find the sticking point",
          text: "We look at the product, the people using it and one task that matters. Existing research, support questions and a walkthrough give us a concrete starting point.",
        },
        {
          title: "Make the interaction testable",
          text: "I turn the critical flow into a prototype. We review it with your team and, where possible, actual users before committing to the wider build.",
        },
        {
          title: "Build it into your product",
          text: "I implement the agreed experience with your existing stack where practical, including real data, edge cases and a handover your team can use.",
        },
      ],
      fit: "For product teams and founders with a configurator, editor or data-heavy application — whether you need a focused improvement or someone to take a new interface from concept into code.",
      questions: [
        {
          question: "Can you work with our existing product and developers?",
          answer:
            "Yes. We can start with a single flow or component and build on your existing design system and code. We’ll agree the boundaries and technical responsibilities before implementation.",
        },
        {
          question: "Do you handle both UX and development?",
          answer:
            "Yes. I connect interaction design with frontend engineering. You can involve me for discovery and prototyping, implementation, or the full path between them.",
        },
        {
          question: "What does a project cost, and how long does it take?",
          answer:
            "That depends on the scope, integrations and current state of your product. Send a short description or a link. We can define a useful first milestone and discuss effort before you commit to a build.",
        },
        {
          question: "What if we don’t have a detailed brief?",
          answer:
            "Start with the task that feels harder than it should. A screenshot, an existing product or a description of the problem is enough for an initial conversation.",
        },
      ],
      closing: "Which part of your product should feel easier?",
      closingText:
        "Show me the flow, the editor, or the screen everyone explains twice. Let’s work out a useful next step.",
    },
    de: {
      label: "Komplexe Produktinterfaces",
      title:
        "Konfiguratoren, visuelle Editoren & Produktinterfaces — Alexander Fuerst",
      description:
        "Komplexe Produkte verständlich bedienbar machen: UX und Entwicklung für Konfiguratoren, visuelle Editoren und datenreiche Anwendungen mit Alexander Fuerst.",
      headline: "Dein Produkt ist komplex. Die Bedienung muss es nicht sein.",
      intro:
        "Kunden sollen sicher konfigurieren können. Fachleute sollen ihre Daten überblicken. Ich gestalte und entwickle Interfaces, die anspruchsvolle Aufgaben beherrschbar machen — vom ersten Klick bis zu den Details, auf die es im Alltag ankommt.",
      cta: "Lass uns dein Produkt vereinfachen",
      emailSubject: "Anfrage zu einem Produktinterface",
      emailBody:
        "Hi Alexander,\n\nUnser Produkt / Interface:\nDiese Aufgabe fällt unseren Nutzern schwer:\nDas möchten wir verändern:\n\nOptional: Link, Screenshot oder Zeitrahmen.\n",
      reassurance:
        "Ein paar Zeilen über dein Produkt reichen für den Anfang. Du sprichst direkt mit mir.",
      evidenceIntro:
        "Vom Motorrad-Dekordesign bis zur maritimen Logistik: andere Branchen, dieselbe Herausforderung — komplexe Entscheidungen verständlich machen.",
      workHeading: "Die Möglichkeiten bleiben. Die Hürden gehen.",
      workIntro:
        "Wenn Nutzer bei jeder Aufgabe eine Erklärung brauchen, hilft selten noch eine Funktion. Ein klarerer Ablauf kann den Unterschied machen.",
      deliverables: [
        {
          title: "Konfiguratoren, die Entscheidungen greifbar machen",
          text: "Varianten, Abhängigkeiten und Individualisierung verständlich führen. Nutzer sehen, was ihre Auswahl bewirkt, und verstehen das Ergebnis, bevor sie weitermachen.",
          output:
            "Interaktionskonzept · Konfigurationsablauf · funktionierendes Frontend",
        },
        {
          title: "Visuelle Editoren für echte Aufgaben",
          text: "Spezialaufgaben werden zu bedienbaren Werkzeugen: Canvas-Interaktionen, direkte Bearbeitung, Vorschauen und die kleinen Bedienelemente, die kreatives Arbeiten im Fluss halten.",
          output: "Editor-UX · interaktiver Prototyp · Produktimplementierung",
        },
        {
          title: "Dateninterfaces, die Entscheidungen unterstützen",
          text: "Filter, Karten und Visualisierungen bringen Ordnung in dichte Informationen. Im Mittelpunkt steht, was Menschen entscheiden müssen — nicht alles, was die Datenbank hergibt.",
          output:
            "Nutzerabläufe · Datenvisualisierung · wiederverwendbare Komponenten",
        },
      ],
      process: [
        {
          title: "Den Engpass verstehen",
          text: "Wir schauen auf dein Produkt, seine Nutzer und eine entscheidende Aufgabe. Vorhandenes Research, Supportfragen und ein gemeinsamer Durchgang geben uns einen konkreten Ausgangspunkt.",
        },
        {
          title: "Die Interaktion erprobbar machen",
          text: "Ich übersetze den wichtigsten Ablauf in einen Prototyp. Wir prüfen ihn mit deinem Team und, wenn möglich, echten Nutzern, bevor wir die größere Umsetzung festlegen.",
        },
        {
          title: "Im Produkt umsetzen",
          text: "Ich entwickle die abgestimmte Lösung möglichst in deinem bestehenden Stack — mit echten Daten, Sonderfällen und einer Übergabe, mit der dein Team weiterarbeiten kann.",
        },
      ],
      fit: "Für Produktteams und Gründer mit einem Konfigurator, Editor oder einer datenreichen Anwendung — für eine gezielte Verbesserung genauso wie für ein neues Interface vom Konzept bis zum Code.",
      questions: [
        {
          question:
            "Kannst du mit unserem bestehenden Produkt und Entwicklerteam arbeiten?",
          answer:
            "Ja. Wir können mit einem einzelnen Ablauf oder einer Komponente beginnen und auf eurem Designsystem und Code aufbauen. Zuständigkeiten und technische Grenzen klären wir vor der Umsetzung.",
        },
        {
          question: "Übernimmst du UX und Entwicklung?",
          answer:
            "Ja. Ich verbinde Interaktionsdesign und Frontend-Entwicklung. Du kannst mich für Konzeption und Prototyping, für die Umsetzung oder für den gesamten Weg dazwischen einbinden.",
        },
        {
          question: "Was kostet ein Projekt und wie lange dauert es?",
          answer:
            "Das hängt vom Umfang, den Schnittstellen und dem aktuellen Stand deines Produkts ab. Schick mir eine kurze Beschreibung oder einen Link. Dann können wir einen sinnvollen ersten Meilenstein und den Aufwand besprechen, bevor du eine Umsetzung beauftragst.",
        },
        {
          question: "Was, wenn wir noch kein fertiges Briefing haben?",
          answer:
            "Starte mit der Aufgabe, die sich unnötig schwer anfühlt. Ein Screenshot, ein bestehendes Produkt oder eine Beschreibung des Problems reichen für ein erstes Gespräch.",
        },
      ],
      closing: "Was sollte sich in deinem Produkt leichter anfühlen?",
      closingText:
        "Zeig mir den Ablauf, den Editor oder die Ansicht, die ihr immer zweimal erklären müsst. Lass uns einen sinnvollen nächsten Schritt finden.",
    },
  },
  "ai-automation": {
    en: {
      label: "AI automation & prototypes",
      title: "AI automation & working prototypes — Alexander Fuerst",
      description:
        "Connect your tools, reduce repetitive work and test product ideas with working prototypes. Practical AI automation and product engineering by Alexander Fuerst.",
      headline: "Less copying between tools. More moving things forward.",
      intro:
        "Your team shouldn’t have to be the integration between its tools. I build automations that connect the work — and prototypes that turn “could this work?” into something you can actually try.",
      cta: "Let’s talk about your workflow",
      emailSubject: "Let's talk about automation or a prototype",
      emailBody:
        "Hi Alexander,\n\nThe workflow or idea:\nThe tools we use:\nThe result we'd like:\n\nOptional: an example of the current process or a timeline.\n",
      reassurance:
        "Start with one repetitive task or one product question. No technical specification needed.",
      evidenceIntro:
        "AI-supported survey analysis and a personal multi-agent development tool. Concrete examples of turning information and repeated steps into usable software.",
      workHeading: "Start with the work. Build what helps.",
      workIntro:
        "The useful question is where your team loses time or your idea needs evidence. That determines what to automate, where AI fits and what needs a person’s judgment.",
      deliverables: [
        {
          title: "Connect the tools you already use",
          text: "Move information between systems, remove repeated data entry and make handoffs explicit. Start with one workflow and the access your tools actually provide.",
          output: "Workflow map · API integrations · error and retry handling",
        },
        {
          title: "Give AI a defined job",
          text: "Extract, organize or summarize information where a language model can help. Define review points and test against real examples, so uncertain output has somewhere to go.",
          output: "AI workflow · evaluation examples · human review points",
        },
        {
          title: "Put the idea in someone’s hands",
          text: "Test the riskiest assumption with a working prototype. Give users something to react to and your team a concrete basis for deciding what to build next.",
          output: "Focused scope · working prototype · findings and next steps",
        },
      ],
      process: [
        {
          title: "Pick a useful starting point",
          text: "We trace one workflow or isolate one product question. We look at the inputs, the desired result and the constraints before choosing tools.",
        },
        {
          title: "Build a small, real version",
          text: "I connect the critical systems or implement the core interaction. We try real examples and make limits, failure cases and review steps visible.",
        },
        {
          title: "Decide what deserves to scale",
          text: "We compare the result with the starting point. If it is useful, we plan monitoring, documentation and the next step. A prototype’s remaining gaps stay explicit.",
        },
      ],
      fit: "For teams with repeated manual handoffs, information that needs processing, or an idea that needs a working test before a larger investment.",
      questions: [
        {
          question: "Does every automation need AI?",
          answer:
            "No. Rules, APIs and ordinary code are often the clearer solution. I use AI when the task benefits from interpreting language or handling variable input, with checks appropriate to the consequences.",
        },
        {
          question: "Can you work with our existing tools and sensitive data?",
          answer:
            "We first check API access, permissions, hosting and what information may leave your systems. That determines the approach. Don’t send confidential data in your first email; we can agree a suitable way to review it.",
        },
        {
          question: "Will a prototype be ready for production?",
          answer:
            "A prototype is built to answer a question. Production may also need access controls, monitoring, resilience and a support plan. We’ll make those gaps clear and agree any production work separately.",
        },
        {
          question: "How do we start, and what will it cost?",
          answer:
            "Describe one repeated task or the idea you want to test, plus the tools involved. We can define a first milestone and discuss the effort. Scope, access and operational needs determine the cost; there’s no one-size-fits-all package.",
        },
      ],
      closing: "What are you tired of doing by hand?",
      closingText:
        "Or which idea needs to become real enough to test? Tell me what happens today and what you’d like to happen instead.",
    },
    de: {
      label: "KI-Automatisierung & Prototypen",
      title:
        "KI-Automatisierung & funktionierende Prototypen — Alexander Fuerst",
      description:
        "Tools verbinden, manuelle Arbeit reduzieren und Produktideen mit funktionierenden Prototypen testen. Praktische KI-Automatisierung mit Alexander Fuerst.",
      headline: "Weniger zwischen Tools kopieren. Mehr voranbringen.",
      intro:
        "Dein Team sollte nicht die Schnittstelle zwischen seinen Tools sein. Ich entwickle Automatisierungen, die Arbeitsschritte verbinden — und Prototypen, mit denen aus „Könnte das funktionieren?“ etwas wird, das du ausprobieren kannst.",
      cta: "Lass uns über deinen Ablauf sprechen",
      emailSubject: "Anfrage zu Automatisierung oder einem Prototyp",
      emailBody:
        "Hi Alexander,\n\nUnser Ablauf oder unsere Idee:\nDiese Tools nutzen wir:\nDas wünschen wir uns als Ergebnis:\n\nOptional: ein Beispiel des aktuellen Ablaufs oder ein Zeitrahmen.\n",
      reassurance:
        "Eine wiederkehrende Aufgabe oder eine Produktfrage reicht. Ein technisches Konzept brauchst du dafür noch nicht.",
      evidenceIntro:
        "KI-gestützte Umfrageauswertung und ein eigenes Multi-Agenten-Entwicklungstool. Konkrete Beispiele dafür, wie aus Informationen und wiederkehrenden Schritten nutzbare Software wird.",
      workHeading: "Bei der Arbeit anfangen. Bauen, was hilft.",
      workIntro:
        "Wo verliert dein Team Zeit? Welche Annahme muss deine Idee erst beweisen? Daraus ergibt sich, was wir automatisieren, wo KI hilft und wo menschliches Urteil nötig bleibt.",
      deliverables: [
        {
          title: "Die vorhandenen Tools verbinden",
          text: "Informationen zwischen Systemen übertragen, doppelte Dateneingabe vermeiden und Übergaben klar machen. Wir starten mit einem Ablauf und den Zugängen, die deine Tools tatsächlich bieten.",
          output:
            "Prozessübersicht · API-Anbindungen · Fehler- und Wiederholungslogik",
        },
        {
          title: "KI eine klar umrissene Aufgabe geben",
          text: "Informationen auslesen, strukturieren oder zusammenfassen, wo ein Sprachmodell helfen kann. Mit echten Beispielen testen und Prüfschritte festlegen, damit unsichere Ergebnisse aufgefangen werden.",
          output: "KI-Ablauf · Testbeispiele · menschliche Prüfpunkte",
        },
        {
          title: "Die Idee ausprobierbar machen",
          text: "Die entscheidende Annahme mit einem funktionierenden Prototyp testen. Nutzer bekommen etwas Greifbares und dein Team eine Grundlage für die nächste Produktentscheidung.",
          output:
            "Klarer Umfang · funktionierender Prototyp · Erkenntnisse und nächste Schritte",
        },
      ],
      process: [
        {
          title: "Einen sinnvollen Anfang finden",
          text: "Wir verfolgen einen Ablauf oder grenzen eine Produktfrage ein. Eingaben, gewünschtes Ergebnis und Rahmenbedingungen stehen fest, bevor wir Tools auswählen.",
        },
        {
          title: "Eine kleine, echte Version bauen",
          text: "Ich verbinde die entscheidenden Systeme oder entwickle die zentrale Interaktion. Wir testen echte Beispiele und machen Grenzen, Fehlerfälle und Prüfschritte sichtbar.",
        },
        {
          title: "Entscheiden, was weiter wachsen soll",
          text: "Wir vergleichen das Ergebnis mit dem Ausgangspunkt. Wenn es hilft, planen wir Überwachung, Dokumentation und den nächsten Schritt. Offene Punkte eines Prototyps bleiben klar benannt.",
        },
      ],
      fit: "Für Teams mit wiederkehrenden manuellen Übergaben, Informationen, die verarbeitet werden müssen, oder einer Idee, die vor der größeren Investition einen Praxistest braucht.",
      questions: [
        {
          question: "Braucht jede Automatisierung KI?",
          answer:
            "Nein. Regeln, APIs und klassischer Code sind oft die klarere Lösung. KI setze ich ein, wenn das Verstehen von Sprache oder wechselnden Eingaben hilft — mit Prüfungen, die zu den möglichen Folgen passen.",
        },
        {
          question: "Kannst du mit unseren Tools und sensiblen Daten arbeiten?",
          answer:
            "Zuerst klären wir API-Zugänge, Berechtigungen, Hosting und welche Informationen deine Systeme verlassen dürfen. Daraus ergibt sich die Lösung. Schick in der ersten E-Mail noch keine vertraulichen Daten; einen passenden Weg zur Einsicht stimmen wir ab.",
        },
        {
          question: "Ist ein Prototyp direkt produktionsreif?",
          answer:
            "Ein Prototyp soll eine Frage beantworten. Für den Produktivbetrieb können zusätzlich Zugriffsschutz, Monitoring, Ausfallsicherheit und ein Betreuungskonzept nötig sein. Diese Lücken machen wir sichtbar und stimmen die Umsetzung separat ab.",
        },
        {
          question: "Wie starten wir und was kostet das?",
          answer:
            "Beschreibe eine wiederkehrende Aufgabe oder die Idee, die du testen willst, und die beteiligten Tools. Dann können wir einen ersten Meilenstein und den Aufwand besprechen. Umfang, Zugänge und Betriebsanforderungen bestimmen die Kosten; es gibt kein pauschales Paket für alles.",
        },
      ],
      closing: "Was möchtest du nicht mehr von Hand erledigen?",
      closingText:
        "Oder welche Idee muss endlich ausprobierbar werden? Erzähl mir, was heute passiert und wie es stattdessen laufen soll.",
    },
  },
};

export function serviceEmail(slug: ServiceSlug, locale: ServiceLocale) {
  const copy = serviceCopy[slug][locale];
  return `mailto:alexander@fuerst.one?subject=${encodeURIComponent(copy.emailSubject)}&body=${encodeURIComponent(copy.emailBody)}`;
}
