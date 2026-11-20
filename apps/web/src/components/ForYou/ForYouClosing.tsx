import type { ForYouSection } from "@homepage/content/forYouPlan";
import type { Locale } from "@homepage/content/i18n";
import { Button } from "../Button";
import { forYouActionLink } from "./forYouActions";
import styles from "../Services/services.module.css";

export function ForYouClosing({
  section,
  number,
  locale,
  needs,
}: {
  section: Extract<ForYouSection, { type: "closing" }>;
  number: number;
  locale: Locale;
  needs: readonly string[];
}) {
  const id = `for-you-${number}`;
  const action = forYouActionLink(section.action, locale, needs);
  return (
    <section className={styles.closing} aria-labelledby={id}>
      <p className={styles.eyebrow}>
        {String(number).padStart(2, "0")} /{" "}
        {locale === "de" ? "Dein nächster Schritt" : "Your next step"}
      </p>
      <h2 id={id}>{section.heading}</h2>
      <p>{section.text}</p>
      {action && (
        <Button
          href={action.href}
          variant="cta"
          arrow
          className={styles.closingButton}
          data-for-you-action={section.action}
        >
          {action.label}
        </Button>
      )}
    </section>
  );
}
