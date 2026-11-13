import { getLocale } from "@/server/i18n/getLocale";
import { localizedPath, type LocaleParams } from "@/lib/i18n";
import Link from "@/components/i18n/LocalizedLink";
import { Layout } from "@/components/Layout";
import { StructuredData } from "@/components/StructuredData";
import { getCachedCvProjects } from "@/server/notion/getCachedCvProjects";
import {
  pageMetadata,
  projectDescription,
  projectPath,
  SITE_URL,
} from "@/lib/seo";

export const revalidate = 3600;
export async function generateMetadata({ params }: LocaleParams) {
  const locale = await getLocale(params);
  return pageMetadata(
    "/projects",
    locale === "de"
      ? "Projektportfolio — Alexander Fuerst | Fuerst.one"
      : "Project Portfolio — Alexander Fuerst | Fuerst.one",
    locale === "de"
      ? "Alexander Fuersts Projekte aus UX, Frontend, KI-Engineering, Datenvisualisierung, Produktkonfiguration und E-Commerce – mit Technologien und Ergebnissen."
      : "Browse Alexander Fuerst's project portfolio: UX and frontend development, AI engineering, data visualization, product configurators, and e-commerce.",
    { locale },
  );
}

export default async function ProjectsPage({ params }: LocaleParams) {
  const locale = await getLocale(params);
  const projects = await getCachedCvProjects(locale);
  return (
    <Layout locale={locale}>
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-white">
          {locale === "de" ? "Projektportfolio" : "Project portfolio"}
        </h1>
        <p className="text-sm leading-relaxed text-neutral-300">
          {locale === "de"
            ? "Entdecke meine Arbeit in UX, Frontend-Entwicklung, KI-Engineering, Datenvisualisierung und E-Commerce. Jedes Projekt zeigt Beschreibung, Technologien, Beteiligte und Ergebnisse."
            : "Explore the work behind my experience in UX, frontend development, AI engineering, data visualization, and e-commerce. Each project includes its description, technologies, collaborators, and results."}
        </p>
        <p className="text-sm text-neutral-400">
          {locale === "de"
            ? "Für eine interaktive Ansicht nach Schwerpunkten: "
            : "For an interactive view by specialty, "}
          <Link href="/cv" className="underline">
            {locale === "de"
              ? "Lebenslauf und Projektfilter entdecken"
              : "explore my CV and project filters"}
          </Link>
          .
        </p>
      </header>
      <ul className="space-y-6">
        {projects.map((project) => (
          <li
            key={project.id}
            className="space-y-3 border border-white/30 bg-black/85 p-5"
          >
            <h2 className="text-xl font-semibold text-white">
              <Link
                href={projectPath(project, locale)}
                className="underline hover:text-neutral-300"
              >
                {project.name}
              </Link>
            </h2>
            <p className="text-sm leading-relaxed text-neutral-300">
              {projectDescription(project)}
            </p>
            <p className="text-xs text-neutral-400">
              {[...new Set(project.tools)].slice(0, 6).join(" · ")}
            </p>
          </li>
        ))}
      </ul>
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          url: `${SITE_URL}${localizedPath("/projects", locale)}`,
          name:
            locale === "de"
              ? "Alexander Fuerst — Projektportfolio"
              : "Alexander Fuerst — Project portfolio",
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
        }}
      />
    </Layout>
  );
}
