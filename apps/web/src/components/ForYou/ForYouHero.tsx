import type { ForYouSection } from "@homepage/content/forYouPlan";
import { personName, type Locale } from "@homepage/content/i18n";
import { Button } from "../Button";
import { forYouActionLink } from "./forYouActions";
import styles from "../Services/services.module.css";

export function ForYouHero({
  section,
  locale,
  needs,
}: {
  section: Extract<ForYouSection, { type: "hero" }>;
  locale: Locale;
  needs: readonly string[];
}) {
  const de = locale === "de";
  const action = forYouActionLink(section.action, locale, needs);
  return (
    <header className={`${styles.landingHero} for-you-hero`}>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>01 / {de ? "Für dich" : "For you"}</p>
        <h1>{section.headline}</h1>
        <p className={styles.intro}>{section.lead}</p>
        {action && (
          <div className={styles.actions}>
            <Button
              href={action.href}
              variant="cta"
              arrow
              className={styles.primary}
              data-for-you-action={section.action}
            >
              {action.label}
            </Button>
          </div>
        )}
        <p className={styles.signature}>
          {de
            ? `Mit ${personName(locale)} · Würzburg, Deutschland`
            : `With ${personName(locale)} · Würzburg, Germany`}
        </p>
      </div>
    </header>
  );
}
