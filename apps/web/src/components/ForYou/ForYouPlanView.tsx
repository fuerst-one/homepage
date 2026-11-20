import type { ForYouSection } from "@homepage/content/forYouPlan";
import type { Locale } from "@homepage/content/i18n";
import { ForYouApproach } from "./ForYouApproach";
import { ForYouBridge } from "./ForYouBridge";
import { ForYouClosing } from "./ForYouClosing";
import { ForYouFooter } from "./ForYouFooter";
import { ForYouHero } from "./ForYouHero";
import { ForYouOffer } from "./ForYouOffer";
import { ForYouProofGrid } from "./ForYouProofGrid";
import { ForYouQuestions } from "./ForYouQuestions";
import { ForYouSecondNeed } from "./ForYouSecondNeed";
import { ForYouSpotlight } from "./ForYouSpotlight";
import type { ForYouProject } from "./forYouProject";
import styles from "../Services/services.module.css";
import "./for-you.css";

/**
 * Renders the validated sections received so far; `pending` marks that more
 * are on their way, so a stream can feed this view one section at a time.
 */
export function ForYouPlanView({
  locale,
  sections,
  pending,
  projects,
  needs,
}: {
  locale: Locale;
  sections: readonly ForYouSection[];
  pending: boolean;
  projects: Record<string, ForYouProject>;
  needs: readonly string[];
}) {
  const de = locale === "de";
  return (
    <article
      lang={locale}
      className={`${styles.page} ${styles.landing} for-you-page`}
      // Profile UI: following these links credits no interest points.
      data-profile-ui
      aria-busy={pending}
    >
      {sections[0]?.type !== "hero" && (
        <h1 className="sr-only">{de ? "Für dich" : "For you"}</h1>
      )}
      {sections.map((section, index) => (
        <div
          key={`${index}-${section.type}`}
          className="for-you-section"
          data-for-you-section={section.type}
        >
          {renderSection(section, index + 1, locale, projects, needs)}
        </div>
      ))}
      {pending && (
        <div className="for-you-placeholder" role="status">
          <span className="sr-only">
            {de
              ? "Der nächste Abschnitt wird geschrieben."
              : "The next section is being written."}
          </span>
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </div>
      )}
      <ForYouFooter locale={locale} />
    </article>
  );
}

function renderSection(
  section: ForYouSection,
  number: number,
  locale: Locale,
  projects: Record<string, ForYouProject>,
  needs: readonly string[],
) {
  const shared = { number, locale };
  switch (section.type) {
    case "hero":
      return <ForYouHero section={section} locale={locale} needs={needs} />;
    case "bridge":
      return <ForYouBridge section={section} {...shared} projects={projects} />;
    case "proofGrid":
      return (
        <ForYouProofGrid section={section} {...shared} projects={projects} />
      );
    case "spotlight":
      return (
        <ForYouSpotlight
          section={section}
          {...shared}
          project={projects[section.projectId]}
        />
      );
    case "secondNeed":
      return (
        <ForYouSecondNeed section={section} {...shared} projects={projects} />
      );
    case "approach":
      return <ForYouApproach section={section} {...shared} />;
    case "offer":
      return <ForYouOffer section={section} {...shared} />;
    case "questions":
      return <ForYouQuestions section={section} {...shared} />;
    case "closing":
      return <ForYouClosing section={section} {...shared} needs={needs} />;
  }
}
