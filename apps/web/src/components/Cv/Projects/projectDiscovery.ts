import type { CaseStudyBlock, CvProject } from "@homepage/content/models";
import type { Locale } from "@homepage/content/i18n";
import { hasGermanTranslation } from "@homepage/content/localizeContent";

type Explanation = { title: string; connection: string; difference: string };
type Connection = {
  ids: readonly [string, string];
  en: Explanation;
  de: Explanation;
};

// Editorial connections reviewed against the published project/case-study content.
// These describe transferable work, not algorithmic similarity or measured outcomes.
const connections: Connection[] = [
  {
    ids: [
      "15b86514-f736-803e-b9b7-e47ebc2406d1",
      "f9cc2539-c940-4864-8ff0-8424ed0d9fb9",
    ],
    en: {
      title: "From visual editing to a usable output",
      connection:
        "Both projects let people arrange visual elements on a canvas and export what they create. This connects direct manipulation, editor usability and output generation.",
      difference:
        "Playlist-Canvas exports album-art collages. Konfig connects editing to a correctly scaled print-production pipeline for motorcycle decals.",
    },
    de: {
      title: "Vom visuellen Bearbeiten zum nutzbaren Ergebnis",
      connection:
        "In beiden Projekten ordnen Menschen visuelle Elemente auf einer Zeichenfläche an und exportieren ihre Gestaltung. Direkte Manipulation, Bedienbarkeit und Ausgabe greifen ineinander.",
      difference:
        "Playlist-Canvas exportiert Collagen aus Albumcovern. Konfig verbindet den Editor mit einer maßstabsgetreuen Druckproduktion für Motorraddekore.",
    },
  },
  {
    ids: [
      "15b86514-f736-803e-b9b7-e47ebc2406d1",
      "153f6668-f4d6-490a-8345-0b999b35305a",
    ],
    en: {
      title: "Making specialist workflows usable",
      connection:
        "Both projects turn a demanding domain into an interface people can work with: design and production at Konfig, assessment and negotiation at Seabo.",
      difference:
        "At Konfig I own frontend, backend and UX/UI engineering. At Seabo I redesigned and modernised an inherited platform as a contributor within an existing team.",
    },
    de: {
      title: "Spezialisierte Abläufe verständlich machen",
      connection:
        "Beide Projekte machen eine anspruchsvolle Fachdomäne über ein bedienbares Interface zugänglich: Gestaltung und Produktion bei Konfig, Bewertung und Verhandlung bei Seabo.",
      difference:
        "Bei Konfig verantworte ich Frontend, Backend und UX/UI. Bei Seabo habe ich eine bestehende Plattform als Teil eines Entwicklungsteams überarbeitet und modernisiert.",
    },
  },
  {
    ids: [
      "f9cc2539-c940-4864-8ff0-8424ed0d9fb9",
      "e315ebfb-d36f-4b62-8f7c-f58eaacf7806",
    ],
    en: {
      title: "One integration, two ways to explore music",
      connection:
        "Both projects use Spotify playlist data as the starting point for an interactive web app. The shared experience is API integration and turning music data into something people can explore.",
      difference:
        "Playlist-Stats reveals patterns in artists and release dates. Playlist-Canvas uses album artwork as material for an editable, exportable collage.",
    },
    de: {
      title: "Eine Integration, zwei Zugänge zu Musik",
      connection:
        "Beide Projekte nutzen Spotify-Playlistdaten als Grundlage einer interaktiven Web-App. Sie verbinden API-Integration mit einer Oberfläche, über die Musikdaten erkundet werden können.",
      difference:
        "Playlist-Stats zeigt Muster bei Künstlern und Erscheinungsdaten. Playlist-Canvas macht Albumcover zum Material für bearbeitbare und exportierbare Collagen.",
    },
  },
  {
    ids: [
      "153f6668-f4d6-490a-8345-0b999b35305a",
      "d33ded3a-755e-47bc-87ff-6fd496774a18",
    ],
    en: {
      title: "Turning logistics data into decisions",
      connection:
        "Seabo and ORA both make logistics information accessible through visual interfaces, connecting operational data with the decisions it can support.",
      difference:
        "Seabo supports chartering assessment and contract negotiation. ORA focuses on container tracking and lifecycle analysis; it does not demonstrate the same end-to-end transaction workflow.",
    },
    de: {
      title: "Logistikdaten als Entscheidungsgrundlage",
      connection:
        "Seabo und ORA machen Logistikinformationen über visuelle Oberflächen zugänglich und verbinden operative Daten mit den Entscheidungen, die sie unterstützen können.",
      difference:
        "Seabo unterstützt Charterbewertungen und Vertragsverhandlungen. ORA konzentriert sich auf Containertracking und Lebenszyklusanalysen und zeigt keinen vergleichbaren durchgängigen Transaktionsablauf.",
    },
  },
  {
    ids: [
      "11d86514-f736-80ed-935c-e6fe30b59d42",
      "153487a4-4b86-48b2-998c-3675a85bfd8e",
    ],
    en: {
      title: "Supporting the next product decision",
      connection:
        "Both tools organise research and improvement work: gathering feedback, making findings usable and helping decide what to work on next.",
      difference:
        "Conversion Y centres on surveys, including AI-assisted creation and evaluation. Web Strategy Toolbox organises optimisation ideas and experiments. These are different research workflows, not equivalent evidence of business impact.",
    },
    de: {
      title: "Die nächste Produktentscheidung unterstützen",
      connection:
        "Beide Werkzeuge strukturieren Forschungs- und Verbesserungsarbeit: Feedback sammeln, Erkenntnisse nutzbar machen und nächste Schritte ableiten.",
      difference:
        "Conversion Y konzentriert sich auf Umfragen mit KI-gestützter Erstellung und Auswertung. Web Strategy Toolbox strukturiert Optimierungsideen und Experimente. Die unterschiedlichen Abläufe belegen keine gleichwertige Geschäftswirkung.",
    },
  },
];

export function relatedExperience(
  id: string,
  projects: CvProject[],
  locale: Locale,
) {
  const visible = new Map(
    projects
      .filter((p) => locale !== "de" || hasGermanTranslation(p))
      .map((p) => [p.id, p]),
  );
  if (!visible.has(id)) return [];
  return connections
    .flatMap(({ ids, ...copy }) => {
      if (!ids.includes(id)) return [];
      const project = visible.get(ids[0] === id ? ids[1] : ids[0]);
      return project ? [{ project, ...copy[locale] }] : [];
    })
    .slice(0, 3);
}

export type CaseStudyExcerpt = { title: string; text: string };
/** Keep complete source paragraphs; never remove a qualification by truncating prose. */
export function caseStudyPreview(blocks: CaseStudyBlock[]): CaseStudyExcerpt[] {
  const result: CaseStudyExcerpt[] = [];
  let title = "";
  for (const block of blocks) {
    const text = block.richText
      .map((part) => part.plain_text)
      .join("")
      .trim();
    if (block.type.startsWith("heading_")) title = text;
    else if (block.type === "paragraph" && title && text) {
      result.push({ title, text });
      title = "";
      if (result.length === 2) break;
    }
  }
  return result;
}
