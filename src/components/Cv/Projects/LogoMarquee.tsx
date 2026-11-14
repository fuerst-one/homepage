import { CvProject } from "@/server/notion/getCvProjects";
import { getProjectLogoSources } from "./getProjectLogoSources";
import uniqBy from "lodash/uniqBy";
import { ProjectLogo } from "./ProjectLogo";

export const LogoMarquee = ({ projects }: { projects: CvProject[] }) => {
  const logos = projects.flatMap((project) =>
    getProjectLogoSources(project).map((src) => ({
      src,
      alt: `${project.clients[0]?.name ?? project.name} logo`,
    })),
  );

  if (logos.length === 0) {
    return null;
  }

  const uniqueLogos = uniqBy(logos, "alt");
  const animationDurationSeconds = Math.max(uniqueLogos.length * 4, 24);

  return (
    <div className="relative overflow-hidden border border-white/20 bg-white/20 px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-32"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-32"
      />
      <div
        className="flex w-max items-center gap-12 py-3 motion-safe:animate-marquee"
        style={{
          animationDuration: `${animationDurationSeconds}s`,
        }}
      >
        {uniqueLogos.map((logo, index) => (
          <ProjectLogo
            key={`${logo.src}-${index}`}
            src={logo.src}
            alt={logo.alt}
            size="marquee"
          />
        ))}
      </div>
    </div>
  );
};
