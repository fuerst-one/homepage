import { ReactNode, Suspense } from "react";
import Link from "./i18n/LocalizedLink";
import { LanguageSwitcher } from "./i18n/LanguageSwitcher";
import type { Locale } from "@/lib/i18n";
import { SiteFooter } from "./SiteFooter";
import { BackToTopButton } from "./BackToTopButton";
import { getCachedCvOwnerPublic } from "@/server/notion/getCachedCvOwner";

export async function Layout({
  sidebarContent,
  children,
  locale = "en",
  availableLocales,
}: {
  sidebarContent?: ReactNode;
  locale?: Locale;
  availableLocales?: Locale[];
  children: ReactNode;
}) {
  const owner = await getCachedCvOwnerPublic(locale);
  return (
    <div className="relative z-10 min-h-screen max-w-full">
      <div className="relative mx-auto flex w-full max-w-6xl flex-col px-2 py-12 sm:px-4 lg:px-6">
        <header className="mb-12 flex flex-col gap-6 text-sm text-neutral-300">
          <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <Link
              href="/"
              className="grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[6rem_minmax(0,1fr)]"
            >
              <div className="relative aspect-square w-full border border-white/30 bg-black p-1">
                {owner.avatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={owner.avatarUrl}
                    alt={owner.name}
                    width={96}
                    height={96}
                    className="h-full w-full object-cover grayscale"
                  />
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-[0.65rem] uppercase tracking-[0.3em] text-neutral-400">
                  fuerst.one
                </span>
                <div className="flex flex-col gap-1 text-white">
                  <span className="text-xl font-semibold sm:text-2xl">
                    Alexander Fuerst
                  </span>
                  <span className="flex flex-wrap gap-x-3 gap-y-1 text-[0.65rem] uppercase leading-relaxed tracking-[0.16em] text-neutral-400 sm:text-xs">
                    <span className="whitespace-nowrap">
                      {locale === "de"
                        ? "kreative Technologie"
                        : "creative technology"}
                    </span>
                    <span className="whitespace-nowrap">
                      {locale === "de"
                        ? "klare Interfaces"
                        : "cogent interfaces"}
                    </span>
                    <span className="whitespace-nowrap">
                      {locale === "de"
                        ? "wirksame Automatisierung"
                        : "effective automation"}
                    </span>
                  </span>
                </div>
              </div>
            </Link>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 md:flex-col md:items-end">
              <div className="shrink-0 whitespace-nowrap border border-white/30 bg-black px-4 py-2 text-[0.7rem] uppercase tracking-[0.25em] text-neutral-200">
                UX+AI Engineer
              </div>
              <Link
                href="/contact"
                className={`inline-flex shrink-0 items-center gap-1.5 text-[0.7rem] uppercase tracking-[0.12em] ${owner.available === true ? "text-emerald-300" : "text-neutral-300"}`}
              >
                {owner.available === true
                  ? locale === "de"
                    ? "Verfügbar · Malt"
                    : "Available · Malt"
                  : owner.available === false
                    ? locale === "de"
                      ? "Nicht verfügbar · Malt"
                      : "Unavailable · Malt"
                    : locale === "de"
                      ? "Verfügbarkeit anfragen ↗"
                      : "Ask about availability ↗"}
              </Link>
            </div>
          </div>
          <nav
            aria-label={locale === "de" ? "Hauptnavigation" : "Main navigation"}
            className="flex flex-wrap gap-6 text-xs uppercase tracking-[0.2em] [&>a]:flex [&>a]:items-center"
          >
            <Link href="/projects" className="hover:text-white">
              {locale === "de" ? "Projekte" : "Projects"}
            </Link>
            <Link href="/contact" className="hover:text-white">
              {locale === "de" ? "Kontakt" : "Contact"}
            </Link>
            <Link href="/hire" className="hover:text-white">
              {locale === "de" ? "Zusammenarbeiten" : "Work with me"}
            </Link>
            <Link
              href="/services/product-interfaces"
              className="hover:text-white"
            >
              {locale === "de" ? "Produktinterfaces" : "Product interfaces"}
            </Link>
            <Link href="/services/ai-automation" className="hover:text-white">
              {locale === "de" ? "KI & Automatisierung" : "AI & automation"}
            </Link>
            <div className="md:ml-auto">
              <LanguageSwitcher availableLocales={availableLocales} />
            </div>
          </nav>
          <div className="h-px w-full bg-white/20" />
        </header>

        {sidebarContent ? (
          <div className="grid grid-cols-1 lg:grid-cols-[360px,1fr] lg:gap-8 xl:gap-16">
            <aside className="flex flex-col">
              <div className="relative space-y-6 border border-white/30 bg-black/85 p-8">
                {sidebarContent}
                <div className="border-t border-white/20 pt-6 text-xs text-neutral-500">
                  <SiteFooter locale={locale} />
                </div>
              </div>
              <div className="hidden flex-1 lg:flex">
                <div className="sticky bottom-4 mt-auto flex w-full justify-end pt-6">
                  <BackToTopButton />
                </div>
              </div>
            </aside>
            <main className="min-w-0 flex-1 pb-24">
              <div className="mx-auto w-full max-w-3xl space-y-12">
                <Suspense>{children}</Suspense>
              </div>
            </main>
          </div>
        ) : (
          <>
            <main className="min-w-0 flex-1 pb-24 pt-6">
              <div className="mx-auto w-full max-w-3xl space-y-12">
                <Suspense>{children}</Suspense>
              </div>
            </main>
            <footer className="mt-12 border-t border-white/20 pt-6 text-xs text-neutral-500">
              <SiteFooter locale={locale} />
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
