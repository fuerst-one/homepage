import Link from "next/link";
import {
  serviceProducts,
  serviceProductPath,
} from "../../data/serviceProducts";
import type { ServiceSlug, ServiceLocale } from "../../data/services";
import styles from "./services.module.css";

export function ServiceStartingOffer({
  slug,
  locale,
}: {
  slug: ServiceSlug;
  locale: ServiceLocale;
}) {
  const copy = serviceProducts[slug].copy[locale];
  return (
    <section
      className={styles.startingOffer}
      aria-labelledby="starting-offer-heading"
    >
      <p className={styles.eyebrow}>
        {locale === "de" ? "Ein klarer erster Schritt" : "A clear first step"}
      </p>
      <h2 id="starting-offer-heading">{copy.label}</h2>
      <p>{copy.teaser}</p>
      <Link href={serviceProductPath(slug, locale)} className={styles.textLink}>
        {locale === "de"
          ? "Umfang & Ergebnisse ansehen"
          : "See the scope & deliverables"}{" "}
        <span aria-hidden="true">↗</span>
      </Link>
      <p className={styles.micro}>
        {locale === "de"
          ? "Ein bezahlter, klar begrenzter Auftrag. Umfang und Honorar vereinbaren wir vor dem Start."
          : "A focused, paid engagement. Scope and fee agreed before work begins."}
      </p>
    </section>
  );
}
