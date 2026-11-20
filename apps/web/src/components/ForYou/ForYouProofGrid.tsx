import Link from "next/link";
import type { ForYouSection } from "@homepage/content/forYouPlan";
import type { Locale } from "@homepage/content/i18n";
import { ForYouSectionHeader } from "./ForYouSectionHeader";
import type { ForYouProject } from "./forYouProject";
import styles from "../Services/services.module.css";

export function ForYouProofGrid({
  section,
  number,
  locale,
  projects,
}: {
  section: Extract<ForYouSection, { type: "proofGrid" }>;
  number: number;
  locale: Locale;
  projects: Record<string, ForYouProject>;
}) {
  const de = locale === "de";
  const id = `for-you-${number}`;
  return (
    <section className={styles.section} aria-labelledby={id}>
      <ForYouSectionHeader
        number={number}
        id={id}
        eyebrow={de ? "Mehr in diese Richtung" : "More in this direction"}
      >
        {section.heading}
      </ForYouSectionHeader>
      <ul className="for-you-proof-grid">
        {section.items.map(({ projectId, fit }) => {
          const project = projects[projectId];
          const image = Object.values(project.images)[0];
          return (
            <li key={projectId} className="for-you-proof">
              {image ? (
                // The existing Notion image proxy serves the published screenshots.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image.src}
                  alt=""
                  loading="lazy"
                  width={640}
                  height={400}
                  className="for-you-proof-frame"
                />
              ) : (
                // An empty frame keeps the titles of all cards on one line.
                <div className="for-you-proof-frame" aria-hidden="true" />
              )}
              <h3 lang="en">
                <Link
                  href={project.href}
                  prefetch={false}
                  data-for-you-project
                  className="for-you-card-link"
                >
                  {project.title} <span aria-hidden="true">↗</span>
                </Link>
              </h3>
              {project.subtitle && (
                <p className={styles.eyebrow} lang="en">
                  {project.subtitle}
                </p>
              )}
              <p className="for-you-fit">{fit}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
