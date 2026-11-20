import Link from "next/link";
import type { ForYouProject } from "./forYouProject";

export function ForYouProjectLinks({
  projects,
  label,
}: {
  projects: ForYouProject[];
  label: string;
}) {
  return (
    <ul className="for-you-project-links" aria-label={label}>
      {projects.map((project) => (
        <li key={project.id}>
          <Link href={project.href} prefetch={false} data-for-you-project>
            <span>
              <strong lang="en">{project.title}</strong>
              {project.subtitle && <small lang="en">{project.subtitle}</small>}
            </span>
            <span aria-hidden="true">↗</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
