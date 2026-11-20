import type { ForYouSection } from "@homepage/content/forYouPlan";
import type { Locale } from "@homepage/content/i18n";
import { ForYouProjectLinks } from "./ForYouProjectLinks";
import { ForYouSectionHeader } from "./ForYouSectionHeader";
import type { ForYouProject } from "./forYouProject";
import styles from "../Services/services.module.css";

export function ForYouBridge({
  section,
  number,
  locale,
  projects,
}: {
  section: Extract<ForYouSection, { type: "bridge" }>;
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
        eyebrow={de ? "Was du dir angesehen hast" : "What you looked at"}
      >
        {section.heading}
      </ForYouSectionHeader>
      <p className="for-you-statement">{section.text}</p>
      <ForYouProjectLinks
        projects={section.projectIds.map((projectId) => projects[projectId])}
        label={de ? "Angesehene Projekte" : "Projects you viewed"}
      />
    </section>
  );
}
