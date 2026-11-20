import Link from "next/link";
import type { ForYouSection } from "@homepage/content/forYouPlan";
import type { Locale } from "@homepage/content/i18n";
import type { ForYouProject } from "./forYouProject";
import styles from "../Services/services.module.css";

export function ForYouSpotlight({
  section,
  number,
  locale,
  project,
}: {
  section: Extract<ForYouSection, { type: "spotlight" }>;
  number: number;
  locale: Locale;
  project: ForYouProject;
}) {
  const de = locale === "de";
  const id = `for-you-${number}`;
  const image = project.images[section.image];
  const story = [
    [de ? "Die Aufgabe" : "The problem", section.problem],
    [de ? "Was entstand" : "What was built", section.built],
    [de ? "Das Ergebnis" : "The result", section.result],
  ];
  return (
    <section className={styles.section} aria-labelledby={id}>
      <p className={styles.eyebrow}>
        {String(number).padStart(2, "0")} / {de ? "Im Detail" : "In depth"}
      </p>
      <div className={`${styles.caseBody} for-you-spotlight`}>
        <div className={styles.caseCopy}>
          <h2 id={id} lang="en">
            {project.title}
          </h2>
          {project.subtitle && (
            <p className={styles.eyebrow} lang="en">
              {project.subtitle}
            </p>
          )}
          <dl className="for-you-story">
            {story.map(([term, text]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
          <Link
            href={project.href}
            prefetch={false}
            className={styles.textLink}
            data-for-you-project
          >
            {de ? "Zum Projekt" : "View the project"}:{" "}
            <span lang="en">{project.title}</span>{" "}
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
        {image && (
          <figure className={`${styles.heroVisual} for-you-figure`}>
            {/* The existing Notion image proxy serves the published screenshots. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.src}
              alt={image.alt}
              loading="lazy"
              width={1440}
              height={900}
            />
          </figure>
        )}
      </div>
    </section>
  );
}
