import type { ForYouSection } from "@homepage/content/forYouPlan";
import type { Locale } from "@homepage/content/i18n";
import { ForYouSectionHeader } from "./ForYouSectionHeader";
import styles from "../Services/services.module.css";

export function ForYouApproach({
  section,
  number,
  locale,
}: {
  section: Extract<ForYouSection, { type: "approach" }>;
  number: number;
  locale: Locale;
}) {
  const id = `for-you-${number}`;
  return (
    <section className={styles.section} aria-labelledby={id}>
      <ForYouSectionHeader
        number={number}
        id={id}
        eyebrow={
          locale === "de" ? "So würden wir starten" : "How we would start"
        }
      >
        {section.heading}
      </ForYouSectionHeader>
      <ol className={styles.process}>
        {section.steps.map((step, index) => (
          <li key={step.title}>
            <span aria-hidden="true">0{index + 1}</span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
