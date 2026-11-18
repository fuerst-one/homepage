import type { CaseStudyBlock, CvProject } from "@homepage/content/models";
import { caseStudyPageId } from "@homepage/content/projectCaseStudy";
import { hasGermanTranslation } from "@homepage/content/localizeContent";
import type { ServiceLocale, ServiceSlug } from "../../data/services";

export type ServiceVisual = {
  src: string;
  alt: string;
  caption: string;
  kind: "screenshot" | "illustration";
};

export type ServiceVisualOptions = {
  locale?: ServiceLocale;
  placement?: "service" | "offer";
  studies?: Record<string, CaseStudyBlock[]>;
};

type Selection = {
  screenshots: number[];
  offer?: number[];
  hero?: number[];
  illustration?: Record<ServiceLocale, string>;
  illustrationOnly?: boolean;
};

// Gallery numbers are one-based and refer to the published project screenshot order.
const selections: Partial<Record<ServiceSlug, Record<string, Selection>>> = {
  "product-interfaces": {
    "15b86514-f736-803e-b9b7-e47ebc2406d1": {
      screenshots: [2, 3, 4],
      offer: [2],
      hero: [1],
    },
    "153f6668-f4d6-490a-8345-0b999b35305a": {
      screenshots: [3, 4],
      offer: [3],
    },
  },
  "ai-automation": {
    "35686514-f736-8019-921c-e5d8d77e7f23": { screenshots: [3, 2], offer: [3] },
    "41786514-f736-8074-8dcb-dd79f906d12a": { screenshots: [2, 1], offer: [2] },
  },
  "ai-products": {
    "35486514-f736-803d-ae01-dc666a99d11c": {
      screenshots: [2, 1],
      hero: [2, 1],
      illustrationOnly: true,
      illustration: {
        en: "41c86514-f736-806c-97eb-f5d088bafdb0",
        de: "41c86514-f736-80e8-9cb1-dede5a7bbfbc",
      },
    },
    "15b86514-f736-803e-b9b7-e47ebc2406d1": {
      screenshots: [6],
      illustration: {
        en: "41c86514-f736-801d-bdcb-c2d2c59fb1ab",
        de: "41c86514-f736-8071-95f7-d3df9bf5f34e",
      },
    },
    "11d86514-f736-80ed-935c-e6fe30b59d42": {
      screenshots: [1],
      illustration: {
        en: "41c86514-f736-8080-bcbb-ea4231b0efeb",
        de: "41c86514-f736-8079-ae3d-c4f653aae752",
      },
    },
    "35486514-f736-8020-bde8-e0f741a1a77a": {
      screenshots: [2],
      illustration: {
        en: "41c86514-f736-809b-b358-ed6a3d241682",
        de: "41c86514-f736-8011-a5b2-ca94a432a0c9",
      },
    },
  },
};

const screenshotLabels: Record<string, Record<number, [string, string]>> = {
  "15b86514-f736-803e-b9b7-e47ebc2406d1": {
    1: ["Decal editor and product parts", "Dekor-Editor und Produktteile"],
    2: ["Colour controls in the editor", "Farbsteuerung im Editor"],
    3: ["Direct vector editing", "Direkte Vektorbearbeitung"],
    4: [
      "3D preview of the configured design",
      "3D-Vorschau des konfigurierten Designs",
    ],
    6: [
      "Editable artwork in the design workspace",
      "Bearbeitbarer Entwurf auf der Arbeitsfläche",
    ],
  },
  "153f6668-f4d6-490a-8345-0b999b35305a": {
    1: ["Market map and vessel information", "Marktkarte und Schiffsdaten"],
    3: ["Voyage calculator", "Reisekalkulation"],
    4: ["Negotiation details and terms", "Verhandlungsdetails und Konditionen"],
  },
  "35486514-f736-803d-ae01-dc666a99d11c": {
    1: [
      "Editable itinerary and route map",
      "Bearbeitbarer Reiseplan und Routenkarte",
    ],
    2: [
      "I'm Feeling Lucky: trip-generation inputs",
      "I'm Feeling Lucky: Eingaben zur Reisegenerierung",
    ],
  },
  "35686514-f736-8019-921c-e5d8d77e7f23": {
    2: [
      "Test suites and their browser flows",
      "Testsuiten und ihre Browser-Abläufe",
    ],
    3: [
      "A browser flow defined in natural language",
      "Ein Browser-Ablauf in natürlicher Sprache",
    ],
  },
  "41786514-f736-8074-8dcb-dd79f906d12a": {
    1: ["Workspace overview · demo data", "Arbeitsübersicht · Demo-Daten"],
    2: [
      "Project workspace with calendar and messages · demo data",
      "Projektbereich mit Kalender und Nachrichten · Demo-Daten",
    ],
  },
  "11d86514-f736-80ed-935c-e6fe30b59d42": {
    1: ["Survey builder and preview", "Umfrage-Editor und Vorschau"],
  },
  "35486514-f736-8020-bde8-e0f741a1a77a": {
    2: [
      "Development task, specification and agent logs",
      "Entwicklungsaufgabe, Spezifikation und Agentenprotokolle",
    ],
  },
  "b77109b3-803c-4132-a07b-44b9b9ccc5df": {
    1: [
      "Published vehicle rankings · historical interface",
      "Veröffentlichte Fahrzeugranglisten · historische Oberfläche",
    ],
  },
};

function findImage(
  blocks: CaseStudyBlock[],
  id: string,
): CaseStudyBlock | undefined {
  for (const block of blocks) {
    if (block.id === id && block.type === "image" && block.imageUrl)
      return block;
    const child = findImage(block.children ?? [], id);
    if (child) return child;
  }
}

export function selectServiceVisuals(
  project: CvProject,
  slug: ServiceSlug,
  {
    locale = "en",
    placement = "service",
    studies = {},
  }: ServiceVisualOptions = {},
) {
  const selection = selections[slug]?.[project.id];
  const screenshots = (numbers: number[]): ServiceVisual[] => {
    const present = numbers.filter(
      (number) => project.screenshots?.[number - 1],
    );
    if (!present.length) {
      const first = project.screenshots?.findIndex(Boolean) ?? -1;
      if (first >= 0) present.push(first + 1);
    }
    const seen = new Set<string>();
    return present.flatMap((number) => {
      const src = project.screenshots![number - 1];
      if (seen.has(src)) return [];
      seen.add(src);
      const label =
        screenshotLabels[project.id]?.[number]?.[locale === "de" ? 1 : 0] ??
        (locale === "de" ? "Produktansicht" : "Product view");
      return [
        {
          src,
          alt: `${project.name.trim()}: ${label}`,
          caption: label,
          kind: "screenshot" as const,
        },
      ];
    });
  };
  const visuals = screenshots(
    placement === "offer"
      ? (selection?.offer ?? [1])
      : (selection?.screenshots ?? [1]),
  );
  const pageId =
    locale === "de" && !hasGermanTranslation(project)
      ? null
      : caseStudyPageId(project, locale);
  const blockId =
    placement === "service" ? selection?.illustration?.[locale] : undefined;
  const block =
    pageId && blockId ? findImage(studies[pageId] ?? [], blockId) : undefined;
  if (block) {
    const caption = block.caption
      .map((part) => part.plain_text)
      .join("")
      .trim();
    visuals.splice(0, selection?.illustrationOnly ? visuals.length : 0, {
      src: `/api/projects/${project.id}/case-study/images/${block.id}?locale=${locale}`,
      alt:
        caption ||
        `${project.name.trim()}: ${locale === "de" ? "Konzeptillustration" : "Conceptual illustration"}`,
      caption,
      kind: "illustration",
    });
  }
  return {
    visuals,
    heroVisuals:
      placement === "service" ? screenshots(selection?.hero ?? [1]) : [],
  };
}
