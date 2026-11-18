import type { Locale } from "@homepage/content/i18n";
import type { CvProject } from "@homepage/content/models";
import { hasGermanTranslation } from "@homepage/content/localizeContent";
import { flattenRichText } from "../../app/cv.pdf/flattenRichText";
import { projectPath } from "../../lib/seo";
import type { AtlasProject } from "./model";

/** Localized prose and destinations stay separate from canonical model inputs. */
export function presentProject(
  project: AtlasProject,
  published: CvProject | undefined,
  locale: Locale,
): AtlasProject {
  const contentLocale = published?.contentLocale ?? "en";
  const linkLocale =
    locale === "de" && published && hasGermanTranslation(published)
      ? "de"
      : "en";
  const caseLocale =
    locale === "de" && published?.caseStudyIds?.de ? "de" : "en";
  return {
    ...project,
    presentation: {
      description:
        (published && flattenRichText(published.description)) ||
        project.subtitle ||
        project.summary,
      locale: contentLocale,
      projectHref: published ? projectPath(published, linkLocale) : null,
      caseHref: published?.caseStudyIds?.[caseLocale]
        ? `${projectPath(published, caseLocale)}/case-study`
        : project.caseHref,
      caseLocale,
    },
  };
}
