import { enquiryPath } from "@homepage/content/enquiry";
import { getLocale } from "../../../../../server/i18n/getLocale";
import { hasGermanTranslation } from "@homepage/content/localizeContent";
import { locales, localizedPath, type Locale } from "@homepage/content/i18n";
import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import Link from "../../../../../components/i18n/LocalizedLink";
import { Layout } from "../../../../../components/Layout";
import { ProjectDetails } from "../../../../../components/Cv/Projects/ProjectDetails";
import { StructuredData } from "../../../../../components/StructuredData";
import { getCachedCvProjects } from "../../../../../server/content/getCachedCvProjects";
import {
  pageMetadata,
  personSchema,
  projectDescription,
  projectPath,
  projectSlug,
  projectSchema,
  SITE_URL,
} from "../../../../../lib/seo";

export const revalidate = 60;

const getProject = cache(async (reference: string, locale: Locale) => {
  const projects = await getCachedCvProjects(locale);
  const project = projects.find(
    (item) =>
      item.id === reference ||
      projectSlug(item) === reference ||
      reference.endsWith(`-${item.id}`),
  );
  if (!project || (locale === "de" && !hasGermanTranslation(project)))
    notFound();
  return project;
});

export async function generateStaticParams() {
  return (await getCachedCvProjects()).flatMap((project) =>
    locales
      .filter((locale) => locale === "en" || hasGermanTranslation(project))
      .map((locale) => ({ locale, id: projectSlug(project) })),
  );
}

type Props = { params: Promise<{ id: string; locale: string }> };

export async function generateMetadata({ params }: Props) {
  const locale = await getLocale(params);
  const project = await getProject((await params).id, locale);
  return pageMetadata(
    projectPath(project, locale),
    `${project.name} — Alexander Fuerst | Fuerst.one`,
    projectDescription(project),
    {
      locale,
      availableLocales: hasGermanTranslation(project) ? ["en", "de"] : ["en"],
    },
  );
}

export default async function ProjectPage({ params }: Props) {
  const locale = await getLocale(params);
  const reference = (await params).id;
  const project = await getProject(reference, locale);
  if (reference !== projectSlug(project))
    permanentRedirect(projectPath(project, locale));
  return (
    <Layout
      locale={locale}
      availableLocales={hasGermanTranslation(project) ? ["en", "de"] : ["en"]}
    >
      <nav aria-label="Breadcrumb" className="text-sm text-neutral-400">
        <Link href="/" className="underline">
          Home
        </Link>{" "}
        /{" "}
        <Link href="/projects" className="underline">
          {locale === "de" ? "Projekte" : "Projects"}
        </Link>{" "}
        / <span aria-current="page">{project.name}</span>
      </nav>
      <article>
        <ProjectDetails project={project} locale={locale} />
      </article>
      <p className="text-sm text-neutral-300">
        {locale === "de"
          ? "Interesse an einer ähnlichen Zusammenarbeit? "
          : "Interested in similar work? "}
        <Link
          href={enquiryPath(
            { source: "project", projectId: project.id },
            locale,
          )}
          className="underline"
        >
          {locale === "de"
            ? "Alexander Fuerst kontaktieren"
            : "Contact Alexander Fuerst"}
        </Link>{" "}
        {locale === "de"
          ? "für dein Projekt oder dein Team."
          : "to discuss your project or team opportunity."}
      </p>
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@graph": [
            personSchema(undefined, locale),
            projectSchema(project),
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Home",
                  item: `${SITE_URL}${localizedPath("/", locale)}`,
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: locale === "de" ? "Projekte" : "Projects",
                  item: `${SITE_URL}${localizedPath("/projects", locale)}`,
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: project.name,
                  item: `${SITE_URL}${projectPath(project, locale)}`,
                },
              ],
            },
          ],
        }}
      />
    </Layout>
  );
}
