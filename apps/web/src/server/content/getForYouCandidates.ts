import "server-only";
import {
  forYouImageRef,
  type ForYouPlanContext,
  type ForYouSection,
} from "@homepage/content/forYouPlan";
import type { Locale } from "@homepage/content/i18n";
import type { CvProject } from "@homepage/content/models";
import { readWebsiteSections } from "@homepage/database/websiteContent";
import { projectHeading } from "../../components/Cv/Projects/projectHeading";
import type { ForYouProject } from "../../components/ForYou/forYouProject";
import { serviceFaqs } from "../../data/serviceFaqs";
import { projectPath } from "../../lib/seo";
import { getPublicImageDescriptions } from "./getPublicImageDescriptions";

/** The lists a plan may pick from, built from the reviewed public publication. */
export async function getForYouCandidates(
  locale: Locale,
  openedProjectIds: readonly string[],
) {
  const { projects, cases } = await readWebsiteSections(
    ["projects", "cases"],
    undefined,
    locale,
  );
  const context: ForYouPlanContext = {
    projects: projects.map((project) => ({
      id: project.id,
      opened: openedProjectIds.includes(project.id),
      images: (project.screenshots ?? []).flatMap((src, index) =>
        src ? [forYouImageRef(project.id, index + 1)] : [],
      ),
    })),
    faqIds: serviceFaqs(locale).map((faq) => faq.id),
    needs: [...new Set(cases.flatMap((entry) => entry.caseStudy.buyerNeeds))],
  };
  return { context, projects };
}

/** The published facts of the projects a validated plan shows. */
export async function getForYouProjects(
  sections: readonly ForYouSection[],
  projects: readonly CvProject[],
  locale: Locale,
): Promise<Record<string, ForYouProject>> {
  const ids = new Set(sections.flatMap(sectionProjectIds));
  return forYouProjects(
    projects.filter((project) => ids.has(project.id)),
    locale,
    "all",
  );
}

/**
 * Card data for every published project, for the preview built in the
 * browser: the catalog it ranks with carries no images, and stays that way.
 */
export async function getForYouCards(locale: Locale) {
  const { projects } = await readWebsiteSections(
    ["projects"],
    undefined,
    locale,
  );
  return forYouProjects(projects, locale, "first");
}

async function forYouProjects(
  projects: readonly CvProject[],
  locale: Locale,
  screenshots: "all" | "first",
): Promise<Record<string, ForYouProject>> {
  const entries = await Promise.all(
    projects.map(async (project) => {
      const published = (project.screenshots ?? []).flatMap((src, index) =>
        src ? [{ src, number: index + 1 }] : [],
      );
      const kept = screenshots === "first" ? published.slice(0, 1) : published;
      // Preview cards show their screenshot decoratively, so the page avoids
      // one description query per published project on every request.
      const descriptions =
        screenshots === "all" && kept.length
          ? await getPublicImageDescriptions(project.id, locale)
          : [];
      const { title, subtitle } = projectHeading(project.name);
      const images = Object.fromEntries(
        kept.map(({ src, number }) => {
          const described = descriptions.find((row) => row.href === src);
          const alt =
            described?.altText ||
            `${title}: ${locale === "de" ? "Produktansicht" : "Product view"} ${number}`;
          return [forYouImageRef(project.id, number), { src, alt }];
        }),
      );
      return [
        project.id,
        {
          id: project.id,
          title,
          subtitle,
          href: projectPath(project, locale),
          images,
        },
      ] as const;
    }),
  );
  return Object.fromEntries(entries);
}

function sectionProjectIds(section: ForYouSection): string[] {
  switch (section.type) {
    case "bridge":
    case "secondNeed":
      return section.projectIds;
    case "proofGrid":
      return section.items.map((item) => item.projectId);
    case "spotlight":
      return [section.projectId];
    default:
      return [];
  }
}
