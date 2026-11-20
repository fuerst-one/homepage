import Link from "next/link";
import type { ForYouSection } from "@homepage/content/forYouPlan";
import type { Locale } from "@homepage/content/i18n";
import {
  serviceProductPath,
  serviceProducts,
} from "../../data/serviceProducts";
import styles from "../Services/services.module.css";

export function ForYouOffer({
  section,
  number,
  locale,
}: {
  section: Extract<ForYouSection, { type: "offer" }>;
  number: number;
  locale: Locale;
}) {
  const de = locale === "de";
  const id = `for-you-${number}`;
  const offer = serviceProducts[section.offer].copy[locale];
  return (
    <section className={styles.startingOffer} aria-labelledby={id}>
      <p className={styles.eyebrow}>
        {String(number).padStart(2, "0")} /{" "}
        {de ? "Der passende Einstieg" : "The right starting point"}
      </p>
      <h2 id={id}>{offer.label}</h2>
      <div className={styles.engagementGrid}>
        <div className={styles.engagementOption}>
          <p className="for-you-offer-fit">{section.text}</p>
        </div>
        <div className={styles.engagementOption}>
          <p>{offer.teaser}</p>
          <Link
            href={serviceProductPath(section.offer, locale)}
            className={styles.textLink}
            data-for-you-action={`offer:${section.offer}`}
          >
            {de
              ? "Umfang & Ergebnisse ansehen"
              : "See the scope & deliverables"}{" "}
            <span aria-hidden="true">↗</span>
          </Link>
          <p className={styles.micro}>
            {de
              ? "Eigenständig beauftragbar. Umfang und Honorar vor dem Start vereinbart."
              : "Useful on its own. Scope and fee agreed before work begins."}
          </p>
        </div>
      </div>
    </section>
  );
}
