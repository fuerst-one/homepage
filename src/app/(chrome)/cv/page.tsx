import { Layout } from "@/components/Layout";
import { ProjectsClientView } from "@/components/Cv/Projects/ProjectsClientView";
import { LogoMarquee } from "@/components/Cv/Projects/LogoMarquee";
import { getCachedCvProjects } from "@/server/notion/getCachedCvProjects";
import { getCachedCvOwnerPublic } from "@/server/notion/getCachedCvOwner";
import { Intro } from "@/components/Cv/Intro";
import { OwnerFacts } from "@/components/Cv/OwnerFacts";
import Link from "next/link";
import { StructuredData } from "@/components/StructuredData";
import {
  pageMetadata,
  personSchema,
  PERSON_ID,
  projectPath,
  SITE_URL,
} from "@/lib/seo";

export const metadata = pageMetadata(
  "/cv",
  "Projects & Experience — Alexander Fuerst | Fuerst.one",
  "Explore Alexander Fuerst's UX, frontend, AI engineering, data visualization, and e-commerce projects, with technologies, collaborators, and results.",
);

export const revalidate = false;

export default async function Cv() {
  const [projects, owner] = await Promise.all([
    getCachedCvProjects(),
    getCachedCvOwnerPublic(),
  ]);

  return (
    <Layout
      sidebarContent={
        <>
          <Intro />
          <LogoMarquee projects={projects} />
          <OwnerFacts owner={owner} />
        </>
      }
    >
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-white">
          Projects &amp; experience
        </h1>
        <p className="text-sm leading-relaxed text-neutral-300">
          UX design, frontend development, AI engineering, data visualization,
          and e-commerce — selected work by Alexander Fuerst.
        </p>
      </header>
      <ProjectsClientView projects={projects} />
      <section className="space-y-4 border-t border-white/20 pt-8">
        <h2 className="text-xl font-semibold text-white">
          All project details
        </h2>
        <p className="text-sm text-neutral-400">
          Browse the full portfolio, including projects beyond the current
          filters.
        </p>
        <ul className="space-y-2 text-sm text-neutral-300">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={projectPath(project)}
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
            personSchema(owner),
            {
              "@type": "ProfilePage",
              "@id": `${SITE_URL}/cv#profile`,
              url: `${SITE_URL}/cv`,
              name: "Alexander Fuerst — Projects & Experience",
              mainEntity: { "@id": PERSON_ID },
            },
          ],
        }}
      />
    </Layout>
  );
}
