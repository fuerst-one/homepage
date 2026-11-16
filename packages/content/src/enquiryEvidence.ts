import type { Enquiry } from "@homepage/content/enquiry";
import {
  CASE_VOCABULARY,
  type ProjectCase,
} from "@homepage/content/projectCase";

export type EnquiryEvidence = {
  id: string;
  name: string;
  href: string;
  summary: string;
  summaryLocale?: "en" | "de";
  caseStudy: ProjectCase;
};
type Brief = Pick<Enquiry, "intent" | "situation" | "outcome" | "context">;
type TopicField = "buyerNeeds" | "domains" | "aiCapabilities";
type Signal = { field: TopicField; value: string };
export type EvidenceMatch = {
  project: EnquiryEvidence;
  reasons: string[];
  partial: boolean;
  selected: boolean;
};

const normalize = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const aliases: Record<string, string[]> = {
  "Launch a new product": ["launch", "new product", "produkt starten"],
  "Improve a complex interface": [
    "interface",
    "usability",
    "ux",
    "oberflache",
    "bedienbarkeit",
  ],
  "Automate repetitive work": [
    "automation",
    "automate",
    "automating",
    "automatisierung",
    "automatisieren",
    "repetitive work",
  ],
  "Add AI capabilities": [
    "ai",
    "ki",
    "llm",
    "artificial intelligence",
    "kunstliche intelligenz",
  ],
  "Integrate business systems": [
    "integration",
    "integrations",
    "integrate",
    "systeme verbinden",
    "schnittstellen",
  ],
  "Make data actionable": [
    "dashboard",
    "dashboards",
    "data visualization",
    "datenvisualisierung",
    "reporting",
  ],
  "Validate a product idea": [
    "validate",
    "validation",
    "idea",
    "idee",
    "validieren",
  ],
  "Improve conversion": ["conversion", "conversion rate", "konversion"],
  "Build internal tooling": [
    "internal tools",
    "internal tooling",
    "interne tools",
    "interne werkzeuge",
  ],
  "Enable collaboration": ["collaboration", "collaborative", "kollaboration"],
  "Create an interactive experience": ["interactive", "interaktiv"],
  "Create a public website": ["website", "webseite", "landing page"],
  "Connect software and hardware": [
    "hardware",
    "iot",
    "sensor",
    "sensors",
    "sensoren",
  ],
  "Maintain and evolve a product": [
    "maintenance",
    "maintain",
    "ongoing ownership",
    "wartung",
    "betreuung",
  ],
  "Join an existing team": [
    "existing team",
    "team support",
    "bestehendes team",
    "team verstarken",
  ],
  "Developer tooling": [
    "developer tools",
    "developer tooling",
    "entwicklerwerkzeuge",
  ],
  "Logistics and maritime": [
    "logistics",
    "logistik",
    "maritime",
    "shipping logistics",
    "shipping routes",
    "schifffahrt",
  ],
  "E-commerce": [
    "ecommerce",
    "e commerce",
    "online shop",
    "onlineshop",
    "shopware",
  ],
  "Marketing and research": ["marketing", "market research", "marktforschung"],
  "Tourism and travel": ["tourism", "travel", "tourismus", "reisen"],
  "Public sector": ["government", "public sector", "verwaltung", "kommune"],
  Nonprofit: ["charity", "non profit", "gemeinnutzig"],
  Healthcare: [
    "healthcare",
    "medical",
    "hospital",
    "gesundheit",
    "gesundheitswesen",
    "medizin",
    "klinik",
  ],
  Education: ["education", "learning", "bildung", "lernen"],
  Automotive: ["automotive", "car subscription", "automobil"],
  "Embedded systems": ["embedded", "firmware", "mikrocontroller"],
  Sustainability: ["sustainability", "nachhaltigkeit"],
  "Geospatial analysis": ["geospatial", "geodaten"],
  "Design generation": [
    "design generation",
    "generate designs",
    "designs generieren",
  ],
  "Conversational assistance": [
    "chatbot",
    "chat bot",
    "conversational",
    "chat assistent",
  ],
  "Customer support": ["customer support", "kundensupport", "kundenservice"],
  "Product data management": ["product data", "produktdaten"],
  "Analytics interpretation": [
    "analytics interpretation",
    "analysen auswerten",
  ],
  Translation: [
    "translate",
    "translation",
    "translations",
    "ubersetzen",
    "ubersetzung",
  ],
  "Survey generation": [
    "survey generation",
    "create surveys",
    "umfragen erstellen",
    "umfrageerstellung",
  ],
  "Survey analysis": [
    "survey analysis",
    "analyze surveys",
    "analyse surveys",
    "umfragen auswerten",
    "umfrageauswertung",
  ],
  "Agent orchestration": [
    "agent orchestration",
    "multi agent",
    "agenten orchestrierung",
  ],
  "Browser automation": ["browser automation", "browserautomatisierung"],
  "Knowledge retrieval": [
    "rag",
    "knowledge retrieval",
    "knowledge base",
    "wissensdatenbank",
  ],
  "Agent memory": ["agent memory", "agentengedachtnis"],
  "Computer vision detection": [
    "computer vision",
    "object detection",
    "objekterkennung",
  ],
};
export const projectCaseAliases = (
  field: keyof typeof CASE_VOCABULARY,
  value: string,
) =>
  [
    value,
    (CASE_VOCABULARY[field] as Record<string, string>)[value],
    ...(aliases[value] ?? []),
  ].filter(Boolean);
const topics: Signal[] = (
  ["buyerNeeds", "domains", "aiCapabilities"] as const
).flatMap((field) =>
  Object.keys(CASE_VOCABULARY[field]).map((value) => ({ field, value })),
);
const hasPhrase = (text: string, phrase: string) =>
  ` ${text} `.includes(` ${phrase} `);

const intentNeeds: Record<string, string[]> = {
  prototype: ["Validate a product idea", "Launch a new product"],
  production: ["Launch a new product", "Maintain and evolve a product"],
  improve: [
    "Improve a complex interface",
    "Automate repetitive work",
    "Maintain and evolve a product",
  ],
  team: ["Join an existing team"],
};
const intentStages: Record<string, string[]> = {
  prototype: ["Discovery", "Prototype"],
  production: ["Production"],
  improve: ["Improvement", "Ongoing maintenance"],
  team: ["Production"],
};
const deliveredAI = (data: ProjectCase) =>
  data.aiUsage.some((value) => value !== "AI-assisted implementation");
const supports = (data: ProjectCase, signal: Signal) =>
  data[signal.field].includes(signal.value) &&
  (signal.value !== "Add AI capabilities" || deliveredAI(data));

/** Phrase matching stays local. Scores order related evidence; they are not fit probabilities. */
export function selectEnquiryEvidence(
  projects: EnquiryEvidence[],
  brief: Brief,
): EvidenceMatch[] {
  const text = normalize(`${brief.situation} ${brief.outcome}`);
  const outcome = normalize(brief.outcome);
  const negatesAI = (value: string) =>
    /\b(?:no|without|not|kein|keine|keinen|ohne)\s+(?:any\s+)?(?:ai|ki|llm|artificial intelligence|kunstliche intelligenz)\b/.test(
      value,
    );
  // Current absence is context; an explicitly desired capability takes precedence.
  const outcomeRequestsAI = topics.some(
    (topic) =>
      (topic.field === "aiCapabilities" ||
        topic.value === "Add AI capabilities") &&
      projectCaseAliases(topic.field, topic.value)
        .map(normalize)
        .some((phrase) => hasPhrase(outcome, phrase)),
  );
  const excludesAI =
    negatesAI(outcome) ||
    (!outcomeRequestsAI && negatesAI(normalize(brief.situation)));
  const signals = topics.filter(
    (topic) =>
      !(
        excludesAI &&
        (topic.field === "aiCapabilities" ||
          topic.value === "Add AI capabilities")
      ) &&
      projectCaseAliases(topic.field, topic.value)
        .map(normalize)
        .some((phrase) => hasPhrase(text, phrase)),
  );
  const needsCapability = signals.some(
    (signal) => signal.field === "aiCapabilities",
  );
  const serviceNeeds =
    brief.context.service === "ai-automation"
      ? excludesAI
        ? ["Automate repetitive work"]
        : ["Add AI capabilities", "Automate repetitive work"]
      : brief.context.service === "product-interfaces"
        ? ["Improve a complex interface"]
        : [];
  const stages = intentStages[brief.intent] ?? [];
  const needs = [
    ...new Set([...(intentNeeds[brief.intent] ?? []), ...serviceNeeds]),
  ];
  return projects
    .flatMap((project) => {
      const data = project.caseStudy;
      const selected = project.id === brief.context.projectId;
      const matches = signals.filter((signal) => supports(data, signal));
      const matchedNeeds = needs.filter((value) =>
        supports(data, { field: "buyerNeeds", value }),
      );
      const matchedStages = stages.filter((value) =>
        data.stages.includes(value),
      );
      const team =
        brief.intent === "team" && data.ownership === "Team contributor";
      const serviceMatch = serviceNeeds.some((value) =>
        matchedNeeds.includes(value),
      );
      // Specific requests must overlap a documented topic, rather than falling back to famous cases.
      const relevant = signals.length
        ? needsCapability
          ? matches.some((signal) => signal.field === "aiCapabilities")
          : matches.length > 0
        : text
          ? false
          : serviceNeeds.length
            ? serviceMatch
            : matchedNeeds.length > 0 || matchedStages.length > 0 || team;
      if (!selected && !relevant) return [];
      const score =
        matches.reduce(
          (sum, signal) =>
            sum +
            (signal.field === "aiCapabilities"
              ? 8
              : signal.field === "buyerNeeds"
                ? 6
                : 3),
          0,
        ) +
        matchedNeeds.length * 2 +
        matchedStages.length * 3 +
        (team ? 5 : 0) +
        (serviceMatch ? 4 : 0);
      const reasons = [
        ...new Set([
          ...matches.map((signal) => signal.value),
          ...(team ? [data.ownership] : []),
          ...(relevant ? matchedNeeds : []),
          ...(relevant ? matchedStages : []),
        ]),
      ].slice(0, 4);
      return [
        {
          project,
          reasons,
          selected,
          partial:
            !relevant ||
            signals.length === 0 ||
            (brief.intent === "team" && !team) ||
            matches.length < signals.length ||
            (stages.length > 0 && matchedStages.length === 0),
          score,
        },
      ];
    })
    .sort(
      (a, b) =>
        Number(b.selected) - Number(a.selected) ||
        b.score - a.score ||
        a.project.id.localeCompare(b.project.id),
    )
    .slice(0, 3)
    .map(({ project, reasons, partial, selected }) => ({
      project,
      reasons,
      partial,
      selected,
    }));
}
