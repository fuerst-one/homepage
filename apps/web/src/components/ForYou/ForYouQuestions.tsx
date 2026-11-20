import type { ForYouSection } from "@homepage/content/forYouPlan";
import type { Locale } from "@homepage/content/i18n";
import { serviceFaq } from "../../data/serviceFaqs";
import { ForYouSectionHeader } from "./ForYouSectionHeader";
import styles from "../Services/services.module.css";

export function ForYouQuestions({
  section,
  number,
  locale,
}: {
  section: Extract<ForYouSection, { type: "questions" }>;
  number: number;
  locale: Locale;
}) {
  const de = locale === "de";
  const id = `for-you-${number}`;
  return (
    <section className={styles.section} aria-labelledby={id}>
      <ForYouSectionHeader
        number={number}
        id={id}
        eyebrow={de ? "Praktische Fragen" : "Practical questions"}
      >
        {de ? "Bevor wir sprechen" : "Before we talk"}
      </ForYouSectionHeader>
      <div className={`${styles.faq} for-you-faq`}>
        {section.faqIds.flatMap((faqId) => {
          const faq = serviceFaq(locale, faqId);
          return faq
            ? [
                <details key={faqId} data-for-you-faq={faqId}>
                  <summary>
                    {faq.question}
                    <span aria-hidden="true">+</span>
                  </summary>
                  <p>{faq.answer}</p>
                </details>,
              ]
            : [];
        })}
      </div>
    </section>
  );
}
