import Link from "next/link";
import { enquiryPath } from "@homepage/content/enquiry";
import { Button } from "../Button";
import type { ServiceLocale, ServiceSlug } from "../../data/services";
import {
  isServiceProductSlug,
  serviceProductPath,
  serviceProducts,
} from "../../data/serviceProducts";
import { serviceCollaborationPath } from "../../data/serviceCollaborations";
import styles from "./services.module.css";

export function ServiceHeroActions({
  slug,
  locale,
  workLabel,
}: {
  slug: ServiceSlug;
  locale: ServiceLocale;
  workLabel: string;
}) {
  const de = locale === "de";
  const offer = isServiceProductSlug(slug)
    ? serviceProducts[slug].copy[locale]
    : null;
  return (
    <nav
      aria-label={de ? "Zusammenarbeit wählen" : "Choose how to work together"}
    >
      <div className={styles.actions}>
        {offer && isServiceProductSlug(slug) && (
          <Button
            href={serviceProductPath(slug, locale)}
            variant="cta"
            arrow
            className={styles.primary}
          >
            {offer.heroCta}
          </Button>
        )}
        <Button
          href={serviceCollaborationPath(slug, locale)}
          variant={offer ? "default" : "cta"}
          arrow
          className={`${styles.primary} ${offer ? "border-white/40 bg-transparent text-white hover:bg-white/10" : ""}`}
        >
          {de ? "Gemeinsam umsetzen" : "Build with me"}
        </Button>
      </div>
      <div className={styles.heroLinks}>
        <Link
          href={enquiryPath(
            { source: "service", service: slug, intent: "explore" },
            locale,
          )}
          className={styles.textLink}
        >
          {de ? "Noch unsicher? Lass uns sprechen" : "Not sure? Let’s talk"}
        </Link>
        <a href="#work" className={styles.textLink}>
          {workLabel} <span aria-hidden="true">↓</span>
        </a>
      </div>
    </nav>
  );
}
