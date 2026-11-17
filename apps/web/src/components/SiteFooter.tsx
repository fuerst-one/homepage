import Link from "./i18n/LocalizedLink";
import type { Locale } from "@homepage/content/i18n";
import { PrivacySettings } from "./PrivacySettings";
import "./site-footer.css";

export function SiteFooter({ locale = "en" }: { locale?: Locale }) {
  return (
    <footer data-site-footer className="glass-panel site-footer">
      <div className="site-footer-inner">
        <p className="site-footer-identity">
          <Link href="/" prefetch={false}>
            Fuerst.one · Alexander Fürst
          </Link>
          <span className="site-footer-role">UX+AI Engineer</span>
        </p>
        <nav
          aria-label={
            locale === "de" ? "Kontakt und Profile" : "Contact and profiles"
          }
          className="site-footer-profiles"
        >
          <Link
            href="/contact"
            prefetch={false}
            className="site-footer-contact"
          >
            {locale === "de" ? "Projekt besprechen ↗" : "Discuss a project ↗"}
          </Link>
          <a href="https://github.com/fuerst-one">GitHub ↗</a>
          <a href="https://www.linkedin.com/in/fuerst-one/">LinkedIn ↗</a>
        </nav>
        <nav
          aria-label={
            locale === "de"
              ? "Rechtliches und Datenschutz"
              : "Legal and privacy"
          }
          className="site-footer-legal"
        >
          <Link
            prefetch={false}
            href={locale === "de" ? "/de/impressum" : "/en/legal-notice"}
          >
            {locale === "de" ? "Impressum" : "Legal Notice"}
          </Link>
          <Link
            prefetch={false}
            href={locale === "de" ? "/de/datenschutz" : "/en/privacy"}
          >
            {locale === "de" ? "Datenschutz" : "Privacy"}
          </Link>
          <PrivacySettings />
        </nav>
      </div>
    </footer>
  );
}
