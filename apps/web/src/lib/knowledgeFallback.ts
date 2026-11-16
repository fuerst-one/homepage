import type { Locale } from "@homepage/content/i18n";
import type { KnowledgeAnswer } from "@homepage/content/knowledge";

type SuggestedProject = { id: string; name: string; href: string };
/** Useful public destinations remain available without retrieval or generation. */
export function knowledgeFallback(
  locale: Locale,
  projects: SuggestedProject[] = [],
): KnowledgeAnswer {
  const de = locale === "de";
  return {
    answer: projects.length
      ? de
        ? "Diese Projekte sind ein guter Ausgangspunkt. Öffne ein Projekt für Details oder erzähle mir direkt von deiner Idee."
        : "These projects are a useful starting point. Open a project for details, or get in touch to discuss your idea."
      : de
        ? "Entdecke meine Projekte oder erzähle mir von deiner Idee. Gemeinsam finden wir einen passenden Ausgangspunkt."
        : "Explore my projects or tell me about your idea. We can find a useful starting point together.",
    sources: projects.slice(0, 3).map((project, index) => ({
      id: `p${index + 1}`,
      projectId: project.id,
      title: project.name,
      href: project.href,
    })),
    actions: [
      {
        type: "navigate",
        target: `/${locale}/projects`,
        label: de ? "Projekte entdecken" : "Explore projects",
      },
      {
        type: "navigate",
        target: `/${locale}/contact`,
        label: de ? "Kontakt aufnehmen" : "Get in touch",
      },
    ],
  };
}
