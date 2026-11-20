"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { ForYouSection } from "@homepage/content/forYouPlan";
import { buildForYouPreview } from "@homepage/content/forYouPreview";
import { localizedPath, type Locale } from "@homepage/content/i18n";
import { PROFILE_STORAGE_KEY } from "@homepage/content/visitorProfile";
import Link from "next/link";
import { Button } from "../Button";
import { facetValueLabel } from "../Cv/Projects/Filter/utils";
import {
  recordVisitorInteraction,
  useVisitorProfileStore as useProfile,
} from "../VisitorProfile/profileStore";
import { useForYouReady } from "../VisitorProfile/useForYouReady";
import { ForYouPlanView } from "./ForYouPlanView";
import type { ForYouProject } from "./forYouProject";
import styles from "../Services/services.module.css";

const LOADING_ATTRIBUTE = "data-for-you-loading";
// Runs while the HTML is parsed, as on the profile page: a visitor with a
// saved profile never sees the state without one while the profile restores.
const LOADING_HINT = `try{if(localStorage.getItem(${JSON.stringify(PROFILE_STORAGE_KEY)}))document.currentScript.parentElement.setAttribute("${LOADING_ATTRIBUTE}","")}catch{}`;
const noSubscription = () => () => {};
/** True in server HTML and while it hydrates, false for renders in the browser. */
const useServerRendered = () =>
  useSyncExternalStore(
    noSubscription,
    () => false,
    () => true,
  );

const copy = {
  en: {
    eyebrow: "For you",
    noneTitle: "A page built around your interests.",
    noneText:
      "For you arranges projects from my portfolio around what you are looking for. It works from a visitor profile that you start and control on the profile page.",
    noneStart: "Start a profile",
    noneProjects: "Browse all projects",
    loading: "Loading your profile …",
    notReadyTitle: "Your profile needs a little more to go on.",
    notReadyText:
      "Look around a bit longer: open projects that interest you or filter the list by what you need. This page fills in once your interests are clear.",
    notReadyProjects: "Browse the projects",
    notReadyExplorer: "Open the Explorer",
  },
  de: {
    eyebrow: "Für dich",
    noneTitle: "Eine Seite, die sich nach deinen Interessen richtet.",
    noneText:
      "„Für dich“ ordnet Projekte aus meinem Portfolio nach dem, was du suchst. Dafür braucht es ein Besucherprofil, das du auf der Profilseite startest und selbst steuerst.",
    noneStart: "Profil starten",
    noneProjects: "Alle Projekte ansehen",
    loading: "Dein Profil wird geladen …",
    notReadyTitle: "Dein Profil braucht noch etwas mehr.",
    notReadyText:
      "Schau dich noch etwas um: Öffne Projekte, die dich interessieren, oder filtere die Liste nach deinem Bedarf. Diese Seite füllt sich, sobald deine Interessen klar sind.",
    notReadyProjects: "Projekte ansehen",
    notReadyExplorer: "Explorer öffnen",
  },
} as const;

/** Picks the page's state in the browser, where the profile lives. */
export function ForYouPage({
  locale,
  cards,
}: {
  locale: Locale;
  cards: Record<string, ForYouProject>;
}) {
  const t = copy[locale];
  const enabled = useProfile((s) => s.enabled);
  const catalog = useProfile((s) => s.catalog);
  const catalogFailed = useProfile((s) => s.catalogFailed);
  const loading = useProfile((s) => s.loading);
  const ready = useForYouReady();
  const serverRendered = useServerRendered();
  const rootRef = useRef<HTMLDivElement>(null);
  // Built once per visit, so suggestions recorded while reading do not reshuffle the page.
  const [preview, setPreview] = useState<ForYouSection[] | null>(null);

  useEffect(() => {
    void useProfile.getState().loadCatalog();
  }, []);
  const catalogSettled = catalog !== null || catalogFailed;
  useLayoutEffect(() => {
    if (loading) rootRef.current?.setAttribute(LOADING_ATTRIBUTE, "");
    else if (catalogSettled)
      rootRef.current?.removeAttribute(LOADING_ATTRIBUTE);
  }, [loading, catalogSettled]);
  useEffect(() => {
    if (!ready || !catalog || preview) return;
    setPreview(
      buildForYouPreview({
        profile: useProfile.getState().profile,
        catalog,
        images: Object.fromEntries(
          Object.values(cards).map((card) => [
            card.id,
            Object.keys(card.images),
          ]),
        ),
        locale,
        termLabel: (term) => facetValueLabel(term.facet, term.value, locale),
        now: Date.now(),
      }),
    );
  }, [ready, catalog, preview, cards, locale]);
  useSuggestionRecording(rootRef, preview);

  const mode = !enabled
    ? "absent"
    : !ready || preview?.length === 0
      ? "notReady"
      : preview && catalog
        ? "ready"
        : "building";
  const loadingNotice = (
    <Notice
      key="loading"
      state="loading"
      eyebrow={t.eyebrow}
      title={t.eyebrow}
      text={t.loading}
    />
  );
  const state: ReactNode[] = [];
  if (mode === "ready" && preview && catalog)
    state.push(
      <div key="ready" data-for-you-state="ready">
        <ForYouPlanView
          locale={locale}
          sections={preview}
          pending={false}
          projects={cards}
          needs={catalog.terms
            .filter((term) => term.facet === "buyerNeeds")
            .map((term) => term.value)}
        />
      </div>,
    );
  else if (mode === "notReady")
    state.push(
      <Notice
        key="notReady"
        state="notReady"
        eyebrow={t.eyebrow}
        title={t.notReadyTitle}
        text={t.notReadyText}
        primary={{
          href: localizedPath("/projects", locale),
          label: t.notReadyProjects,
        }}
        secondary={{
          href: localizedPath("/explorer", locale),
          label: t.notReadyExplorer,
        }}
      />,
    );
  else if (mode === "building") state.push(loadingNotice);
  else {
    state.push(
      <Notice
        key="none"
        state="none"
        eyebrow={t.eyebrow}
        title={t.noneTitle}
        text={t.noneText}
        primary={{
          href: localizedPath("/profile", locale),
          label: t.noneStart,
        }}
        secondary={{
          href: localizedPath("/projects", locale),
          label: t.noneProjects,
        }}
      />,
    );
    // Until the catalog has settled a saved profile may still restore; the
    // hint attribute decides which of the two is displayed.
    if (!catalogSettled) state.push(loadingNotice);
  }

  return (
    <div
      ref={rootRef}
      className="for-you-states"
      data-profile-ui
      // The hint script adds the loading attribute before React hydrates.
      suppressHydrationWarning
    >
      {serverRendered && (
        <script dangerouslySetInnerHTML={{ __html: LOADING_HINT }} />
      )}
      {state}
    </div>
  );
}

function Notice({
  state,
  eyebrow,
  title,
  text,
  primary,
  secondary,
}: {
  state: "none" | "notReady" | "loading";
  eyebrow: string;
  title: string;
  text: string;
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <article
      data-for-you-state={state}
      className={`${styles.page} ${styles.landing} for-you-page`}
      aria-busy={state === "loading" || undefined}
    >
      <header className={`${styles.landingHero} for-you-hero`}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1>{title}</h1>
          <p
            className={styles.intro}
            role={state === "loading" ? "status" : undefined}
          >
            {text}
          </p>
          {primary && (
            <div className={styles.actions}>
              <Button
                href={primary.href}
                variant="cta"
                arrow
                className={styles.primary}
              >
                {primary.label}
              </Button>
              {secondary && (
                <Link
                  href={secondary.href}
                  prefetch={false}
                  className={styles.textLink}
                >
                  {secondary.label} <span aria-hidden="true">↗</span>
                </Link>
              )}
            </div>
          )}
        </div>
      </header>
    </article>
  );
}

/** Reports the preview's projects as the profile page reports its suggestions; neither earns points. */
function useSuggestionRecording(
  root: React.RefObject<HTMLDivElement | null>,
  preview: ForYouSection[] | null,
) {
  useEffect(() => {
    const container = root.current;
    if (!container || !preview?.length) return;
    const opened = (event: MouseEvent) => {
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>("[data-for-you-project]")
          : null;
      const id = link?.dataset.forYouProject;
      if (id) recordVisitorInteraction("recommendation_opened", id);
    };
    container.addEventListener("click", opened);
    if (typeof IntersectionObserver === "undefined")
      return () => container.removeEventListener("click", opened);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting && document.visibilityState === "visible") {
            const id = (entry.target as HTMLElement).dataset.forYouProject;
            if (id) recordVisitorInteraction("recommendation_shown", id);
            observer.unobserve(entry.target);
          }
      },
      { threshold: 0.25 },
    );
    container
      .querySelectorAll("[data-for-you-project]")
      .forEach((link) => observer.observe(link));
    return () => {
      observer.disconnect();
      container.removeEventListener("click", opened);
    };
  }, [root, preview]);
}
