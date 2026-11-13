import Link from "next/link";
import { Layout } from "@/components/Layout";
import { StructuredData } from "@/components/StructuredData";
import { getCachedCvProjects } from "@/server/notion/getCachedCvProjects";
import {
  pageMetadata,
  projectDescription,
  projectPath,
  SITE_URL,
} from "@/lib/seo";

export const revalidate = false;
export const metadata = pageMetadata(
  "/projects",
  "Project Portfolio — Alexander Fuerst | Fuerst.one",
  "Browse Alexander Fuerst's project portfolio: UX and frontend development, AI engineering, data visualization, product configurators, and e-commerce.",
);

export default async function ProjectsPage() {
  const projects = await getCachedCvProjects();
  return (
    <Layout>
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-white">Project portfolio</h1>
        <p className="text-sm leading-relaxed text-neutral-300">
          Explore the work behind my experience in UX, frontend development, AI
          engineering, data visualization, and e-commerce. Each project includes
          its description, technologies, collaborators, and results.
        </p>
        <p className="text-sm text-neutral-400">
          For an interactive view by specialty,{" "}
          <Link href="/cv" className="underline">
            explore my CV and project filters
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
                href={projectPath(project)}
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
          url: `${SITE_URL}/projects`,
          name: "Alexander Fuerst — Project portfolio",
          mainEntity: {
            "@type": "ItemList",
            itemListElement: projects.map((project, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: project.name,
              url: `${SITE_URL}${projectPath(project)}`,
            })),
          },
        }}
      />
    </Layout>
  );
}
