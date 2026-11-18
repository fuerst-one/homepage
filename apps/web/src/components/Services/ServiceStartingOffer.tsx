import Link from "next/link";
import {
  serviceProducts,
  serviceProductPath,
  isServiceProductSlug,
} from "../../data/serviceProducts";
import type { ServiceSlug, ServiceLocale } from "../../data/services";
import {
  serviceCollaborationPath,
  serviceCollaborations,
} from "../../data/serviceCollaborations";
import styles from "./services.module.css";

export function ServiceStartingOffer({
  slug,
  locale,
}: {
  slug: ServiceSlug;
  locale: ServiceLocale;
}) {
  const copy = isServiceProductSlug(slug)
    ? serviceProducts[slug].copy[locale]
    : null;
  const de = locale === "de";
  return (
    <section
      className={styles.startingOffer}
      aria-labelledby="starting-offer-heading"
    >
      <p className={styles.eyebrow}>
        {de ? "Der passende Einstieg" : "The right starting point"}
      </p>
      <h2 id="starting-offer-heading">
        {de ? "Wie möchtest du starten?" : "How would you like to start?"}
      </h2>
      <div className={styles.engagementGrid}>
        {copy && isServiceProductSlug(slug) && (
          <article className={styles.engagementOption}>
            <p className={styles.eyebrow}>
              {de ? "Ein klar begrenzter Auftrag" : "A focused engagement"}
            </p>
            <h3>{copy.label}</h3>
            <p>{copy.teaser}</p>
            <Link
              href={serviceProductPath(slug, locale)}
              className={styles.textLink}
            >
              {de
                ? "Umfang & Ergebnisse ansehen"
                : "See the scope & deliverables"}{" "}
              ↗
            </Link>
            <p className={styles.micro}>
              {de
                ? "Eigenständig beauftragbar. Umfang und Honorar vor dem Start vereinbart."
                : "Useful on its own. Scope and fee agreed before work begins."}
            </p>
          </article>
        )}
        <article className={styles.engagementOption}>
          <p className={styles.eyebrow}>
            {de
              ? "Projekt oder Mitarbeit im Team"
              : "Project delivery or team involvement"}
          </p>
          <h3>{de ? "Gemeinsam umsetzen" : "Build with me"}</h3>
          <p>{serviceCollaborations[slug][locale].teaser}</p>
          <Link
            href={serviceCollaborationPath(slug, locale)}
            className={styles.textLink}
          >
            {de
              ? "Projekt & Zusammenarbeit ansehen"
              : "Explore projects & collaboration"}{" "}
            ↗
          </Link>
          {copy && (
            <p className={styles.micro}>
              {de
                ? "Direkter Einstieg möglich. Das Review oder Assessment ist optional."
                : "Start directly when you are ready. A review or assessment is optional."}
            </p>
          )}
        </article>
      </div>
    </section>
  );
}
