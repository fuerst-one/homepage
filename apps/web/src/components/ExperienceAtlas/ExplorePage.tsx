import { publicProjectScale } from "@homepage/content/projectScale";
import { localizedPath, type Locale } from "@homepage/content/i18n";
import { redirect } from "next/navigation";
import { Layout } from "../Layout";
import { ExperienceAtlas } from "./ExperienceAtlas";
import { presentProject } from "./projectPresentation";
import { atlasText } from "./atlasCopy";
import type { SemanticDataset } from "./spaceTypes";
import { readWebsiteSections } from "@homepage/database/websiteContent";
import { caseStudyPageId } from "@homepage/content/projectCaseStudy";
import { caseStudyPreview } from "../Cv/Projects/projectDiscovery";
import { getLocale } from "../../server/i18n/getLocale";
import { pageMetadata } from "../../lib/seo";
import preview from "../../content/lab-preview.json";
import "./explore-site.css";

export type ExplorePageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function exploreMetadata({ params }: ExplorePageProps) {
  const locale = await getLocale(params);
  return pageMetadata(
    localizedPath("/explore", locale),
    `${atlasText(locale, "Explore")} — Alexander Fuerst | Fuerst.one`,
    atlasText(
      locale,
      "Explore the connections between my projects, skills and industries. Select a project to see the work in context.",
    ),
    { locale },
  );
}

export async function ExplorePage({
  params,
  searchParams,
  routeLocale,
}: ExplorePageProps & { routeLocale: Locale }) {
  const locale = await getLocale(params);
  if (locale !== routeLocale)
    return redirectExplore(locale, await searchParams);
  const { projects: published, studies } = await readWebsiteSections(
    ["projects", "studies"],
    undefined,
    locale,
  );
  const byId = new Map(published.map((project) => [project.id, project]));
  return (
    <Layout locale={locale} availableLocales={["en", "de"]} wide>
      <div className="explore-site">
        <ExperienceAtlas
          projects={preview.atlas.map((project) => {
            const publishedProject = byId.get(project.id);
            const result = presentProject(
              { ...project, scale: publicProjectScale(project.scale) },
              publishedProject,
              locale,
            );
            const caseId =
              publishedProject && caseStudyPageId(publishedProject, locale);
            if (result.presentation && caseId)
              result.presentation.casePreview = caseStudyPreview(
                studies[caseId] ?? [],
              );
            return result;
          })}
          semanticData={preview.semantic as SemanticDataset}
          experimentsEnabled={process.env.NODE_ENV === "development"}
        />
      </div>
    </Layout>
  );
}

/** Redirect old bookmarks without losing the selected project, lens or view. */
export function redirectExplore(
  locale: Locale,
  query: Record<string, string | string[] | undefined>,
): never {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) value.forEach((item) => search.append(key, item));
    else if (value !== undefined) search.set(key, value);
  }
  return redirect(
    `${localizedPath("/explore", locale)}${search.size ? `?${search}` : ""}`,
  );
}

export async function LegacyExplorePage({
  params,
  searchParams,
}: ExplorePageProps) {
  return redirectExplore(await getLocale(params), await searchParams);
}
