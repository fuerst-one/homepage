import type { Locale } from "@homepage/content/i18n";
import { Button } from "../Button";

export function HomeActions({
  locale,
  closing = false,
}: {
  locale: Locale;
  closing?: boolean;
}) {
  return (
    <nav
      aria-label={
        locale === "de"
          ? closing
            ? "Nächste Schritte"
            : "Meine Arbeit entdecken"
          : closing
            ? "Next steps"
            : "Explore my work"
      }
      className="flex flex-wrap gap-4"
    >
      <Button prefetch={false} href="/projects" className="max-w-full" arrow>
        {locale === "de" ? "Projekte entdecken" : "Explore projects"}
      </Button>
      <Button
        prefetch={false}
        href="/contact"
        variant="cta"
        className="max-w-full"
        arrow
      >
        {locale === "de" ? "Kontakt aufnehmen" : "Get in touch"}
      </Button>
    </nav>
  );
}
