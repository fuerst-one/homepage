import type { CvProject } from "./models";
import type { Locale } from "./i18n";
import { publicProjectScale } from "./projectScale";

const KONFIG_ID = "15b86514-f736-803e-b9b7-e47ebc2406d1";
const TEST_FLOW_ID = "35686514-f736-8019-921c-e5d8d77e7f23";

/** Owner confirmed three days/week on 2026-11-18; retained publications may say four. */
export function withProjectEditorialFacts<
  T extends Pick<CvProject, "id" | "scale">,
>(project: T): T {
  if (
    project.id !== KONFIG_ID ||
    project.scale?.workingPattern === "3 days/week"
  )
    return project;
  return {
    ...project,
    scale: publicProjectScale({
      ...project.scale,
      workingPattern: "3 days/week",
    }),
  };
}

type Brief = {
  problem: string;
  contribution: string;
  delivery: string;
  result: string;
  note: string;
};

/** Curated summaries are only rendered after the caller resolves a published project. */
export function projectEditorialBrief(
  project: Pick<CvProject, "id" | "kpis">,
  locale: Locale,
): Brief | null {
  const de = locale === "de";
  if (project.id === KONFIG_ID)
    return {
      problem: de
        ? "Motorraddekore im Browser gestalten und als korrekt skaliertes Produktions-PDF ausgeben."
        : "Let riders design motorcycle decals in the browser and produce a correctly scaled production PDF.",
      contribution: de
        ? "Frontend, Backend und UX/UI sowie Kundenkommunikation und Organisation. Mein Geschäftspartner bringt Dekor- und Marketingwissen ein. Arbeitsweise: 3 Tage/Woche."
        : "Frontend, backend and UX/UI, plus client communication and organisation. My business partner contributes decal and marketing expertise. Working pattern: 3 days/week.",
      delivery: de
        ? "In einem Shop produktiv eingesetzt und aktiv weiterentwickelt."
        : "In production use in one shop and under active development.",
      result: project.kpis.rich_text
        .map((part) => part.plain_text)
        .join(" ")
        .trim(),
      note: de
        ? "Produktbezogene Ergebnisse nach eigener Angabe; keine unabhängig geprüfte Wirkungszuordnung oder Prognose für andere Projekte."
        : "Owner-reported product results; not independently verified attribution or a forecast for other projects.",
    };
  if (project.id === TEST_FLOW_ID)
    return {
      problem: de
        ? "Prüfen, ob ein Agent eine Nutzeraufgabe im Browser ohne vorgegebene Klickfolge lösen kann."
        : "Explore whether an agent can complete a browser task without a prescribed sequence of clicks.",
      contribution: de
        ? "Eigenes Projekt, allein konzipiert und entwickelt. Natürliche Sprache beschreibt die Ziele; Browser-Agenten versuchen, sie auszuführen."
        : "Personal project, designed and built solo. Natural-language goals guide browser agents attempting the task.",
      delivery: de
        ? "Ein internes Tool, das ich gelegentlich ergänzend zu anderen Testmethoden nutze."
        : "An internal tool I use occasionally alongside other testing methods.",
      result: de
        ? "Auf Konfig und weiteren Projekten eingesetzt, um unter anderem unklare Beschriftungen, fehlende Orientierung und schwierige Interaktionen sichtbar zu machen."
        : "Used on Konfig and other projects to surface issues including unclear labels, missing cues and difficult interactions.",
      note: de
        ? "Erfahrung aus eigener Nutzung; kein Nachweis für vollständige Testabdeckung oder eine gemessene Zeitersparnis."
        : "First-hand usage observations; not evidence of complete test coverage or measured time savings.",
    };
  return null;
}
