import Link from "next/link";
import type { ForYouSection } from "@homepage/content/forYouPlan";
import type { Locale } from "@homepage/content/i18n";
import { caseLabel } from "@homepage/content/projectCase";
import { needProjectsPath } from "./forYouActions";
import { ForYouProjectLinks } from "./ForYouProjectLinks";
import { ForYouSectionHeader } from "./ForYouSectionHeader";
import type { ForYouProject } from "./forYouProject";
import styles from "../Services/services.module.css";

export function ForYouSecondNeed({
  section,
  number,
  locale,
  projects,
}: {
  section: Extract<ForYouSection, { type: "secondNeed" }>;
  number: number;
  locale: Locale;
  projects: Record<string, ForYouProject>;
}) {
  const de = locale === "de";
  const id = `for-you-${number}`;
  const need = caseLabel(section.need, locale);
  return (
    <section className={styles.section} aria-labelledby={id}>
      <ForYouSectionHeader
        number={number}
        id={id}
        eyebrow={de ? `Außerdem: ${need}` : `Also: ${need}`}
      >
        {section.heading}
      </ForYouSectionHeader>
      <p className="for-you-statement">{section.text}</p>
      <ForYouProjectLinks
        projects={section.projectIds.map((projectId) => projects[projectId])}
        label={de ? `Projekte zu „${need}“` : `Projects for “${need}”`}
      />
      <Link
        href={needProjectsPath(section.need, locale)}
        prefetch={false}
        className={styles.textLink}
      >
        {de ? `Alle Projekte zu „${need}“` : `All projects for “${need}”`}{" "}
        <span aria-hidden="true">↗</span>
      </Link>
    </section>
  );
}
