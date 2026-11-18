import { personName } from "@homepage/content/i18n";
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
  sidebarPositionOnMobile = "before",
  children,
  locale = "en",
  availableLocales,
  wide = false,
}: {
  sidebarContent?: ReactNode;
  sidebarAfter?: ReactNode;
  sidebarPositionOnMobile?: "before" | "after";
  locale?: Locale;
  availableLocales?: Locale[];
  wide?: boolean;
  children: ReactNode;
}) {
  const owner = await getCachedCvOwnerPublic(locale);
  const sidebarBelowContent = sidebarPositionOnMobile === "after";
  const sidebarPanel = (
    <div
      className={`glass-panel relative space-y-6 border border-white/30 p-8 ${sidebarBelowContent ? "mt-6 lg:order-1 lg:mt-0" : ""}`}
    >
      {sidebarContent}
    </div>
  );
  const sidebarExtra = sidebarAfter && (
    <div className={sidebarBelowContent ? "lg:order-2 lg:mt-6" : "mt-6"}>
      {sidebarAfter}
    </div>
  );
  const sidebar = (
    <aside
      className={`flex flex-col ${sidebarBelowContent ? "lg:col-start-1 lg:row-start-1" : ""}`}
    >
      {sidebarBelowContent ? sidebarExtra : sidebarPanel}
      {sidebarBelowContent ? sidebarPanel : sidebarExtra}
      <div className="hidden flex-1 lg:order-3 lg:flex">
        <div className="sticky bottom-4 mt-auto flex w-full justify-end pt-6">
          <BackToTopButton />
        </div>
      </div>
    </aside>
  );
  const mainContent = (
    <main
      className={`min-w-0 flex-1 ${sidebarBelowContent ? "lg:col-start-2 lg:row-start-1 lg:pb-24" : "pb-24"}`}
    >
      <div
        className={`mx-auto w-full ${wide ? "max-w-none" : "max-w-3xl"} space-y-12`}
      >
        <Suspense>{children}</Suspense>
      </div>
    </main>
  );
  return (
    <div className="relative z-10 min-h-screen max-w-full">
      <div className="site-container relative flex flex-col pb-12 pt-6 sm:pt-8 lg:pt-10">
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
              <span className="content-header-brand">FUERST.ONE</span>
              <span className="content-header-name">{personName(locale)}</span>
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
              <ContentNavLink href="/services/ai-products">
                {locale === "de" ? "Produkte mit KI" : "AI products"}
              </ContentNavLink>
            </div>
          </nav>
        </header>

        {sidebarContent ? (
          <div className="grid grid-cols-1 gap-y-12 lg:grid-cols-[360px,1fr] lg:gap-8 xl:gap-16">
            {sidebarBelowContent ? mainContent : sidebar}
            {sidebarBelowContent ? sidebar : mainContent}
          </div>
        ) : (
          <>
            <main className="min-w-0 flex-1 pb-24">
              <div
                className={`mx-auto w-full ${wide ? "max-w-none" : "max-w-3xl"} space-y-12`}
              >
                <Suspense>{children}</Suspense>
              </div>
            </main>
          </>
        )}
      </div>
    </div>
  );
}
