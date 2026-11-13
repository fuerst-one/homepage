import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import { Layout } from "@/components/Layout";
import { ProjectDetails } from "@/components/Cv/Projects/ProjectDetails";
import { StructuredData } from "@/components/StructuredData";
import { getCachedCvProjects } from "@/server/notion/getCachedCvProjects";
import {
  pageMetadata,
  personSchema,
  projectDescription,
  projectPath,
  projectSlug,
  projectSchema,
  SITE_URL,
} from "@/lib/seo";

export const revalidate = false;

const getProject = cache(async (reference: string) => {
  const projects = await getCachedCvProjects();
  const project = projects.find(
    (item) =>
      item.id === reference ||
      projectSlug(item) === reference ||
      reference.endsWith(`-${item.id}`),
  );
  if (!project) notFound();
  return project;
});

export async function generateStaticParams() {
  return (await getCachedCvProjects()).map((project) => ({
    id: projectSlug(project),
  }));
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const project = await getProject((await params).id);
  return pageMetadata(
    projectPath(project),
    `${project.name} — Alexander Fuerst | Fuerst.one`,
    projectDescription(project),
  );
}

export default async function ProjectPage({ params }: Props) {
  const reference = (await params).id;
  const project = await getProject(reference);
  if (reference !== projectSlug(project))
    permanentRedirect(projectPath(project));
  return (
    <Layout>
      <nav aria-label="Breadcrumb" className="text-sm text-neutral-400">
        <Link href="/" className="underline">
          Home
        </Link>{" "}
        /{" "}
        <Link href="/projects" className="underline">
          Projects
        </Link>{" "}
        / <span aria-current="page">{project.name}</span>
      </nav>
      <article>
        <ProjectDetails project={project} />
      </article>
      <p className="text-sm text-neutral-300">
        Interested in similar work?{" "}
        <Link href="/contact" className="underline">
          Contact Alexander Fuerst
        </Link>{" "}
        to discuss your project or team opportunity.
      </p>
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@graph": [
            personSchema(),
            projectSchema(project),
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Home",
                  item: `${SITE_URL}/`,
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Projects",
                  item: `${SITE_URL}/projects`,
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: project.name,
                  item: `${SITE_URL}${projectPath(project)}`,
                },
              ],
            },
          ],
        }}
      />
    </Layout>
  );
}
