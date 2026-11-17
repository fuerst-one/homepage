import type { Locale } from "./i18n";

/** Project-owned sectors. The client industry rollup is never a classifier. */
export const SECTORS = {
  "Automotive & mobility": { de: "Automobil & Mobilität", color: "#fbbf24" },
  "Maritime & logistics": { de: "Schifffahrt & Logistik", color: "#38bdf8" },
  "Software & business services": {
    de: "Software & Unternehmensdienste",
    color: "#a78bfa",
  },
  "Retail & consumer goods": { de: "Handel & Konsumgüter", color: "#fb923c" },
  "Manufacturing & packaging": {
    de: "Fertigung & Verpackung",
    color: "#d4b483",
  },
  "Public & nonprofit": {
    de: "Öffentlicher Sektor & Gemeinnützigkeit",
    color: "#4ade80",
  },
  Healthcare: { de: "Gesundheitswesen", color: "#f472b6" },
  Education: { de: "Bildung", color: "#c4b5fd" },
  "Travel & tourism": { de: "Reisen & Tourismus", color: "#2dd4bf" },
  "Media & entertainment": { de: "Medien & Unterhaltung", color: "#fb7185" },
  "Home & garden": { de: "Haus & Garten", color: "#a3e635" },
  "Food & lifestyle": { de: "Ernährung & Alltag", color: "#fcd34d" },
} as const;

export const PRODUCT_FORMATS = [
  "Website",
  "Web app",
  "Mobile app",
  "API",
  "Plugin / integration",
  "Chatbot",
  "Hardware / embedded",
  "Physical product",
  "Game",
  "Interactive experience",
] as const;
export const CUSTOMER_MARKETS = ["B2B", "B2C", "B2G", "B2B2C"] as const;
export const USAGE_CONTEXTS = [
  "Commercial",
  "Internal",
  "Personal",
  "Learning",
  "Experimental",
] as const;
export const DELIVERY_MODELS = ["SaaS"] as const;

export type ProjectTaxonomy = {
  productTypes?: string[];
  targetMarket?: string[];
  usageContext?: string[];
  deliveryModel?: string | null;
};

/** Shared publication allowlist for newly exposed taxonomy, without editorial source fields. */
export function publicProjectTaxonomy(value: unknown): ProjectTaxonomy {
  const source = object(value);
  const delivery = source.deliveryModel;
  return {
    productTypes: unique(rows(source.productTypes), PRODUCT_FORMATS),
    targetMarket: unique(rows(source.targetMarket), CUSTOMER_MARKETS),
    usageContext: unique(rows(source.usageContext), USAGE_CONTEXTS),
    deliveryModel:
      typeof delivery === "string" &&
      DELIVERY_MODELS.includes(delivery as (typeof DELIVERY_MODELS)[number])
        ? delivery
        : null,
  };
}

const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const rows = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const unique = (values: unknown[], vocabulary: readonly string[]) => [
  ...new Set(
    values.filter(
      (v): v is string => typeof v === "string" && vocabulary.includes(v),
    ),
  ),
];

/** Explicitly project the independent fields; never fall back to inherited client labels. */
export function readNotionProjectTaxonomy(
  page: unknown,
): ProjectTaxonomy & { industries: string[] } {
  const source = object(page),
    properties = object(source.properties);
  if (source.archived || source.in_trash || object(properties.Hidden).checkbox)
    return {
      industries: [],
      productTypes: [],
      targetMarket: [],
      usageContext: [],
      deliveryModel: null,
    };
  const multi = (name: string, vocabulary: readonly string[]) =>
    unique(
      rows(object(properties[name]).multi_select).map((v) => object(v).name),
      vocabulary,
    );
  const sector = object(object(properties.Sector).select).name;
  const delivery = object(object(properties["Delivery model"]).select).name;
  return {
    industries:
      typeof sector === "string" && Object.hasOwn(SECTORS, sector)
        ? [sector]
        : [],
    productTypes: multi("Product type", PRODUCT_FORMATS),
    targetMarket: multi("Target market", CUSTOMER_MARKETS),
    usageContext: multi("Usage context", USAGE_CONTEXTS),
    deliveryModel:
      typeof delivery === "string" &&
      DELIVERY_MODELS.includes(delivery as (typeof DELIVERY_MODELS)[number])
        ? delivery
        : null,
  };
}

export function sectorLabel(value: string, locale: Locale = "en") {
  return locale === "de" && Object.hasOwn(SECTORS, value)
    ? SECTORS[value as keyof typeof SECTORS].de
    : value;
}

export function projectSector(project: { industries?: string[] }) {
  return (
    project.industries?.find((value) => Object.hasOwn(SECTORS, value)) ?? null
  );
}

export function sectorColor(value: string | null | undefined) {
  return value && Object.hasOwn(SECTORS, value)
    ? SECTORS[value as keyof typeof SECTORS].color
    : "#a3a3a3";
}

const legacySectors: Record<string, string> = {
  automotive: "Automotive & mobility",
  "marine shipping": "Maritime & logistics",
  logistics: "Maritime & logistics",
  packaging: "Manufacturing & packaging",
  health: "Healthcare",
  healthcare: "Healthcare",
  "logistics and maritime": "Maritime & logistics",
  "tourism and travel": "Travel & tourism",
  "public sector": "Public & nonprofit",
  tourism: "Travel & tourism",
  "consumer products": "Retail & consumer goods",
  fashion: "Retail & consumer goods",
  pets: "Retail & consumer goods",
  entertainment: "Media & entertainment",
  government: "Public & nonprofit",
  defense: "Public & nonprofit",
  military: "Public & nonprofit",
  "software / it": "Software & business services",
};
const legacyUseCases: Record<string, string[]> = {
  "tourism and travel": ["Travel planning"],
  "logistics and maritime": ["Logistics operations", "Route planning"],
  education: ["Learning"],
  entertainment: [
    "Games and entertainment",
    "Music discovery",
    "Creative editing",
    "Interactive art",
  ],
  "public sector": ["Public information"],
  sustainability: ["Sustainability reporting", "EV charging planning"],
};

/** Retain useful saved links when old domain tags move into an independent field. */
export function matchesLegacyTaxonomy(
  project: ProjectTaxonomy & {
    industries?: string[];
    experiences?: string[];
    matching?: {
      domains?: string[];
      aiUsage?: string[];
      aiCapabilities?: string[];
    };
  },
  key: string,
  value: string,
) {
  const search = value.toLowerCase();
  const includes = (values: string[] | undefined, expected: string) =>
    values?.some((v) => v.toLowerCase() === expected.toLowerCase()) ?? false;
  if (key === "industries" || key === "domains") {
    const sector = legacySectors[search];
    if (sector && includes(project.industries, sector)) return true;
    if (search === "artificial intelligence")
      return Boolean(
        project.matching?.aiUsage?.length ||
        project.matching?.aiCapabilities?.length,
      );
    if (search === "consulting")
      return includes(project.experiences, "Consulting");
    if (search === "design")
      return ["UI-Design", "UX-Design", "Fashion Design"].some((v) =>
        includes(project.experiences, v),
      );
    if (search === "e-commerce" && key === "industries")
      return includes(project.matching?.domains, "E-commerce");
    if (search === "marketing")
      return includes(project.matching?.domains, "Marketing and research");
  }
  if (key === "domains") {
    if (search === "embedded systems")
      return includes(project.productTypes, "Hardware / embedded");
    if (search === "nonprofit")
      return includes(project.industries, "Public & nonprofit");
    return (legacyUseCases[search] ?? []).some((v) =>
      includes(project.matching?.domains, v),
    );
  }
  return false;
}
