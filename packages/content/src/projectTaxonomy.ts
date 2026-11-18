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
  "Developer tool",
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
// Distribution is independent of customer market and product format.
export const DELIVERY_MODELS = [
  "Hosted access",
  "Self-hosted",
  "Local installation",
  "Package / source distribution",
  "Embedded integration",
  "Physical build",
  "Professional service",
  "Design handoff",
] as const;
// Read old publications during rollout; these cannot be reclassified without project context.
export const LEGACY_DELIVERY_MODELS = [
  "SaaS",
  "Open Source",
  "Free Service",
  "Physical Product",
  "Consultation",
] as const;
const readableDeliveryModels = [...DELIVERY_MODELS, ...LEGACY_DELIVERY_MODELS];

/** An explicit array, including an empty one, takes precedence over a cached scalar. */
export function projectDeliveryModels(value: ProjectTaxonomy): string[] {
  return unique(
    Array.isArray(value.deliveryModels)
      ? value.deliveryModels
      : [value.deliveryModel],
    readableDeliveryModels,
  );
}

export function deliveryLabel(value: string, locale: Locale = "en") {
  const labels: Record<string, string> = {
    "Hosted access": "Gehosteter Zugang",
    "Self-hosted": "Selbst gehostet",
    "Local installation": "Lokale Installation",
    "Package / source distribution": "Paket- / Quellcode-Verteilung",
    "Embedded integration": "Eingebettete Integration",
    "Physical build": "Physischer Aufbau",
    "Professional service": "Fachliche Dienstleistung",
    "Design handoff": "Design-Übergabe",
  };
  return locale === "de" ? (labels[value] ?? value) : value;
}

export type ProjectTaxonomy = {
  productTypes?: string[];
  targetMarket?: string[];
  usageContext?: string[];
  deliveryModel?: string | null;
  deliveryModels?: string[];
};

/** Shared publication allowlist for newly exposed taxonomy, without editorial source fields. */
export function publicProjectTaxonomy(value: unknown): ProjectTaxonomy {
  const source = object(value);
  const deliveryModels = projectDeliveryModels(source as ProjectTaxonomy);
  return {
    productTypes: unique(rows(source.productTypes), PRODUCT_FORMATS),
    targetMarket: unique(rows(source.targetMarket), CUSTOMER_MARKETS),
    usageContext: unique(rows(source.usageContext), USAGE_CONTEXTS),
    deliveryModels,
    deliveryModel: deliveryModels[0] ?? null,
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
      deliveryModels: [],
    };
  const multi = (name: string, vocabulary: readonly string[]) =>
    unique(
      rows(object(properties[name]).multi_select).map((v) => object(v).name),
      vocabulary,
    );
  const sector = object(object(properties.Sector).select).name;
  const renamed = Object.hasOwn(properties, "Delivery & operation");
  const delivery = object(
    properties[renamed ? "Delivery & operation" : "Delivery model"],
  );
  const deliveryModels = unique(
    Array.isArray(delivery.multi_select)
      ? rows(delivery.multi_select).map((v) => object(v).name)
      : [object(delivery.select).name],
    renamed ? DELIVERY_MODELS : readableDeliveryModels,
  );
  return {
    industries:
      typeof sector === "string" && Object.hasOwn(SECTORS, sector)
        ? [sector]
        : [],
    productTypes: multi("Product type", PRODUCT_FORMATS),
    targetMarket: multi("Target market", CUSTOMER_MARKETS),
    usageContext: multi("Usage context", USAGE_CONTEXTS),
    deliveryModels,
    deliveryModel: deliveryModels[0] ?? null,
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
    capabilities?: string[];
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
      return includes(project.capabilities, "Consulting");
    if (search === "design")
      return ["UI-Design", "UX-Design", "Fashion Design"].some((v) =>
        includes(project.capabilities, v),
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
