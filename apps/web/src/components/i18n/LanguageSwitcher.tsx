"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { localizedPath, type Locale } from "@homepage/content/i18n";
import { useLocale } from "./LocaleProvider";

function LanguageLinks({
  path,
  availableLocales,
}: {
  path: string;
  availableLocales: Locale[];
}) {
  const locale = useLocale();
  return (
    <nav
      aria-label={locale === "de" ? "Sprache wählen" : "Choose language"}
      className="flex gap-3 text-xs"
    >
      {availableLocales.map((language) => (
        <Link
          key={language}
          href={localizedPath(path, language)}
          hrefLang={language}
          lang={language}
          aria-current={language === locale ? "page" : undefined}
          className={
            "inline-flex min-h-11 items-center px-1 " +
            (language === locale
              ? "text-white underline underline-offset-4"
              : "text-neutral-400 hover:text-white")
          }
        >
          {language === "en" ? "EN" : "DE"}
        </Link>
      ))}
    </nav>
  );
}
function QueryLanguageLinks({
  pathname,
  availableLocales,
}: {
  pathname: string;
  availableLocales: Locale[];
}) {
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  return (
    <LanguageLinks
      path={`${pathname}${search ? `?${search}` : ""}`}
      availableLocales={availableLocales}
    />
  );
}
export function LanguageSwitcher({
  availableLocales = ["en", "de"],
}: {
  availableLocales?: Locale[];
}) {
  const pathname = usePathname();
  return (
    <Suspense
      fallback={
        <LanguageLinks path={pathname} availableLocales={availableLocales} />
      }
    >
      <QueryLanguageLinks
        pathname={pathname}
        availableLocales={availableLocales}
      />
    </Suspense>
  );
}
