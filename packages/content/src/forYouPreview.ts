import {
  FOR_YOU_PROOF_PROJECTS,
  FOR_YOU_SECOND_NEED_PROJECTS,
  FOR_YOU_TEXT_LIMITS,
  checkForYouSection,
  type ForYouPlanContext,
  type ForYouSection,
} from "./forYouPlan";
import type { Locale } from "./i18n";
import {
  profileInterests,
  recommendProfileProjects,
  type ProfileCatalog,
  type ProfileTerm,
  type VisitorProfile,
} from "./visitorProfile";

/** Templated copy for the local preview; plain, second person, no claims about results. */
const copy = {
  en: {
    headline: (need: string) => `Your visit is mostly about “${need}”.`,
    lead: "This page is built from the interests your profile shows: projects that fit this need and that you have not opened yet, and where to look next.",
    proofHeading: "Projects you have not opened yet",
    fit: (terms: string[]) =>
      `Connects with ${quoteList(terms, "“", "”", "and")}.`,
    fitWithoutTerms: "Close to projects you explored.",
    secondHeading: (need: string) => `Your second interest: “${need}”`,
    secondText: (count: number) =>
      `Your profile ranks this need right behind the first. ${count > 1 ? "These projects fit it." : "This project fits it."}`,
    closingHeading: "Look around on your own",
    closingText:
      "The Explorer shows all published projects and how they connect, so you can follow your own path.",
  },
  de: {
    headline: (need: string) =>
      `Bei deinem Besuch geht es vor allem um „${need}“.`,
    lead: "Diese Seite entsteht aus den Interessen, die dein Profil zeigt: Projekte, die zu diesem Bedarf passen und die du noch nicht geöffnet hast, und wo du weitersuchen kannst.",
    proofHeading: "Projekte, die du noch nicht geöffnet hast",
    fit: (terms: string[]) => `Passt zu ${quoteList(terms, "„", "“", "und")}.`,
    fitWithoutTerms: "Nah an Projekten, die du dir angesehen hast.",
    secondHeading: (need: string) => `Dein zweites Interesse: „${need}“`,
    secondText: (count: number) =>
      `Dein Profil sieht diesen Bedarf gleich hinter dem ersten. ${count > 1 ? "Diese Projekte passen dazu." : "Dieses Projekt passt dazu."}`,
    closingHeading: "Schau dich selbst um",
    closingText:
      "Der Explorer zeigt alle veröffentlichten Projekte und wie sie zusammenhängen, damit du deinem eigenen Weg folgen kannst.",
  },
} as const;

/** Being shown a suggestion is the only project signal that does not mean the visitor opened it. */
export function forYouOpenedProjects(
  profile: VisitorProfile,
  catalog: ProfileCatalog,
): Set<string> {
  const ids = new Set(catalog.projects.map((project) => project.id));
  return new Set(
    profile.signals
      .filter((signal) => signal.kind !== "recommendation_shown")
      .map((signal) => signal.subject.split("|")[0])
      .filter((id) => ids.has(id)),
  );
}

/**
 * The page a ready profile gets without a model: the leading buyer need, the
 * best-ranked unopened projects, the runner-up need and the Explorer. Every
 * section passes the same check as a model's section; one that does not is left out.
 */
export function buildForYouPreview({
  profile,
  catalog,
  images,
  locale,
  termLabel,
  now,
}: {
  profile: VisitorProfile;
  catalog: ProfileCatalog;
  /** Image references per project id; projects without one stay out of the proof grid. */
  images: Readonly<Record<string, readonly string[]>>;
  locale: Locale;
  /** The site's name for a term; the project views own the translations. */
  termLabel: (term: Pick<ProfileTerm, "facet" | "value">) => string;
  now: number;
}): ForYouSection[] {
  const t = copy[locale];
  const needs = profileInterests(profile, catalog, now).filter(
    (interest) =>
      interest.facet === "buyerNeeds" &&
      interest.score > 0 &&
      interest.preference !== "exclude",
  );
  const [leading, runnerUp] = needs;
  if (!leading) return [];
  const opened = forYouOpenedProjects(profile, catalog);
  const context: ForYouPlanContext = {
    projects: catalog.projects.map((project) => ({
      id: project.id,
      opened: opened.has(project.id),
      images: images[project.id] ?? [],
    })),
    faqIds: [],
    needs: catalog.terms
      .filter((term) => term.facet === "buyerNeeds")
      .map((term) => term.value),
  };
  const ranked = recommendProfileProjects(profile, catalog, now);
  const proof = ranked
    .filter(
      ({ project }) =>
        !opened.has(project.id) && (images[project.id]?.length ?? 0) > 0,
    )
    .slice(0, FOR_YOU_PROOF_PROJECTS.max);
  const rank = (id: string) => {
    const index = ranked.findIndex(({ project }) => project.id === id);
    return index < 0 ? ranked.length : index;
  };
  const secondProjects = runnerUp
    ? catalog.projects
        .filter(
          (project) =>
            project.terms.includes(runnerUp.id) &&
            !proof.some((entry) => entry.project.id === project.id),
        )
        .sort((a, b) => rank(a.id) - rank(b.id))
        .slice(0, FOR_YOU_SECOND_NEED_PROJECTS.max)
        .map((project) => project.id)
    : [];

  const sections: ForYouSection[] = [
    {
      type: "hero",
      headline: t.headline(termLabel(leading)),
      lead: t.lead,
      action: `projects:${leading.value}`,
    },
  ];
  if (proof.length >= FOR_YOU_PROOF_PROJECTS.min)
    sections.push({
      type: "proofGrid",
      heading: t.proofHeading,
      items: proof.map(({ project, reasons }) => ({
        projectId: project.id,
        fit: fitLine(reasons.map(termLabel), t),
      })),
    });
  if (runnerUp && secondProjects.length)
    sections.push({
      type: "secondNeed",
      need: runnerUp.value,
      heading: t.secondHeading(termLabel(runnerUp)),
      text: t.secondText(secondProjects.length),
      projectIds: secondProjects,
    });
  sections.push({
    type: "closing",
    heading: t.closingHeading,
    text: t.closingText,
    action: "explorer",
  });

  const accepted: ForYouSection[] = [];
  for (const section of sections) {
    const result = checkForYouSection(section, context, accepted);
    if (result.ok) accepted.push(result.section);
  }
  return accepted;
}

/** Names as many shared terms as fit in one line. */
function fitLine(terms: string[], t: (typeof copy)[Locale]) {
  for (let count = terms.length; count > 0; count--) {
    const line = t.fit(terms.slice(0, count));
    if (line.length <= FOR_YOU_TEXT_LIMITS.fit) return line;
  }
  return t.fitWithoutTerms;
}

function quoteList(terms: string[], open: string, close: string, and: string) {
  const quoted = terms.map((term) => `${open}${term}${close}`);
  return quoted.length > 1
    ? `${quoted.slice(0, -1).join(", ")} ${and} ${quoted.at(-1)}`
    : quoted[0];
}
