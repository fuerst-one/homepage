import { getLocale } from "../../../../server/i18n/getLocale";
import { getSiteCopy } from "../../../../server/content/getSiteCopy";
import { localizedPath, type LocaleParams } from "@homepage/content/i18n";
import { Layout } from "../../../../components/Layout";
import { PageEyebrow } from "../../../../components/PageEyebrow";
import { ProjectsClientView } from "../../../../components/Cv/Projects/ProjectsClientView";
import { ProjectExplorerPreview } from "../../../../components/ExperienceAtlas/ProjectExplorerPreview";
import { ProjectAnalysisTabs } from "../../../../components/Cv/Projects/ProjectAnalysisTabs";
import { LogoMarquee } from "../../../../components/Cv/Projects/LogoMarquee";
import { getCachedCvProjects } from "../../../../server/content/getCachedCvProjects";
import { getPublicProjectCases } from "../../../../server/content/getEnquiryEvidence";
import { getCachedCvOwnerPublic } from "../../../../server/content/getCachedCvOwner";
import { Intro } from "../../../../components/Cv/Intro";
import Link from "../../../../components/i18n/LocalizedLink";
import { StructuredData } from "../../../../components/StructuredData";
import { getSiteFeatures } from "../../../../server/siteFeatures";
import {
  pageMetadata,
  personSchema,
  PERSON_ID,
  projectPath,
  SITE_URL,
} from "../../../../lib/seo";

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await getLocale(params);
  const copy = await getSiteCopy(locale);
  return pageMetadata("/projects", copy["cv.title"], copy["cv.description"], {
    locale,
  });
}

export const revalidate = 60;

export default async function ProjectsPage({ params }: LocaleParams) {
  const locale = await getLocale(params);
  const copy = await getSiteCopy(locale);
  const [sourceProjects, owner, cases] = await Promise.all([
    getCachedCvProjects(locale),
    getCachedCvOwnerPublic(locale),
    getPublicProjectCases().catch(() => []),
  ]);
  const matchingById = new Map(
    cases.map((project) => [project.id, project.caseStudy]),
  );
  const projects = sourceProjects.map((project) => ({
    ...project,
    matching: matchingById.get(project.id),
  }));

  return (
    <Layout
      locale={locale}
      wide
      sidebarPositionOnMobile="after"
      sidebarContent={
        <>
          <Intro locale={locale} text={copy["cv.sidebar"]} />
          <LogoMarquee projects={projects} />
        </>
      }
      sidebarAfter={
        <div className="space-y-6">
          <ProjectExplorerPreview projects={projects} locale={locale} />
          <ProjectAnalysisTabs projects={projects} />
        </div>
      }
    >
      <header className="content-page-heading">
        <PageEyebrow>
          {locale === "de"
            ? "Von der ersten Idee bis zum Einsatz"
            : "From first idea to real-world use"}
        </PageEyebrow>
        <h1 className="content-page-title">{copy["cv.heading"]}</h1>
        <p className="text-sm leading-relaxed text-neutral-300">
          {copy["cv.intro"]}
        </p>
      </header>
      <ProjectsClientView
        projects={projects}
        semanticEnabled={getSiteFeatures().assistantEnabled}
      />
      <section className="space-y-4 border-t border-white/20 pt-8">
        <h2 className="text-xl font-semibold text-white">
          {locale === "de" ? "Alle Projektdetails" : "All project details"}
        </h2>
        <p className="text-sm text-neutral-400">
          {locale === "de"
            ? "Das gesamte Portfolio – auch Projekte außerhalb der aktuellen Filter."
            : "Browse the full portfolio, including projects beyond the current filters."}
        </p>
        <ul className="space-y-2 text-sm text-neutral-300">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={projectPath(project, locale)}
                className="underline hover:text-white"
              >
                {project.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@graph": [
            personSchema(owner, locale),
            {
              "@type": "ProfilePage",
              "@id": `${SITE_URL}${localizedPath("/projects", locale)}#profile`,
              url: `${SITE_URL}${localizedPath("/projects", locale)}`,
              name: copy["cv.title"],
              inLanguage: locale,
              mainEntity: { "@id": PERSON_ID },
            },
            {
              "@type": "CollectionPage",
              url: `${SITE_URL}${localizedPath("/projects", locale)}`,
              name: locale === "de" ? "Projektportfolio" : "Project portfolio",
              inLanguage: locale,
              mainEntity: {
                "@type": "ItemList",
                itemListElement: projects.map((project, index) => ({
                  "@type": "ListItem",
                  position: index + 1,
                  name: project.name,
                  url: `${SITE_URL}${projectPath(project, locale)}`,
                })),
              },
            },
          ],
        }}
      />
    </Layout>
  );
}
