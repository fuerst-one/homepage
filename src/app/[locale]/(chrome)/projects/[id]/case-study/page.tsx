import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import Link from "@/components/i18n/LocalizedLink";
import { Layout } from "@/components/Layout";
import { CaseStudyContent } from "@/components/Cv/Projects/CaseStudyContent";
import { getLocale } from "@/server/i18n/getLocale";
import { getProjectCaseStudy } from "@/server/notion/getProjectCaseStudy";
import { getCachedCvProjects } from "@/server/notion/getCachedCvProjects";
import { caseStudyPageId } from "@/lib/projectCaseStudy";
import { hasGermanTranslation } from "@/lib/localizeContent";
import { locales } from "@/lib/i18n";
import {
  pageMetadata,
  projectDescription,
  projectPath,
  projectSlug,
  SITE_URL,
} from "@/lib/seo";
import type { Locale } from "@/lib/i18n";

export const revalidate = 3600;
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
  const { project, availableLocales } = await getCase(
    (await params).id,
    locale,
  );
  const metadata = pageMetadata(
    `${projectPath(project, locale)}/case-study`,
    `${project.name} — ${locale === "de" ? "Fallstudie" : "Case study"} | Fuerst.one`,
    projectDescription(project),
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
  return metadata;
}

export default async function CaseStudyPage({ params }: Props) {
  const locale = await getLocale(params);
  const reference = (await params).id;
  const { project, blocks, availableLocales, projectLinks } = await getCase(
    reference,
    locale,
  );
  const path = projectPath(project, locale);
  if (reference !== projectSlug(project))
    permanentRedirect(`${path}/case-study`);
  return (
    <Layout locale={locale} availableLocales={availableLocales}>
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
      <article className="mx-auto w-full max-w-3xl border border-white/30 bg-black/85 p-5 sm:p-8">
        <header className="mb-8 space-y-3 border-b border-white/20 pb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
            {locale === "de" ? "Fallstudie" : "Case study"}
          </p>
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">
            {project.name}
          </h1>
        </header>
        <CaseStudyContent
          blocks={blocks}
          projectId={project.id}
          projectName={project.name}
          locale={locale}
          projectLinks={projectLinks}
        />
        <footer className="mt-10 border-t border-white/20 pt-5 text-sm">
          <Link href={path} className="text-neutral-300 underline">
            {locale === "de" ? "Zurück zum Projekt" : "Back to project"}
          </Link>
        </footer>
      </article>
    </Layout>
  );
}
