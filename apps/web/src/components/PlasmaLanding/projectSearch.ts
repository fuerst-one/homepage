import {
  CASE_VOCABULARY,
  caseLabel,
  type ProjectCase,
} from "@homepage/content/projectCase";
import {
  selectEnquiryEvidence,
  projectCaseAliases,
} from "@homepage/content/enquiryEvidence";
import { sectorLabel } from "@homepage/content/projectTaxonomy";
import type { Locale } from "@homepage/content/i18n";
import type { ProjectListItem } from "../../server/api/projectListItem";
import { getKeywordIconShape, getProjectIconShape } from "./iconCatalog";

const FILTER_GROUPS = [
  { field: "productTypes", label: "Product format", shape: 0 },
  { field: "targetMarket", label: "Customer market", shape: 0 },
  { field: "usageContext", label: "Usage context", shape: 0 },
  { field: "deliveryModel", label: "Delivery model", shape: 0 },
  { field: "buyerNeeds", label: "Buyer need", shape: 2 },
  { field: "aiCapabilities", label: "AI capability", shape: 5 },
  { field: "stages", label: "Delivery stage", shape: 2 },
  { field: "domains", label: "Use case", shape: 0 },
  { field: "ownership", label: "Ownership", shape: 2 },
  { field: "maintenance", label: "Engagement status", shape: 2 },
  { field: "aiUsage", label: "AI use", shape: 5 },
  { field: "tools", label: "Tool", shape: 4 },
  { field: "capabilities", label: "Capability", shape: 2 },
  { field: "methods", label: "Method", shape: 3 },
  { field: "industries", label: "Industry", shape: 0 },
  { field: "languages", label: "Language", shape: 4 },
  { field: "projectType", label: "Project type", shape: 2 },
  { field: "workplace", label: "Workplace", shape: 2 },
  { field: "clients", label: "Client", shape: 1 },
  { field: "featured", label: "Selection", shape: 0 },
] as const;

type SearchField = (typeof FILTER_GROUPS)[number]["field"];
const GERMAN_FACETS: Partial<Record<SearchField, Record<string, string[]>>> = {
  tools: {
    "Vector Databases": ["Vektordatenbanken"],
    "Graph Databases": ["Graphdatenbanken"],
  },
  methods: {
    "User Testing": ["Nutzertests", "Benutzertests"],
    "Expert Research": ["Expertenrecherche"],
    Prototyping: ["Prototypen", "Prototyping"],
    Workshop: ["Workshop", "Workshops"],
    "Site Audit": ["Website-Analyse", "Website-Prüfung", "Website-Pruefung"],
    "A/B-Testing": ["A/B-Tests"],
    Personas: ["Personas"],
    "Jobs To Be Done": ["Jobs To Be Done"],
  },
  capabilities: {
    Conception: ["Konzeption"],
    Usability: ["Benutzerfreundlichkeit", "Gebrauchstauglichkeit"],
    Consulting: ["Beratung"],
    "Artificial Intelligence": [
      "Künstliche Intelligenz",
      "Kuenstliche Intelligenz",
      "KI",
    ],
    "Data Visualization": ["Datenvisualisierung"],
    "Conversion Rate Optimization": [
      "Conversion-Optimierung",
      "Konversionsoptimierung",
    ],
    "Behaviour Psychology": ["Verhaltenspsychologie"],
    "User Research": ["Nutzerforschung", "Benutzerforschung"],
    "Agent Harnesses": ["Agenten-Harnesses", "Agentensysteme"],
    "Data Aggregation": ["Datenaggregation"],
    "Data Analysis": ["Datenanalyse"],
    Leadership: ["Führung", "Fuehrung"],
    "Geospatial Visualization": [
      "Geodatenvisualisierung",
      "Kartenvisualisierung",
    ],
    Finance: ["Finanzen"],
    "Business Administration": ["Betriebswirtschaft"],
    Reporting: ["Berichterstattung"],
    "Web-Scraping": ["Web-Scraping", "Datenextraktion"],
    "Chat Bot Design": ["Chatbot-Design"],
    "Native Development": ["Native Entwicklung", "App-Entwicklung"],
    SEO: ["SEO", "Suchmaschinenoptimierung"],
    "Fashion Design": ["Modedesign"],
    "Frontend-Development": ["Frontend-Entwicklung", "Frontend Entwicklung"],
    "Backend-Development": ["Backend-Entwicklung", "Backend Entwicklung"],
    "Fullstack-Development": ["Fullstack-Entwicklung", "Fullstack Entwicklung"],
    "UI-Design": ["UI-Design", "Oberflächendesign"],
    "UX-Design": ["UX-Design", "Nutzererfahrung"],
    "AI Engineering": [
      "KI-Engineering",
      "KI",
      "Künstliche Intelligenz",
      "Kuenstliche Intelligenz",
    ],
  },
  industries: {
    "Consumer Products": ["Konsumgüter", "Konsumgueter"],
    Automotive: ["Automobilindustrie", "Automobil"],
    Packaging: ["Verpackung"],
    "Business Development": ["Geschäftsentwicklung", "Geschaeftsentwicklung"],
    "Software / IT": ["Software / IT"],
    Entertainment: ["Unterhaltung"],
    Consulting: ["Beratung"],
    "Marine Shipping": ["Seeschifffahrt", "Schifffahrt"],
    Logistics: ["Logistik"],
    Intelligence: ["Nachrichtendienste"],
    Defense: ["Verteidigung"],
    Military: ["Militär", "Militaer"],
    Pets: ["Haustiere"],
    Government: ["Öffentlicher Sektor", "Oeffentlicher Sektor", "Verwaltung"],
    Health: ["Gesundheit", "Gesundheitswesen"],
    Fashion: ["Mode"],
    "Artificial Intelligence": [
      "Künstliche Intelligenz",
      "Kuenstliche Intelligenz",
      "KI",
    ],
    "E-Commerce": ["E-Commerce", "Onlinehandel", "Online Handel"],
    Retail: ["Einzelhandel"],
    Healthcare: ["Gesundheitswesen"],
    Education: ["Bildung"],
    Finance: ["Finanzen"],
    Tourism: ["Tourismus"],
  },
  projectType: {
    Freelance: [
      "Freiberuflich",
      "Freiberufler",
      "Selbstständig",
      "Selbstaendig",
    ],
    Employed: ["Angestellt", "Festanstellung"],
    Hobby: ["Hobby", "Privatprojekt"],
    Student: ["Studium", "Studienprojekt"],
    "Pro Bono": ["Pro Bono", "Ehrenamtlich"],
  },
  workplace: {
    Remote: ["Remote", "Homeoffice", "Heimarbeit"],
    Hybrid: ["Hybrid"],
    "On-Premise": ["Vor Ort", "Büro", "Buero"],
  },
  featured: {
    Featured: ["Hervorgehoben", "Highlights"],
    "Not featured": ["Nicht hervorgehoben"],
  },
};
const isCaseField = (
  field: SearchField,
): field is keyof typeof CASE_VOCABULARY =>
  Object.hasOwn(CASE_VOCABULARY, field);
const facetAliases = (field: SearchField, value: string) =>
  isCaseField(field)
    ? projectCaseAliases(field, value)
    : [
        value,
        ...(field === "industries" ? [sectorLabel(value, "de")] : []),
        ...(GERMAN_FACETS[field]?.[value] ?? []),
      ];
export type SearchFilter = { field: SearchField; value: string };

/** Exact destinations take priority over a paid assistant question. */
export function resolveSearchDestination(
  index: ProjectSearchIndex,
  query: string,
  selected?: SearchFilter,
): string | null {
  const exact = normalize(query);
  if (!exact) return null;
  const project = index.projects.find((item) => normalize(item.name) === exact);
  if (project) return project.href;
  const matches = index.keywords.filter(
    (item) =>
      item.filter?.field !== "clients" && normalize(item.label) === exact,
  );
  const keyword =
    matches.find(
      (item) =>
        selected &&
        item.filter?.field === selected.field &&
        item.filter.value === selected.value,
    ) ?? matches[0];
  if (!keyword?.filter) return null;
  const { field, value } = keyword.filter;
  const filterValue =
    field === "featured" ? String(value === "Featured") : value;
  return `/projects?${new URLSearchParams({ [field]: filterValue })}`;
}
export type SearchProject = {
  id: string;
  name: string;
  href: string;
  summary: string;
  summaryLocale?: Locale;
  shape: number;
  matching?: ProjectCase;
  matchReasons?: string[];
  partial?: boolean;
  facets: Record<SearchField, string[]>;
};
export type SearchSuggestion = {
  id: string;
  kind: "keyword" | "project";
  label: string;
  category: string;
  count: number;
  shape: number;
  caption: string;
  captionLocale?: Locale;
  filter?: SearchFilter;
  href?: string;
  aliases?: string[];
};
export type ProjectSearchIndex = {
  projects: SearchProject[];
  keywords: SearchSuggestion[];
  locale: Locale;
};

const normalize = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[._/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const STOP_WORDS = new Set([
  "show",
  "me",
  "your",
  "projects",
  "project",
  "with",
  "using",
  "and",
  "in",
  "for",
  "the",
  "zeig",
  "zeige",
  "mir",
  "deine",
  "deinen",
  "dein",
  "projekte",
  "projekten",
  "projekt",
  "mit",
  "und",
  "fur",
  "bitte",
]);

const matchRank = (value: string, term: string) => {
  const normalized = normalize(value);
  const words = normalized.split(" ");
  if (normalized === term) return 0;
  if (normalized.startsWith(term)) return 1;
  if (words.some((word) => word.startsWith(term))) return 2;
  if (term.length > 1 && words.map((word) => word[0]).join("") === term)
    return 2;
  if (term.length >= 3 && normalized.includes(term)) return 3;
  return Infinity;
};

/** Uses the existing public project API; private Notion fields never enter this index. */
export const buildProjectSearchIndex = (
  items: ProjectListItem[],
  locale: Locale = "en",
): ProjectSearchIndex => {
  const projects: SearchProject[] = items.map((item) => {
    const pathname = new URL(item.webUrl, "https://fuerst.one").pathname;
    const href = /^\/(?:en\/|de\/)?projects\//.test(pathname)
      ? pathname
      : "/en/projects";
    return {
      id: item.id,
      name: item.name,
      href,
      shape: getProjectIconShape(item.icon),
      summary: item.matching?.summary || item.oneLineSummary,
      summaryLocale: item.matching?.summary ? "en" : undefined,
      matching: item.matching,
      facets: {
        buyerNeeds: item.matching?.buyerNeeds ?? [],
        stages: item.matching?.stages ?? [],
        domains: item.matching?.domains ?? [],
        aiCapabilities: item.matching?.aiCapabilities ?? [],
        aiUsage: item.matching?.aiUsage ?? [],
        ownership: item.matching?.ownership ? [item.matching.ownership] : [],
        maintenance: item.matching?.maintenance
          ? [item.matching.maintenance]
          : [],
        tools: item.tools,
        capabilities: item.capabilities,
        methods: item.methods,
        industries: item.industries,
        productTypes: item.productTypes ?? [],
        targetMarket: item.targetMarket ?? [],
        usageContext: item.usageContext ?? [],
        deliveryModel: item.deliveryModel ? [item.deliveryModel] : [],
        languages: item.languages,
        projectType: item.projectType ? [item.projectType] : [],
        workplace: item.workplace ? [item.workplace] : [],
        clients: item.clientNames,
        featured: [item.featured ? "Featured" : "Not featured"],
      },
    };
  });
  const keywords: SearchSuggestion[] = [];
  for (const group of FILTER_GROUPS) {
    const label =
      locale === "de"
        ? (
            {
              buyerNeeds: "Bedarf",
              aiCapabilities: "KI-Funktion",
              stages: "Umsetzungsstand",
              domains: "Anwendungsfall",
              productTypes: "Produktformat",
              targetMarket: "Zielmarkt",
              usageContext: "Nutzungskontext",
              deliveryModel: "Bereitstellung",
              ownership: "Verantwortung",
              maintenance: "Zusammenarbeit",
              aiUsage: "KI-Einsatz",
              tools: "Tool",
              capabilities: "Kompetenz",
              methods: "Methode",
              industries: "Branche",
              languages: "Sprache",
              projectType: "Projekttyp",
              workplace: "Arbeitsort",
              clients: "Kunde",
              featured: "Auswahl",
            } as Record<string, string>
          )[group.field]
        : group.label;
    const counts = new Map<string, number>();
    for (const project of projects) {
      for (const value of new Set(
        project.facets[group.field].filter(Boolean),
      )) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
    }
    for (const [value, count] of counts) {
      const displayValue =
        locale === "de"
          ? isCaseField(group.field)
            ? caseLabel(value, locale)
            : group.field === "industries"
              ? sectorLabel(value, locale) !== value
                ? sectorLabel(value, locale)
                : (GERMAN_FACETS.industries?.[value]?.[0] ?? value)
              : (GERMAN_FACETS[group.field]?.[value]?.[0] ?? value)
          : value;
      keywords.push({
        id: `${group.field}:${value}`,
        kind: "keyword",
        label: displayValue,
        aliases: facetAliases(group.field, value),
        category: label,
        count,
        shape: getKeywordIconShape(group.field, value, group.shape),
        caption: `${count} ${locale === "de" ? (count === 1 ? "Projekt" : "Projekte") : count === 1 ? "project" : "projects"} · ${label.toLowerCase()}: ${displayValue}`,
        filter: { field: group.field, value },
      });
    }
  }
  return { projects, keywords, locale };
};

export const searchProjectIndex = (
  index: ProjectSearchIndex,
  query: string,
  filter?: SearchFilter,
) => {
  const normalized = normalize(query);
  const terms = normalized
    .split(" ")
    .filter((term) => term && !STOP_WORDS.has(term));
  if (!terms.length)
    return {
      projects: [] as SearchProject[],
      suggestions: [] as SearchSuggestion[],
    };
  const selectedFilter =
    filter ??
    index.keywords.find(
      (keyword) =>
        keyword.filter?.field === "featured" &&
        (keyword.aliases ?? [keyword.label]).some(
          (alias) => normalize(alias) === normalized,
        ),
    )?.filter;
  // Keep explicit categorical constraints when interpreting a longer buyer-need phrase.
  const technologyConstraints = terms
    .map((term) =>
      term.length < 2
        ? []
        : index.keywords.filter(
            (keyword) =>
              (keyword.filter?.field === "tools" ||
                keyword.filter?.field === "languages" ||
                keyword.filter?.field === "clients") &&
              (keyword.aliases ?? [keyword.label]).some((alias) =>
                normalize(alias).split(" ").includes(term),
              ),
          ),
    )
    .filter((values) => values.length > 0);
  const strictFields = new Set<SearchField>([
    "aiUsage",
    "stages",
    "workplace",
    "projectType",
    "featured",
    "ownership",
    "maintenance",
  ]);
  const explicit = index.keywords.flatMap((keyword) =>
    keyword.filter && strictFields.has(keyword.filter.field)
      ? (keyword.aliases ?? [keyword.label])
          .filter((alias) =>
            ` ${normalized} `.includes(` ${normalize(alias)} `),
          )
          .map((alias) => ({
            filter: keyword.filter!,
            phrase: normalize(alias),
          }))
      : [],
  );
  // Prefer "not featured" over its contained "featured" phrase, for example.
  const constraints = explicit.filter(
    (item) =>
      !explicit.some(
        (other) =>
          other.filter.field === item.filter.field &&
          other.phrase.length > item.phrase.length &&
          other.phrase.includes(item.phrase),
      ),
  );
  const constraintFields = [
    ...new Set(constraints.map((item) => item.filter.field)),
  ];
  const obeysConstraints = (project: SearchProject) =>
    constraintFields.every((field) =>
      constraints.some(
        (item) =>
          item.filter.field === field &&
          project.facets[field].includes(item.filter.value),
      ),
    );
  const related = selectedFilter
    ? []
    : selectEnquiryEvidence(
        index.projects.flatMap((project) =>
          project.matching &&
          obeysConstraints(project) &&
          technologyConstraints.every((alternatives) =>
            alternatives.some(
              (keyword) =>
                keyword.filter &&
                project.facets[keyword.filter.field].includes(
                  keyword.filter.value,
                ),
            ),
          )
            ? [
                {
                  ...project,
                  industries: project.facets.industries,
                  productTypes: project.facets.productTypes,
                  caseStudy: project.matching,
                },
              ]
            : [],
        ),
        { intent: "explore", situation: "", outcome: query, context: {} },
      );
  const relatedById = new Map(
    related.map((match, rank) => [match.project.id, { ...match, rank }]),
  );
  const projects = index.projects
    .filter((project) => {
      if (selectedFilter)
        return project.facets[selectedFilter.field].includes(
          selectedFilter.value,
        );
      if (!obeysConstraints(project)) return false;
      const values = [
        project.name,
        project.summary,
        ...FILTER_GROUPS.flatMap(({ field }) =>
          project.facets[field].flatMap((value) => facetAliases(field, value)),
        ),
      ];
      return (
        relatedById.has(project.id) ||
        terms.every((term) =>
          values.some((value) => Number.isFinite(matchRank(value, term))),
        )
      );
    })
    .sort((a, b) => {
      const nameRank = (project: SearchProject) =>
        terms.reduce((rank, term) => rank + matchRank(project.name, term), 0);
      const aRank = nameRank(a);
      const bRank = nameRank(b);
      return aRank === bRank
        ? (relatedById.get(a.id)?.rank ?? Infinity) -
            (relatedById.get(b.id)?.rank ?? Infinity) || 0
        : aRank - bRank;
    })
    .map((project) => ({
      ...project,
      matchReasons: relatedById.get(project.id)?.reasons ?? [],
      partial: relatedById.get(project.id)?.partial,
    }));
  const keywords = index.keywords
    .filter((keyword) => keyword.filter?.field !== "clients")
    .map((keyword) => ({
      keyword,
      rank: terms.reduce(
        (rank, term) =>
          rank +
          Math.min(
            ...(keyword.aliases ?? [keyword.label]).map((alias) =>
              matchRank(alias, term),
            ),
          ),
        0,
      ),
    }))
    .filter((item) => Number.isFinite(item.rank))
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        b.keyword.count - a.keyword.count ||
        a.keyword.label.localeCompare(b.keyword.label),
    )
    .slice(0, 12)
    .map((item) => item.keyword);
  // Clients remain search constraints, but the suggested destinations are their projects.
  const matchesClient = index.keywords.some(
    (keyword) =>
      keyword.filter?.field === "clients" &&
      terms.some((term) => Number.isFinite(matchRank(keyword.label, term))),
  );
  const projectSuggestions: SearchSuggestion[] = (
    matchesClient ? projects : projects.slice(0, 6)
  ).map((project) => ({
    id: `project:${project.id}`,
    kind: "project",
    label: project.name,
    category: index.locale === "de" ? "Projekt" : "Project",
    count: 1,
    shape: project.shape,
    caption: project.summary || project.name,
    captionLocale: project.summaryLocale,
    href: project.href,
  }));
  return { projects, suggestions: [...keywords, ...projectSuggestions] };
};
