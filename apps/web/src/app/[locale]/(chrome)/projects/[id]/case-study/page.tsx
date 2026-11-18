import { personName } from "@homepage/content/i18n";
import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import Link from "../../../../../../components/i18n/LocalizedLink";
import { Layout } from "../../../../../../components/Layout";
import { CaseStudyContent } from "../../../../../../components/Cv/Projects/CaseStudyContent";
import { ProjectBrief } from "../../../../../../components/Cv/Projects/ProjectBrief";
import { ContentUpdatedAt } from "../../../../../../components/ContentUpdatedAt";
import { StructuredData } from "../../../../../../components/StructuredData";
import { getLocale } from "../../../../../../server/i18n/getLocale";
import { getProjectCaseStudy } from "../../../../../../server/content/getProjectCaseStudy";
import { getCachedCvProjects } from "../../../../../../server/content/getCachedCvProjects";
import { getPublicImageDescriptions } from "../../../../../../server/content/getPublicImageDescriptions";
import { caseStudyPageId } from "@homepage/content/projectCaseStudy";
import { hasGermanTranslation } from "@homepage/content/localizeContent";
import { locales, localizedPath } from "@homepage/content/i18n";
import { contentDate } from "@homepage/content/contentDates";
import {
  pageMetadata,
  caseStudyDescription,
  caseStudySchema,
  personSchema,
  projectSchema,
  projectPath,
  projectSlug,
  SITE_URL,
} from "../../../../../../lib/seo";
import type { Locale } from "@homepage/content/i18n";

// Keep generated observations synchronized with current published image versions.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function generateStaticParams() {
  return (await getCachedCvProjects()).flatMap((project) =>
    locales
      .filter(
        (locale) =>
          caseStudyPageId(project, locale) &&
          (locale === "en" || hasGermanTranslation(project)),
      )
      .map((locale) => ({ locale, id: projectSlug(project) })),
  );
}

type Props = { params: Promise<{ id: string; locale: string }> };
const getCase = cache(async (reference: string, locale: Locale) => {
  const result = await getProjectCaseStudy(reference, locale);
  if (!result) notFound();
  return result;
});

export async function generateMetadata({ params }: Props) {
  const locale = await getLocale(params);
  const { project, blocks, availableLocales } = await getCase(
    (await params).id,
    locale,
  );
  const metadata = pageMetadata(
    `${projectPath(project, locale)}/case-study`,
    `${project.name} — ${locale === "de" ? "Fallstudie" : "Case study"} | FUERST.ONE`,
    caseStudyDescription(project, blocks),
    { locale, availableLocales },
  );
  metadata.alternates = {
    canonical: `${SITE_URL}${projectPath(project, locale)}/case-study`,
    languages: Object.fromEntries([
      ...availableLocales.map((lang) => [
        lang,
        `${SITE_URL}${projectPath(project, lang)}/case-study`,
      ]),
      [
        "x-default",
        `${SITE_URL}${projectPath(project, availableLocales[0])}/case-study`,
      ],
    ]),
  };
  const modifiedTime = contentDate(project.caseStudyUpdatedAt?.[locale]);
  metadata.openGraph = {
    ...metadata.openGraph,
    type: "article",
    authors: [`${SITE_URL}${localizedPath("/", locale)}`],
    ...(modifiedTime && { modifiedTime }),
  };
  return metadata;
}

export default async function CaseStudyPage({ params }: Props) {
  const locale = await getLocale(params);
  const reference = (await params).id;
  const { project, blocks, availableLocales } = await getCase(
    reference,
    locale,
  );
  const path = projectPath(project, locale);
  if (reference !== projectSlug(project))
    permanentRedirect(`${path}/case-study`);
  const imageDescriptions = await getPublicImageDescriptions(
    project.id,
    locale,
  );
  return (
    <Layout locale={locale} availableLocales={availableLocales} wide>
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-neutral-400">
        <Link href="/projects" className="underline">
          {locale === "de" ? "Projekte" : "Projects"}
        </Link>
        {" / "}
        <Link href={path} className="underline">
          {project.name}
        </Link>
        {" / "}
        <span aria-current="page">
          {locale === "de" ? "Fallstudie" : "Case study"}
        </span>
      </nav>
      <article className="content-detail content-page">
        <header className="content-page-heading mb-8 border-b border-white/20 pb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
            {locale === "de" ? "Fallstudie" : "Case study"}
          </p>
          <h1 className="content-page-title">{project.name}</h1>
          <p className="text-sm text-neutral-300">
            {locale === "de" ? "Von" : "By"}{" "}
            <Link href="/" rel="author" className="underline">
              {personName(locale)}
            </Link>
          </p>
          <ContentUpdatedAt
            date={project.caseStudyUpdatedAt?.[locale]}
            locale={locale}
          />
        </header>
        <ProjectBrief project={project} locale={locale} />
        <CaseStudyContent
          blocks={blocks}
          projectName={project.name}
          projectId={project.id}
          locale={locale}
          initialDescriptions={imageDescriptions}
        />
        <footer className="mt-10 border-t border-white/20 pt-5 text-sm">
          <Link href={path} className="text-neutral-300 underline">
            {locale === "de" ? "Zurück zum Projekt" : "Back to project"}
          </Link>
        </footer>
      </article>
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@graph": [
            personSchema(undefined, locale),
            projectSchema(project),
            caseStudySchema(project, locale, blocks),
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  name: "Home",
                  item: `${SITE_URL}${localizedPath("/", locale)}`,
                },
                {
                  name: locale === "de" ? "Projekte" : "Projects",
                  item: `${SITE_URL}${localizedPath("/projects", locale)}`,
                },
                { name: project.name, item: `${SITE_URL}${path}` },
                {
                  name: locale === "de" ? "Fallstudie" : "Case study",
                  item: `${SITE_URL}${path}/case-study`,
                },
              ].map((item, index) => ({
                "@type": "ListItem",
                position: index + 1,
                ...item,
              })),
            },
          ],
        }}
      />
    </Layout>
  );
}
