"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import {
  PROFILE_FACETS,
  PROFILE_STORAGE_KEY,
  recommendProfileProjects,
  type ProfileFacet,
  type ProfileInterest,
} from "@homepage/content/visitorProfile";
import {
  PROFILE_PIXEL_LEVELS,
  PROFILE_PIXEL_MAX_INTERACTIONS,
  PROFILE_PIXEL_MIN_SHARE,
  encodeProfilePayload,
  encodeProfileText,
  profilePixelCapacity,
} from "@homepage/content/profilePixels";
import { useLocale } from "../i18n/LocaleProvider";
import Link from "../i18n/LocalizedLink";
import { Button } from "../Button";
import { ProfilePatterns, ProfileShortlist } from "./ProfileInsights";
import { ProfileInterestDetail } from "./ProfileInterestDetail";
import { ProfileInterestRadar } from "./ProfileInterestRadar";
import { ProfilePixelGrid } from "./ProfilePixelGrid";
import { ProfileSignalLog } from "./ProfileSignalLog";
import {
  PROFILE_TABS,
  profileTabForHash,
  type ProfileTabId,
} from "./profileTabs";
import {
  useVisitorProfileStore as useProfile,
  recordVisitorInteraction,
} from "./profileStore";
import { useProfileSnapshot } from "./useProfileSnapshot";
import { facetHues, facetNames, topInterests } from "./profilePresentation";
import "./visitor-profile.css";

const tabNames: Record<ProfileTabId, [string, string]> = {
  interests: ["Interests", "Interessen"],
  projects: ["Projects", "Projekte"],
  signals: ["Signals", "Signale"],
  "how-it-works": ["How it works", "So funktioniert es"],
  settings: ["Data & settings", "Daten & Einstellungen"],
};
const LOADING_ATTRIBUTE = "data-profile-loading";
// Runs while the HTML is parsed. The saved profile itself needs the catalog,
// but its presence is known before the first paint, so the page never shows
// the state without a profile to a visitor who has one.
const LOADING_HINT = `try{if(localStorage.getItem(${JSON.stringify(PROFILE_STORAGE_KEY)}))document.currentScript.parentElement.setAttribute("${LOADING_ATTRIBUTE}","")}catch{}`;
const noSubscription = () => () => {};
/** True in server HTML and while it hydrates, false for renders in the browser. */
const useServerRendered = () =>
  useSyncExternalStore(
    noSubscription,
    () => false,
    () => true,
  );

export default function VisitorProfilePage() {
  const locale = useLocale(),
    de = locale === "de",
    language = de ? 1 : 0;
  const s = useProfile();
  const { interests, snapshotAt } = useProfileSnapshot();
  const rootRef = useRef<HTMLDivElement>(null);
  // The signature only runs in when this page had to wait for the profile.
  // Arriving by navigation, the profile is already there and shows at rest.
  const [openedWithoutProfile] = useState(() => !useProfile.getState().enabled);
  // React creates script elements inert and warns about them, so the hint is
  // only part of the server HTML.
  const serverRendered = useServerRendered();
  const catalogSettled = s.catalog !== null || s.catalogFailed;
  // Server HTML carries both the start state and the loading state; the hint
  // attribute decides which one is displayed until the catalog has settled.
  const mayBeLoading = !s.enabled && !catalogSettled;
  useLayoutEffect(() => {
    if (s.loading) rootRef.current?.setAttribute(LOADING_ATTRIBUTE, "");
    else if (catalogSettled)
      rootRef.current?.removeAttribute(LOADING_ATTRIBUTE);
  }, [s.loading, catalogSettled]);
  const searchRef = useRef<HTMLInputElement>(null);
  const privacyTitleRef = useRef<HTMLHeadingElement>(null);
  const [announcement, setAnnouncement] = useState("");
  const [facet, setFacet] = useState<ProfileFacet | "all">("all");
  const [selectedId, setSelectedId] = useState<string>();
  const [tab, setTab] = useState<ProfileTabId>("interests");
  // An object, so following the same link twice scrolls again.
  const [scrollTarget, setScrollTarget] = useState<{ id: string }>();
  const tabListRef = useRef<HTMLDivElement>(null);
  const panelsRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);
  const codeCopiedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const copyProfileCode = async () => {
    if (!s.catalog) return;
    try {
      await navigator.clipboard.writeText(
        encodeProfileText(
          encodeProfilePayload(s.catalog.terms, interests, s.interactions),
        ),
      );
      setCodeCopied(true);
      clearTimeout(codeCopiedTimer.current);
      codeCopiedTimer.current = setTimeout(() => setCodeCopied(false), 2000);
      setAnnouncement(de ? "Profilcode kopiert." : "Profile code copied.");
    } catch {
      setAnnouncement(
        de
          ? "Der Profilcode konnte nicht kopiert werden."
          : "The profile code could not be copied.",
      );
    }
  };
  const recommendations = useMemo(
    () =>
      s.enabled && s.catalog
        ? recommendProfileProjects(s.profile, s.catalog, snapshotAt).slice(0, 3)
        : [],
    [s.enabled, s.profile, s.catalog, snapshotAt],
  );
  const recommendationsRef = useRef<HTMLDivElement>(null);
  const recommendationIds = recommendations.map((r) => r.project.id).join(",");
  useEffect(() => {
    void useProfile.getState().loadCatalog();
  }, []);
  useEffect(() => {
    if (
      !s.enabled ||
      !recommendationsRef.current ||
      typeof IntersectionObserver === "undefined"
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting && document.visibilityState === "visible") {
            const id = (entry.target as HTMLElement).dataset.recommendation;
            if (id) recordVisitorInteraction("recommendation_shown", id);
            observer.unobserve(entry.target);
            pending.delete(entry.target);
          }
      },
      { threshold: 0.25 },
    );
    const pending = new Set(
      recommendationsRef.current.querySelectorAll("[data-recommendation]"),
    );
    const observePending = () => {
      if (document.visibilityState !== "visible") return;
      pending.forEach((el) => {
        observer.unobserve(el);
        observer.observe(el);
      });
    };
    pending.forEach((el) => observer.observe(el));
    document.addEventListener("visibilitychange", observePending);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", observePending);
    };
  }, [s.enabled, recommendationIds]);
  const inFacet = (interest: ProfileInterest) =>
    facet === "all" || interest.facet === facet;
  const top = topInterests(interests, facet, s.catalog?.terms);
  const hidden = interests.filter(
    (i) => i.preference === "exclude" && inFacet(i),
  );
  // An interest stays open after it leaves the chart, e.g. once marked as not
  // relevant, so the choice can be reverted right there.
  const selected =
    [...interests, ...top].find((i) => i.id === selectedId && inFacet(i)) ??
    top[0];
  const openInterest = (id: string, value: string) => {
    const known = interests.some((i) => i.id === id);
    if (!known) s.choose(id, "interested");
    setSelectedId(id);
    setQuery("");
    setAnnouncement(
      known
        ? de
          ? `${value} geöffnet.`
          : `${value} opened.`
        : de
          ? `${value} hinzugefügt.`
          : `${value} added.`,
    );
    searchRef.current?.focus();
  };

  useLayoutEffect(() => {
    const showHash = (hash: string) => {
      const next = profileTabForHash(hash);
      if (!next) return;
      setTab(next);
      // The browser could not scroll to a section while its tab was hidden.
      setScrollTarget({ id: hash.slice(1) });
    };
    const followHash = () => showHash(location.hash);
    // Router links to this page (e.g. "For you" in the header) would update
    // the URL without a hashchange and scroll before the tab is shown, so the
    // page handles them before the router sees the click.
    const followLink = (event: MouseEvent) => {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey)
        return;
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.target) return;
      const url = new URL(link.href);
      if (
        url.origin !== location.origin ||
        url.pathname !== location.pathname ||
        !profileTabForHash(url.hash)
      )
        return;
      event.preventDefault();
      window.history.pushState(null, "", url.hash);
      showHash(url.hash);
    };
    followHash();
    window.addEventListener("hashchange", followHash);
    document.addEventListener("click", followLink, { capture: true });
    return () => {
      window.removeEventListener("hashchange", followHash);
      document.removeEventListener("click", followLink, { capture: true });
    };
  }, []);
  useEffect(() => {
    if (scrollTarget)
      (
        document.getElementById(scrollTarget.id) ?? panelsRef.current
      )?.scrollIntoView();
  }, [scrollTarget]);
  const openTab = (next: ProfileTabId) => {
    setTab(next);
    window.history.replaceState(null, "", `#${next}`);
    // While the bar is stuck, a new tab starts at its top instead of midway.
    if ((tabListRef.current?.getBoundingClientRect().top ?? 1) <= 0)
      panelsRef.current?.scrollIntoView();
  };
  const moveTabFocus = (key: string) => {
    const index = PROFILE_TABS.findIndex(({ id }) => id === tab);
    const last = PROFILE_TABS.length - 1;
    const nextIndex =
      key === "ArrowRight"
        ? (index + 1) % PROFILE_TABS.length
        : key === "ArrowLeft"
          ? (index + last) % PROFILE_TABS.length
          : key === "Home"
            ? 0
            : key === "End"
              ? last
              : null;
    if (nextIndex === null) return false;
    const next = PROFILE_TABS[nextIndex].id;
    openTab(next);
    document.getElementById(`profile-tab-${next}`)?.focus();
    return true;
  };
  const tabPanel = (id: ProfileTabId) => ({
    id: `profile-panel-${id}`,
    role: "tabpanel",
    "aria-labelledby": `profile-tab-${id}`,
    hidden: tab !== id,
  });
  const matches =
    query.trim() && s.catalog
      ? s.catalog.terms
          .filter(
            (t) =>
              (facet === "all" || t.facet === facet) &&
              t.value.toLowerCase().includes(query.trim().toLowerCase()),
          )
          .slice(0, 8)
      : [];
  const active = interests.filter((t) => t.score > 0).length;
  const pixelCapacity = s.catalog
    ? profilePixelCapacity(s.catalog.terms.length)
    : null;

  const summary = (view: "live" | "start" | "loading") => {
    const profileCopy = view !== "start";
    return (
      <section
        className={`profile-summary ${view === "start" ? "profile-hide-while-loading" : view === "loading" ? "profile-show-while-loading" : ""}`}
        aria-label={de ? "Dein aktuelles Profil" : "Your current profile"}
      >
        {view === "live" ? (
          <div className="profile-page-signature">
            <ProfilePixelGrid runIn={openedWithoutProfile} />
          </div>
        ) : view === "loading" ? (
          <div
            className="profile-page-signature profile-signature-loading"
            aria-hidden="true"
          />
        ) : (
          <div className="profile-page-off" aria-hidden="true">
            <span>?</span>
          </div>
        )}
        <div className="profile-summary-copy">
          <p className="profile-page-eyebrow">
            {profileCopy
              ? de
                ? "Live in diesem Browser"
                : "Live in this browser"
              : de
                ? "Du entscheidest, wann es losgeht"
                : "You decide when it starts"}
          </p>
          <h2 className="text-2xl tracking-tight text-white">
            {profileCopy
              ? de
                ? "Ein Bild deiner Interessen."
                : "A picture of your interests."
              : de
                ? "Noch kein Profil erstellt."
                : "No profile generated yet."}
          </h2>
          <p className="content-reading text-sm leading-relaxed text-neutral-300">
            {profileCopy
              ? de
                ? "Dein Pixelbild fasst die aktuellen Interessenswerte zusammen. Darunter findest du jede Vermutung, ihre Grundlage und deine eigenen Entscheidungen. Du kannst jederzeit korrigieren, zurücksetzen oder stoppen."
                : "Your pixel signature summarises the current interest scores. Below, you can inspect every inference, its evidence and your own choices. Correct it, reset it or stop at any time."
              : de
                ? "Wenn du startest, werden Projekttiefe, gelesene Abschnitte, Bildbetrachtung, Beleglinks, Leistungsdetails, Explorer-Auswahl, gewählte Themen und dein Projektfeedback zu sichtbaren Signalen. Dein Profil und deine Auswahl werden für spätere Besuche 30 Tage lokal in diesem Browser gespeichert. Teilen bleibt eine separate, freiwillige Option."
                : "When you start, project depth, section reading, image exploration, proof links, service details, explorer choices, selected topics and your project feedback become visible signals. Your profile and choices are saved locally in this browser for 30 days, ready for your next visit. Sharing is a separate, optional choice."}
          </p>
          <div className="profile-summary-actions">
            {view === "live" && s.catalog && (
              <button
                type="button"
                className="profile-text-button text-sm"
                data-profile-copy-code
                onClick={() => void copyProfileCode()}
              >
                {codeCopied
                  ? de
                    ? "Kopiert"
                    : "Copied"
                  : de
                    ? "Profilcode kopieren"
                    : "Copy profile code"}
              </button>
            )}
            {view === "live" && (
              <p className="text-primary text-sm">
                {active} {de ? "aktive Interessen" : "active interests"} ·{" "}
                {s.profile.signals.length} {de ? "Signale" : "signals"} ·{" "}
                {s.sharing
                  ? de
                    ? "Teilen aktiv"
                    : "Sharing enabled"
                  : de
                    ? "Nur lokal"
                    : "Local only"}
              </p>
            )}
            {view === "loading" && (
              // The final wording with stand-in numbers, so the row wraps the
              // way the real one will.
              <>
                <span
                  className="profile-text-button text-sm"
                  aria-hidden="true"
                >
                  <span className="profile-loading-text">
                    {de ? "Profilcode kopieren" : "Copy profile code"}
                  </span>
                </span>
                <p className="profile-loading-text text-sm" aria-hidden="true">
                  00 {de ? "aktive Interessen" : "active interests"} · 00{" "}
                  {de ? "Signale" : "signals"} ·{" "}
                  {de ? "Nur lokal" : "Local only"}
                </p>
              </>
            )}
            {view === "start" && (
              <Button
                type="button"
                variant="cta"
                disabled={!s.catalog || !!s.deletionToken}
                onClick={s.start}
              >
                {de ? "Mein Live-Profil starten" : "Start my live profile"}
              </Button>
            )}
            <Link
              href="/projects"
              className="inline-flex min-h-11 items-center text-sm text-neutral-300 underline underline-offset-4"
            >
              {de ? "Projekte erkunden ↗" : "Explore projects ↗"}
            </Link>
          </div>
          {view === "loading" && (
            <p role="status" className="sr-only">
              {de
                ? "Dein gespeichertes Profil wird geladen…"
                : "Loading your saved profile…"}
            </p>
          )}
          {view !== "loading" && s.catalogLoading && (
            <p role="status" className="text-sm text-neutral-400">
              {de
                ? "Projektkategorien werden geladen…"
                : "Loading project dimensions…"}
            </p>
          )}
          {view !== "loading" && s.catalogFailed && (
            <p role="alert" className="text-sm text-neutral-300">
              {de
                ? "Die Kategorien konnten nicht geladen werden."
                : "The dimensions could not be loaded."}{" "}
              <button
                type="button"
                className="profile-text-button"
                onClick={() => void s.loadCatalog()}
              >
                {de ? "Erneut versuchen" : "Try again"}
              </button>
            </p>
          )}
        </div>
      </section>
    );
  };

  return (
    <div
      className="profile-page"
      data-profile-ui
      ref={rootRef}
      // The hint script adds the loading attribute before React hydrates.
      suppressHydrationWarning
    >
      {serverRendered && (
        <script dangerouslySetInnerHTML={{ __html: LOADING_HINT }} />
      )}
      {summary(s.enabled ? "live" : "start")}
      {mayBeLoading && summary("loading")}

      <div
        ref={tabListRef}
        className="profile-page-nav"
        role="tablist"
        aria-label={de ? "Bereiche deines Profils" : "Profile sections"}
        onKeyDown={(event) => {
          if (moveTabFocus(event.key)) event.preventDefault();
        }}
      >
        {PROFILE_TABS.map(({ id }) => (
          <button
            key={id}
            id={`profile-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls={`profile-panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => openTab(id)}
          >
            {tabNames[id][language]}
          </button>
        ))}
      </div>

      <div ref={panelsRef} className="profile-tab-panels">
        <div {...tabPanel("interests")}>
          <section
            id="interests"
            className="profile-page-section"
            aria-labelledby="profile-interests-title"
          >
            <div className="profile-section-heading">
              <div>
                <p className="profile-page-eyebrow">
                  {de ? "Von dir beeinflusst" : "Shaped by you"}
                </p>
                <h2 id="profile-interests-title">
                  {de ? "Deine gesammelten Werte" : "Your collected scores"}
                </h2>
              </div>
              <span className="profile-hide-while-loading">
                {active} {de ? "aktiv" : "active"}
              </span>
            </div>
            <p className="profile-section-intro">
              {de
                ? "Der Überblick zeigt dein stärkstes Interesse je Bereich, ein Bereich seine sieben stärksten. Die Werte sind nachvollziehbare Annahmen, keine Wahrscheinlichkeiten. Wähle ein Interesse, um seine Grundlage zu sehen und es anzupassen; deine Auswahl hat immer Vorrang."
                : "The overview shows your strongest interest in each dimension; a dimension shows its seven strongest. These scores are inspectable hypotheses, not probabilities. Pick an interest to see its evidence and adjust it; your choice always takes priority."}
            </p>
            {s.enabled ? (
              <>
                <div
                  className="profile-facets"
                  role="group"
                  aria-label={de ? "Interessenbereich" : "Interest category"}
                >
                  <button
                    type="button"
                    aria-pressed={facet === "all"}
                    onClick={() => setFacet("all")}
                  >
                    {de ? "Überblick" : "Overview"}
                  </button>
                  {PROFILE_FACETS.map((f) => (
                    <button
                      type="button"
                      key={f}
                      style={{ "--facet-hue": facetHues[f] } as CSSProperties}
                      aria-pressed={facet === f}
                      onClick={() => setFacet(f)}
                    >
                      {facetNames[f][language]}
                    </button>
                  ))}
                </div>
                <p className="sr-only" role="status">
                  {announcement}
                </p>
                {!interests.some((i) => i.score > 0) && (
                  <p className="profile-empty">
                    {de
                      ? "Erkunde Projekte oder füge unten ein Interesse hinzu. Hier siehst du dann, was daraus entsteht."
                      : "Explore projects or add an interest below. This is where you’ll see what takes shape."}
                  </p>
                )}
                <div className="profile-interest-layout">
                  <div className="profile-interest-chart">
                    <ProfileInterestRadar
                      interests={top}
                      facet={facet}
                      selectedId={selected?.id}
                      onSelect={setSelectedId}
                      de={de}
                    />
                    {hidden.length > 0 && (
                      <div className="profile-hidden-interests">
                        <span>
                          {de ? "Von dir ausgeblendet" : "Hidden by you"}
                        </span>
                        {hidden.map((interest) => (
                          <button
                            type="button"
                            key={interest.id}
                            aria-pressed={interest.id === selected?.id}
                            onClick={() => setSelectedId(interest.id)}
                          >
                            {interest.value}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="profile-interest-side">
                    <label className="profile-search-label">
                      {de
                        ? "Interesse finden oder hinzufügen"
                        : "Find or add an interest"}
                      <input
                        type="search"
                        ref={searchRef}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={
                          de
                            ? "z. B. Prototyping, React…"
                            : "e.g. Prototyping, React…"
                        }
                      />
                    </label>
                    {query.trim() && (
                      <div className="profile-search-results">
                        {matches.length ? (
                          matches.map((term) => {
                            const known = interests.find(
                              (i) => i.id === term.id,
                            );
                            return (
                              <button
                                type="button"
                                key={term.id}
                                onClick={() =>
                                  openInterest(term.id, term.value)
                                }
                              >
                                {term.value}
                                <span>
                                  {known
                                    ? `${known.score.toFixed(1)} · ${facetNames[term.facet][language]}`
                                    : `+ ${facetNames[term.facet][language]}`}
                                </span>
                              </button>
                            );
                          })
                        ) : (
                          <p>
                            {de
                              ? "Keine passende Projektkategorie."
                              : "No matching project dimension."}
                          </p>
                        )}
                      </div>
                    )}
                    {selected && s.catalog && (
                      <ProfileInterestDetail
                        interest={selected}
                        catalog={s.catalog}
                        locale={locale}
                        onChoose={s.choose}
                      />
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="profile-empty profile-hide-while-loading">
                  {de
                    ? "Deine Interessen erscheinen hier, sobald du die Profilgenerierung startest."
                    : "Your interests appear here once you start profile generation."}
                </p>
                {mayBeLoading && (
                  <div
                    className="profile-interest-layout profile-show-while-loading"
                    aria-hidden="true"
                  >
                    <div className="profile-radar profile-radar-loading" />
                    <div className="profile-interest-detail">
                      <p className="profile-loading-text">
                        {de ? "Interesse wird geladen" : "Loading interest"}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
          <ProfilePatterns />
        </div>

        <div {...tabPanel("projects")}>
          <section
            id="suggestions"
            className="profile-page-section"
            aria-labelledby="profile-suggestions-title"
          >
            <div className="profile-section-heading">
              <div>
                <p className="profile-page-eyebrow">
                  {de ? "Verbindungen entdecken" : "Find connections"}
                </p>
                <h2 id="profile-suggestions-title" tabIndex={-1}>
                  {de ? "Passende Projekte für dich" : "Projects for you"}
                </h2>
              </div>
            </div>
            <p className="profile-section-intro">
              {de
                ? "Diese Vorschläge verbinden deine Interessen mit öffentlichen Projektkategorien. Die normale Projektliste und deine Filter bleiben unter deiner Kontrolle."
                : "These suggestions connect your interests with public project dimensions. Your filters and the main project list stay under your control."}
            </p>
            <div
              ref={recommendationsRef}
              className="profile-recommendation-grid"
            >
              {recommendations.map(
                ({ project, reasons, affinity, feedback }) => (
                  <article
                    key={project.id}
                    data-recommendation={project.id}
                    className="profile-recommendation-card"
                  >
                    <Link
                      href={project.href}
                      prefetch={false}
                      className="profile-recommendation"
                      onClick={() =>
                        recordVisitorInteraction(
                          "recommendation_opened",
                          project.id,
                        )
                      }
                    >
                      <span>{de ? "Passend zu" : "Connects with"}</span>
                      <strong>{project.name} ↗</strong>
                      <p>
                        {reasons.length
                          ? reasons.map((r) => r.value).join(" · ")
                          : affinity > 0
                            ? de
                              ? "Du hast Belege für dieses Projekt erkundet."
                              : "You explored evidence for this project."
                            : de
                              ? "Passt zu deinem Projektfeedback."
                              : "Connects with your project feedback."}
                      </p>
                      {feedback !== 0 && (
                        <small>
                          {feedback > 0
                            ? de
                              ? "Durch dein Projektfeedback stärker gewichtet"
                              : "Given more weight by your project feedback"
                            : de
                              ? "Durch dein Projektfeedback schwächer gewichtet"
                              : "Given less weight by your project feedback"}
                        </small>
                      )}
                    </Link>
                  </article>
                ),
              )}
            </div>
            {!recommendations.length && (
              <p className="profile-empty profile-hide-while-loading">
                {de
                  ? "Mit den ersten Interessen erscheinen hier begründete Vorschläge."
                  : "Your first interests will give us something to recommend, with reasons."}
              </p>
            )}
          </section>
          <ProfileShortlist />
        </div>

        <div {...tabPanel("signals")}>
          <section
            id="activity"
            className="profile-page-section"
            aria-labelledby="profile-activity-title"
          >
            <div className="profile-section-heading">
              <div>
                <p className="profile-page-eyebrow">
                  {de ? "Die Grundlage" : "The evidence"}
                </p>
                <h2 id="profile-activity-title">
                  {de ? "Deine letzten Signale" : "Your recent signals"}
                </h2>
              </div>
              <span className="profile-hide-while-loading">
                {s.enabled ? s.profile.signals.length : 0}
              </span>
            </div>
            <p className="profile-section-intro">
              {de
                ? "Interaktionen und Korrekturen aus diesem Profil, neueste zuerst; lokal bleiben höchstens 240 erhalten. Die Zahl ist das Startgewicht, für das Obergrenzen und Kategorienzuordnung gelten. Bei Korrekturen steht dort deine Änderung und der zuvor abgeleitete Wert. Suchtexte, Formularinhalte und Mausbewegungen gehören nicht dazu."
                : "Interactions and corrections from this profile, newest first; the local history keeps up to 240. The number is the starting weight, before caps and facet attribution apply. For corrections, it shows your change and the score inferred before it. Search text, form contents and pointer trails are excluded."}
            </p>
            {!s.enabled || !s.profile.signals.length || !s.catalog ? (
              <p className="profile-empty profile-hide-while-loading">
                {de
                  ? "Dein nächster Schritt wird hier sichtbar, sobald das Profil aktiv ist."
                  : "Your next interaction will appear here while the profile is active."}
              </p>
            ) : (
              <ProfileSignalLog
                signals={s.profile.signals}
                catalog={s.catalog}
                locale={locale}
              />
            )}
          </section>
        </div>

        <div {...tabPanel("how-it-works")}>
          <section
            id="how-it-works"
            className="profile-page-section"
            aria-labelledby="profile-rules-title"
          >
            <div className="profile-section-heading">
              <div>
                <p className="profile-page-eyebrow">
                  {de ? "Offen nachvollziehbar" : "Open to inspection"}
                </p>
                <h2 id="profile-rules-title">
                  {de
                    ? "Wie aus Signalen Interessen werden"
                    : "How signals become interests"}
                </h2>
              </div>
            </div>
            <div className="profile-explanation-grid">
              <div className="space-y-4">
                <h3>{de ? "Die Startgewichte" : "The starting weights"}</h3>
                <dl className="profile-rule-list">
                  <div>
                    <dt>{de ? "Filter bewusst wählen" : "Choose a filter"}</dt>
                    <dd>+6</dd>
                  </div>
                  <div>
                    <dt>{de ? "Leistung ansehen" : "View a service"}</dt>
                    <dd>+3</dd>
                  </div>
                  <div>
                    <dt>
                      {de
                        ? "Projektdetails / Fallstudie"
                        : "Project details / case study"}
                    </dt>
                    <dd>+3 / +4</dd>
                  </div>
                  <div>
                    <dt>
                      {de ? "Projektabschnitt lesen" : "Read a project section"}
                    </dt>
                    <dd>+2</dd>
                  </div>
                  <div>
                    <dt>
                      {de
                        ? "Konkretes Angebot ansehen"
                        : "View a focused offer"}
                    </dt>
                    <dd>+4</dd>
                  </div>
                  <div>
                    <dt>
                      {de
                        ? "Gruppenthema im Explorer wählen"
                        : "Choose an explorer cluster topic"}
                    </dt>
                    <dd>+4</dd>
                  </div>
                  <div>
                    <dt>
                      {de ? "Thema bewusst wählen" : "Choose a search topic"}
                    </dt>
                    <dd>+6</dd>
                  </div>
                  <div>
                    <dt>{de ? "Projekt öffnen" : "Open a project"}</dt>
                    <dd>+2</dd>
                  </div>
                  <div>
                    <dt>
                      {de
                        ? "15 Sekunden aktiv lesen"
                        : "15 seconds of active reading"}
                    </dt>
                    <dd>+1</dd>
                  </div>
                </dl>
                <p>
                  {de
                    ? "Lesezeit zählt nur bei sichtbarem Projekt, aktivem Browserfenster und kürzlicher Interaktion. Gleiche Aktionen zählen höchstens einmal pro 30 Minuten. Punkte werden innerhalb jeder Dimension auf die passenden Tags verteilt."
                    : "Reading time counts while the project is visible, the browser is focused and you have interacted recently. The same action counts at most once per 30 minutes. Points split across matching tags within each dimension."}
                </p>
                <p>
                  {de
                    ? "Vorschau, Details und Fallstudie zählen innerhalb von 30 Minuten nur mit der stärksten Stufe. Abschnitte tragen nur zu passenden Bereichen bei: Ergebnisse zum Bedarf, Architektur zu Kompetenzen und Tools, Vorgehen zu Methoden, Umsetzung zu Projektphasen. Galerien, Beleglinks und Wiederbesuche stärken nur die Projektzuordnung. Wiederbesuche brauchen mindestens einen Tag Abstand. Belegvorlieben und Zusammenarbeitsmuster geben keine Themenpunkte."
                    : "Preview, details and case study contribute only the strongest depth within 30 minutes. Sections affect relevant facets: outcomes inform needs, architecture informs capabilities and tools, process informs methods, delivery informs stages. Galleries, proof links and returns strengthen project affinity only. Return visits need at least a day between visits. Proof preferences and collaboration patterns add no topic points."}
                </p>
                <p>
                  {de
                    ? "Abgeleitete Werte halbieren sich alle sieben Tage und sind auf 12 begrenzt. Deine Auswahl hat Vorrang: nicht relevant = 0, interessiert = 6, besonders wichtig = 12. Automatisch stellt den abgeleiteten Wert wieder her."
                    : "Inferred scores halve every seven days and cap at 12. Your choices override them: not relevant = 0, interested = 6, a priority = 12. Automatic restores the inference."}
                </p>
              </div>
              <div className="space-y-4">
                <h3>
                  {de ? "Dein Pixelbild lesen" : "Reading your pixel signature"}
                </h3>
                <p>
                  {de
                    ? `Das Bild berücksichtigt alle ${s.catalog?.terms.length ?? "öffentlichen"} Interessenskategorien. Jeder Wert von 0 bis 12 wird für das Bild auf eine von ${PROFILE_PIXEL_LEVELS} Stufen abgebildet; die eigentlichen Profilwerte bleiben präziser.`
                    : `The image includes all ${s.catalog?.terms.length ?? "public"} interest categories. Each score from 0 to 12 maps to one of ${PROFILE_PIXEL_LEVELS} levels for the picture; the underlying profile keeps its finer precision.`}
                </p>
                <p>
                  {de
                    ? "Die Farbflächen zeigen grobe Interessensbereiche: Grün für Entwicklung und Hardware, Blau für KI und Daten, Magenta für UX und Forschung, Korallrot für Geschäft und Umsetzung. Ihre Größe folgt deinen Werten für Bedarf, Kompetenzen und Methoden. Die Schattierungen kodieren alle Interessenswerte, einschließlich Tools, Branchen und Formaten. Mehrere Werte teilen sich einen Pixel."
                    : "Colour regions show broad interest families: green for engineering and hardware, blue for AI and data, magenta for UX and research, coral for business and delivery. Their size follows your needs, capabilities and methods. The shades encode every interest score, including tools, sectors and formats. Several scores share a pixel."}
                </p>
                <p>
                  {de
                    ? `Schwarze und weiße Muster in drei Ecken markieren die Orientierung. Jede Farbe behält mindestens ${Math.round(PROFILE_PIXEL_MIN_SHARE * 100)} Prozent der farbigen Felder, sodass kein Farbton verschwindet; die übrige Fläche folgt deinem Interesse am jeweiligen Bereich. Ohne Signale in Bedarf, Kompetenzen oder Methoden starten die vier Bereiche gleich groß. Jede Interaktion, die dein Profil verändert, verschiebt die Farbwelle um einen Schritt und wird gezählt. Das Bild speichert diese Anzahl (bis ${PROFILE_PIXEL_MAX_INTERACTIONS.toLocaleString("de-DE")}) neben den Werten; wer das Bild erhält, kann also ablesen, wie viele Interaktionen es geprägt haben. Ungenutzter Speicher liegt gebündelt bei den Ecken.`
                    : `Black-and-white patterns in three corners mark orientation. Every colour keeps at least ${Math.round(PROFILE_PIXEL_MIN_SHARE * 100)} percent of the coloured cells, so no hue disappears; the remaining area follows your interest in each family. Without signals in needs, capabilities or methods, the four regions start equally. Each interaction that changes your profile moves the colour wave one step and is counted. The picture stores that count (up to ${PROFILE_PIXEL_MAX_INTERACTIONS.toLocaleString("en-GB")}) next to the scores, so anyone you give the image to can read how many interactions shaped it. Unused capacity gathers near the corners.`}
                </p>
                {pixelCapacity && (
                  <p>
                    {de
                      ? `Das aktuelle Raster umfasst ${pixelCapacity.size} × ${pixelCapacity.size} Pixel. Nach Formatkennung und Prüfsumme bleiben ${pixelCapacity.spareBits} Bits für bis zu ${pixelCapacity.extraTerms} weitere Kategorien mit ${PROFILE_PIXEL_LEVELS} Stufen frei. Wird diese Kapazität überschritten, wächst das Raster. Die exakte Dekodierung benötigt die unveränderten RGB-Werte und die passende Kategorienliste.`
                      : `The current grid is ${pixelCapacity.size} × ${pixelCapacity.size} pixels. After the format identifier and checksum, ${pixelCapacity.spareBits} bits remain for up to ${pixelCapacity.extraTerms} additional categories at ${PROFILE_PIXEL_LEVELS} levels. If this capacity is exceeded, the grid grows. Exact decoding requires the original RGB values and the matching category list.`}
                  </p>
                )}
                <p>
                  {de
                    ? "Gleiche Stufenwerte und dieselbe Kategorienliste ergeben dasselbe Bild. Die Farbbereiche sind eine vereinfachte Zusammenfassung, keine Einschätzung deiner Identität."
                    : "The same score levels and catalog produce the same image. The colour regions are a simplified summary of interests."}
                </p>
                <p>
                  {de
                    ? "Das Pixelbild enthält Interessenswerte, keine Identität, Kontaktdaten oder den Verlauf. Wer das Bild weitergibt, gibt damit auch diese Interessenswerte weiter."
                    : "The signature contains interest scores, without identity, contact details or the history. Sharing the image also shares those interest scores."}
                </p>
              </div>
            </div>
            <p className="profile-section-intro mt-6">
              {de
                ? "Anfragen sowie angezeigte und geöffnete Vorschläge erhalten keine zusätzlichen Interessenspunkte. So zählt ein Vorschlagsklick nicht doppelt. Die Gewichte sind erste Annahmen. Deine Korrekturen helfen, sie später zu beurteilen."
                : "Enquiries and suggestions displayed or opened add no extra interest points. This prevents a recommendation click counting twice. The weights are initial hypotheses; your corrections help us evaluate them."}
            </p>
          </section>
        </div>

        <div {...tabPanel("settings")}>
          <section
            id="profile-privacy"
            className="profile-page-section"
            aria-labelledby="profile-privacy-title"
          >
            <div className="profile-section-heading">
              <div>
                <p className="profile-page-eyebrow">
                  {de ? "Du behältst die Kontrolle" : "You stay in control"}
                </p>
                <h2
                  id="profile-privacy-title"
                  ref={privacyTitleRef}
                  tabIndex={-1}
                >
                  {de ? "Deine Daten & Einstellungen" : "Your data & settings"}
                </h2>
              </div>
            </div>
            <p className="profile-section-intro">
              {de
                ? "Beim Start wird dein Profil in diesem Browser gespeichert und bei späteren Besuchen wiederhergestellt. Es ist mit keinem Konto und keinen Kontaktdaten verknüpft. Nach 30 Tagen läuft es ab. Du kannst das Speichern unten ausschalten; dann bleibt es bis zum Neuladen in diesem Tab."
                : "Starting saves your profile in this browser and restores it on later visits. It is not linked to an account or contact details. It expires after 30 days. You can turn remembering off below; then it stays in this tab until you reload."}
            </p>
            {s.enabled && (
              <div className="profile-settings">
                <label>
                  <input
                    type="checkbox"
                    checked={s.remember}
                    onChange={(event) => s.setRemember(event.target.checked)}
                  />
                  <span>
                    {de
                      ? "Interessen auf diesem Gerät merken (30 Tage)"
                      : "Remember interests on this device (30 days)"}
                    <small>
                      {de
                        ? "Speichert deine Interessen und Entscheidungen im lokalen Browserspeicher."
                        : "Saves your interests and choices in local browser storage."}
                    </small>
                  </span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={s.sharing}
                    disabled={!s.catalog?.sharingAvailable || !!s.deletionToken}
                    onChange={(event) =>
                      void s.setSharing(event.target.checked)
                    }
                  />
                  <span>
                    {de
                      ? "Signale und Korrekturen mit Alexander teilen"
                      : "Share signals and corrections with Alexander"}
                    <small>
                      {de
                        ? "Nur neue Aktionen nach dieser Einwilligung. Keine Suchtexte, Formularinhalte oder Kontaktdaten."
                        : "Only new actions after this opt-in. No search text, form contents or contact details."}
                    </small>
                  </span>
                </label>
                {!s.catalog?.sharingAvailable && (
                  <p>
                    {de
                      ? "Teilen ist aktuell nicht verfügbar."
                      : "Sharing is currently unavailable."}
                  </p>
                )}
                <p>
                  {de
                    ? "Teilen übermittelt öffentliche Projektkategorien, Interaktionstypen und Korrekturen mit einer zufälligen Browserkennung. Geteilte Ereignisse werden 30 Tage berücksichtigt und im nächsten täglichen Wartungslauf oder beim nächsten Schreibzugriff gelöscht. Wenn du Teilen ausschaltest, werden die zugehörigen Serverereignisse gelöscht."
                    : "Sharing sends public project dimensions, interaction types and corrections with a random browser identifier. Shared events are considered for 30 days and erased by the next daily maintenance run or write. Switching sharing off erases the associated server events."}
                </p>
                <div className="profile-settings-actions">
                  <Button type="button" onClick={() => void s.reset()}>
                    {de ? "Interessen zurücksetzen" : "Reset interests"}
                  </Button>
                  <button
                    type="button"
                    className="profile-text-button"
                    onClick={() => {
                      void s.stop();
                      privacyTitleRef.current?.focus({ preventScroll: true });
                    }}
                  >
                    {de ? "Profil stoppen & löschen" : "Stop & clear profile"}
                  </button>
                </div>
              </div>
            )}
            {s.storageFailed && (
              <p className="profile-error" role="status">
                {de
                  ? "Der Browserspeicher konnte nicht aktualisiert werden. Änderungen bleiben möglicherweise nur in diesem Tab; zuvor gespeicherte Daten können noch vorhanden sein. Du kannst das Speichern erneut einschalten oder die Website-Daten im Browser löschen."
                  : "Browser storage could not be updated. Changes may only last in this tab; previously saved data may remain. You can try enabling remembering again or clear this website’s browser data."}
              </p>
            )}
            {s.network === "error" && (
              <p className="profile-error" role="status">
                {de
                  ? "Teilen fehlgeschlagen; deine lokalen Interessen funktionieren weiter."
                  : "Sharing failed; your local interests still work."}{" "}
                <button type="button" onClick={() => void s.flush()}>
                  {de ? "Erneut versuchen" : "Retry"}
                </button>
              </p>
            )}
            {s.network === "delete-error" && (
              <p className="profile-error" role="alert">
                {de
                  ? "Teilen gestoppt. Geteilte Daten konnten noch nicht gelöscht werden. Ein Schlüssel für einen erneuten Versuch bleibt bis zur Bestätigung, höchstens 31 Tage, auf diesem Gerät."
                  : "Sharing stopped. Shared data could not yet be erased. A retry key stays on this device until confirmed, for up to 31 days."}{" "}
                <button type="button" onClick={() => void s.deleteShared()}>
                  {de ? "Löschen wiederholen" : "Retry erasure"}
                </button>
              </p>
            )}
            <Link
              href={de ? "/de/datenschutz" : "/en/privacy"}
              className="inline-flex min-h-11 items-center text-sm text-neutral-300 underline underline-offset-4"
            >
              {de
                ? "Vollständige Datenschutzerklärung ↗"
                : "Full privacy notice ↗"}
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
