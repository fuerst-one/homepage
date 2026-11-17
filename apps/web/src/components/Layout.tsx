import { ReactNode, Suspense } from "react";
import Link from "./i18n/LocalizedLink";
import { LanguageSwitcher } from "./i18n/LanguageSwitcher";
import { ContentNavLink } from "./ContentNavLink";
import type { Locale } from "@homepage/content/i18n";
import { BackToTopButton } from "./BackToTopButton";
import { getCachedCvOwnerPublic } from "../server/content/getCachedCvOwner";
import "./content-header.css";

export async function Layout({
  sidebarContent,
  sidebarAfter,
  children,
  locale = "en",
  availableLocales,
}: {
  sidebarContent?: ReactNode;
  sidebarAfter?: ReactNode;
  locale?: Locale;
  availableLocales?: Locale[];
  children: ReactNode;
}) {
  const owner = await getCachedCvOwnerPublic(locale);
  return (
    <div className="relative z-10 min-h-screen max-w-full">
      <div className="relative mx-auto flex w-full max-w-6xl flex-col px-2 pb-12 pt-6 sm:px-4 sm:pt-8 lg:px-6 lg:pt-10">
        <header className="content-header text-neutral-300">
          <Link href="/" className="content-header-identity">
            <div className="content-header-portrait">
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
            <div className="content-header-person">
              <span className="content-header-brand">fuerst.one</span>
              <span className="content-header-name">Alexander Fuerst</span>
              <span className="content-header-role">UX+AI Engineer</span>
            </div>
          </Link>
          <Link
            href="/contact"
            className={`content-header-availability ${owner.available === true ? "text-emerald-300" : "text-neutral-300"}`}
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
          <div className="content-header-languages">
            <LanguageSwitcher availableLocales={availableLocales} />
          </div>
          <nav
            aria-label={locale === "de" ? "Hauptnavigation" : "Main navigation"}
            className="content-header-navigation"
          >
            <div className="content-header-primary">
              <ContentNavLink href="/projects">
                {locale === "de" ? "Projekte" : "Projects"}
              </ContentNavLink>
              <ContentNavLink href="/contact">
                {locale === "de" ? "Kontakt" : "Contact"}
              </ContentNavLink>
              <ContentNavLink href="/hire">
                {locale === "de" ? "Zusammenarbeiten" : "Work with me"}
              </ContentNavLink>
            </div>
            <div className="content-header-services">
              <ContentNavLink href="/services/product-interfaces">
                {locale === "de" ? "Produktinterfaces" : "Product interfaces"}
              </ContentNavLink>
              <ContentNavLink href="/services/ai-automation">
                {locale === "de" ? "KI & Automatisierung" : "AI & automation"}
              </ContentNavLink>
            </div>
          </nav>
        </header>

        {sidebarContent ? (
          <div className="grid grid-cols-1 gap-y-12 lg:grid-cols-[360px,1fr] lg:gap-8 xl:gap-16">
            <aside className="flex flex-col">
              <div className="glass-panel relative space-y-6 border border-white/30 p-8">
                {sidebarContent}
              </div>
              {sidebarAfter && <div className="mt-6">{sidebarAfter}</div>}
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
          </>
        )}
      </div>
    </div>
  );
}
