import Link from "./i18n/LocalizedLink";
import type { Locale } from "@/lib/i18n";

export function SiteFooter({ locale = "en" }: { locale?: Locale }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.75rem] text-neutral-500 print:hidden">
      <Link
        className="transition hover:text-white"
        href={locale === "de" ? "/de/impressum" : "/en/legal-notice"}
      >
        {locale === "de" ? "Impressum" : "Legal Notice"}
      </Link>
      <span className="opacity-40">/</span>
      <Link
        className="transition hover:text-white"
        href={locale === "de" ? "/de/datenschutz" : "/en/privacy"}
      >
        {locale === "de" ? "Datenschutz" : "Privacy"}
      </Link>
    </p>
  );
}
