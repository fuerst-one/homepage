"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "../i18n/LocaleProvider";
import Link from "../i18n/LocalizedLink";
import { useProjectFocusStore } from "../Cv/Projects/projectFocusStore";
import {
  PROFILE_FACETS,
  PROFILE_STORAGE_KEY,
  profileInterests,
  recommendProfileProjects,
  isActiveProfileReading,
  profilePageSignal,
  profileLinkSignals,
  SIGNAL_WEIGHTS,
  type ProfileFacet,
  type ProfileSignal,
  type ProfileCatalog,
} from "@homepage/content/visitorProfile";
import {
  useVisitorProfileStore as useProfile,
  recordVisitorInteraction,
  PROFILE_ERASURE_KEY,
} from "./profileStore";
import "./visitor-profile.css";

const facetNames: Record<ProfileFacet, [string, string]> = {
  buyerNeeds: ["Needs", "Bedarf"],
  capabilities: ["Capabilities", "Kompetenzen"],
  methods: ["Methods", "Methoden"],
  industries: ["Sectors", "Branchen"],
  tools: ["Tools", "Tools"],
  productTypes: ["Formats", "Formate"],
  stages: ["Stages", "Phasen"],
};
const signalNames: Record<ProfileSignal["kind"], [string, string]> = {
  project_opened: ["Opened a project", "Projekt geöffnet"],
  project_read: ["Active reading", "Aktiv gelesen"],
  filter_selected: ["Selected a filter", "Filter gewählt"],
  service_viewed: ["Viewed a service", "Leistung angesehen"],
  enquiry_started: ["Started an enquiry", "Anfrage begonnen"],
  enquiry_submitted: ["Enquiry sent", "Anfrage gesendet"],
  recommendation_shown: ["Suggestion displayed", "Vorschlag angezeigt"],
  recommendation_opened: ["Opened a suggestion", "Vorschlag geöffnet"],
  preference_changed: ["You adjusted an interest", "Interesse angepasst"],
};
function subjectName(signal: ProfileSignal, catalog: ProfileCatalog) {
  return (
    catalog.terms.find((t) => t.id === signal.subject)?.value ??
    catalog.projects.find((p) => p.id === signal.subject)?.name ??
    {
      "ai-automation": "AI & automation",
      "ai-products": "AI products",
      "product-interfaces": "Product interfaces",
      enquiry: "Contact",
    }[signal.subject] ??
    signal.subject
  );
}

function useProfileRuntime() {
  const pathname = usePathname();
  const enabled = useProfile((s) => s.enabled);
  const catalog = useProfile((s) => s.catalog);
  const open = useProfile((s) => s.open);
  const pending = useProfile((s) => s.pending);
  const network = useProfile((s) => s.network);
  const focusedId = useProjectFocusStore((s) => s.focusedProjectId);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [restore, setRestore] = useState(false);
  useEffect(() => {
    useProfile.getState().restoreErasure();
    try {
      setRestore(!!localStorage.getItem(PROFILE_STORAGE_KEY));
    } catch {
      /* Memory-only mode remains available. */
    }
    const changed = (event: StorageEvent) => {
      if (
        event.key === PROFILE_STORAGE_KEY ||
        event.key === PROFILE_ERASURE_KEY ||
        event.key === null
      )
        useProfile.getState().syncFromStorage();
    };
    const leaving = () => {
      void useProfile.getState().flush();
    };
    const visibility = () => {
      if (document.visibilityState === "hidden") leaving();
    };
    window.addEventListener("storage", changed);
    window.addEventListener("pagehide", leaving);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("storage", changed);
      window.removeEventListener("pagehide", leaving);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    if ((!open && !restore) || catalog) return;
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    fetch("/api/profile/catalog", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error("catalog");
        return r.json();
      })
      .then((value) => {
        if (!Array.isArray(value.projects) || !Array.isArray(value.terms))
          throw new Error("catalog");
        useProfile.getState().initialise(value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open, restore, catalog, retry]);

  useEffect(() => {
    if (!enabled || !catalog) return;
    const categoryLink = (event: MouseEvent) => {
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (!link) return;
      for (const signal of profileLinkSignals(
        link.href,
        location.origin,
        catalog,
      ))
        recordVisitorInteraction(signal.kind, signal.subject);
    };
    document.addEventListener("click", categoryLink);
    return () => document.removeEventListener("click", categoryLink);
  }, [enabled, catalog]);
  const pageSignal = catalog
    ? profilePageSignal(pathname, focusedId, catalog)
    : null;
  const activeProject =
    pageSignal?.kind === "project_opened" ? pageSignal.subject : undefined;
  const pageKind = pageSignal?.kind;
  const pageSubject = pageSignal?.subject;
  useEffect(() => {
    if (enabled && pageKind && pageSubject)
      recordVisitorInteraction(pageKind, pageSubject);
  }, [enabled, pageKind, pageSubject]);
  useEffect(() => {
    if (!enabled || !activeProject) return;
    let lastInteraction = Date.now();
    let activeSeconds = 0;
    const interact = (event: Event) => {
      if (
        event.target instanceof Element &&
        event.target.closest("[data-profile-ui]")
      )
        return;
      lastInteraction = Date.now();
    };
    const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    events.forEach((event) =>
      window.addEventListener(event, interact, { passive: true }),
    );
    const timer = setInterval(() => {
      const target = document.querySelector(
        `[data-profile-project="${activeProject}"]`,
      );
      const bounds = target?.getBoundingClientRect();
      const inView =
        !!bounds &&
        Math.min(bounds.bottom, innerHeight) - Math.max(bounds.top, 0) >= 80;
      if (
        isActiveProfileReading(
          {
            visible: document.visibilityState === "visible" && inView,
            focused:
              document.hasFocus() &&
              !document.activeElement?.closest("[data-profile-ui]"),
            lastInteraction,
          },
          Date.now(),
        )
      )
        activeSeconds++;
      if (activeSeconds >= 15) {
        recordVisitorInteraction("project_read", activeProject);
        clearInterval(timer);
      }
    }, 1000);
    return () => {
      clearInterval(timer);
      events.forEach((event) => window.removeEventListener(event, interact));
    };
  }, [enabled, activeProject]);
  useEffect(() => {
    if (!pending.length || network === "error" || network === "sending") return;
    const timer = setTimeout(() => void useProfile.getState().flush(), 1500);
    return () => clearTimeout(timer);
  }, [pending, network]);
  return { loading, failed, retry: () => setRetry((n) => n + 1) };
}

export default function VisitorProfile() {
  const de = useLocale() === "de";
  const language = de ? 1 : 0;
  const s = useProfile();
  const runtime = useProfileRuntime();
  const [tab, setTab] = useState<"interests" | "activity" | "suggestions">(
    "interests",
  );
  const [facet, setFacet] = useState<ProfileFacet | "all">("all");
  const [query, setQuery] = useState("");
  const [dock, setDock] = useState<"left" | "right">("right");
  const interests = useMemo(
    () => (s.catalog ? profileInterests(s.profile, s.catalog, Date.now()) : []),
    [s.profile, s.catalog],
  );
  const recommendations = useMemo(
    () =>
      s.catalog
        ? recommendProfileProjects(s.profile, s.catalog, Date.now()).slice(0, 3)
        : [],
    [s.profile, s.catalog],
  );
  const recIds = recommendations.map((r) => r.project.id).join(",");
  useEffect(() => {
    if (s.enabled && s.open && tab === "suggestions")
      recIds
        .split(",")
        .filter(Boolean)
        .forEach((id) => recordVisitorInteraction("recommendation_shown", id));
  }, [s.enabled, s.open, tab, recIds]);
  const latest = s.profile.signals.at(-1);
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    if (!latest) {
      setAnnouncement("");
      return;
    }
    if (latest && s.catalog && latest.kind !== "recommendation_shown")
      setAnnouncement(
        `${signalNames[latest.kind][language]} · ${subjectName(latest, s.catalog)}`,
      );
  }, [latest, s.catalog, language]);
  const shown = interests.filter((t) => facet === "all" || t.facet === facet);
  const matches =
    query.trim() && s.catalog
      ? s.catalog.terms
          .filter(
            (t) =>
              (facet === "all" || t.facet === facet) &&
              t.value.toLowerCase().includes(query.toLowerCase()),
          )
          .slice(0, 8)
      : [];

  return (
    <Dialog.Root modal={false} open={s.open} onOpenChange={s.setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          data-profile-ui
          data-dock={dock}
          className={`profile-launcher ${s.enabled ? "profile-is-live" : ""}`}
        >
          <span className="profile-status-dot" aria-hidden="true" />
          <span>{de ? "Dein Live-Profil" : "Your live profile"}</span>
          <span className="profile-launcher-count">
            {s.enabled
              ? String(s.profile.signals.length).padStart(2, "0")
              : "↗"}
          </span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Content
          data-profile-ui
          data-dock={dock}
          className="profile-panel"
          aria-describedby="profile-description"
          onInteractOutside={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <div className="profile-panel-header">
            <div className="profile-eyebrow">
              <span className="profile-status-dot" />
              {s.enabled
                ? de
                  ? "Live · du bestimmst"
                  : "Live · you are in control"
                : de
                  ? "Ein offenes Experiment"
                  : "An open experiment"}
            </div>
            <button
              type="button"
              className="profile-dock"
              aria-label={
                de
                  ? "Profil auf die andere Seite verschieben"
                  : "Move profile to the other side"
              }
              onClick={() =>
                setDock((side) => (side === "right" ? "left" : "right"))
              }
            >
              ⇄
            </button>
            <Dialog.Close
              aria-label={de ? "Profil einklappen" : "Collapse profile"}
              className="profile-close"
            >
              ×
            </Dialog.Close>
            <Dialog.Title className="profile-title">
              {de ? "Was dein Besuch erzählt." : "What your visit says."}
            </Dialog.Title>
            <Dialog.Description
              id="profile-description"
              className="profile-description"
            >
              {de
                ? "Sieh, wie sich deine Interessen entwickeln. Korrigiere uns jederzeit."
                : "Watch your interests take shape. Correct us at any time."}
            </Dialog.Description>
            <div className="profile-fingerprint" aria-hidden="true">
              {PROFILE_FACETS.map((f) => (
                <span
                  key={f}
                  title={facetNames[f][language]}
                  style={
                    {
                      "--profile-height": `${Math.max(3, Math.min(100, (interests.filter((t) => t.facet === f).reduce((n, t) => n + t.score, 0) / 24) * 100))}%`,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>
          </div>
          {!s.enabled ? (
            <div className="profile-onboarding">
              <p className="profile-empty-title">
                {de ? "Noch keine Vermutungen." : "No assumptions yet."}
              </p>
              <p>
                {de
                  ? "Wenn du startest, werden Projektaufrufe, aktiv gelesene Zeit und gewählte Filter zu sichtbaren Interessenssignalen. Du kannst jedes Interesse selbst festlegen."
                  : "When you start, project opens, active reading and selected filters become visible interest signals. You can set any interest yourself."}
              </p>
              <p>
                {de
                  ? "Zunächst nur im Arbeitsspeicher dieses Tabs. Speichern und Teilen sind eigene, freiwillige Optionen."
                  : "Starts in this tab’s memory. Remembering and sharing are separate, optional choices."}
              </p>
              <button
                className="profile-primary"
                disabled={!s.catalog || !!s.deletionToken}
                onClick={s.start}
              >
                {de ? "Mein Live-Profil starten" : "Start my live profile"}{" "}
                <span aria-hidden="true">↗</span>
              </button>
              {runtime.loading && (
                <p role="status">
                  {de
                    ? "Projektkategorien werden geladen…"
                    : "Loading project dimensions…"}
                </p>
              )}
              {runtime.failed && (
                <p role="alert">
                  {de
                    ? "Kategorien sind gerade nicht verfügbar."
                    : "Dimensions are currently unavailable."}{" "}
                  <button
                    className="profile-text-button"
                    onClick={runtime.retry}
                  >
                    {de ? "Erneut versuchen" : "Try again"}
                  </button>
                </p>
              )}
            </div>
          ) : (
            <>
              <div
                className="profile-tabs"
                role="group"
                aria-label={de ? "Profilansichten" : "Profile views"}
              >
                {(
                  [
                    [
                      "interests",
                      de ? "Interessen" : "Interests",
                      interests.length,
                    ],
                    [
                      "activity",
                      de ? "Signale" : "Signals",
                      s.profile.signals.length,
                    ],
                    [
                      "suggestions",
                      de ? "Für dich" : "For you",
                      recommendations.length,
                    ],
                  ] as const
                ).map(([id, label, count]) => (
                  <button
                    key={id}
                    aria-pressed={tab === id}
                    onClick={() => setTab(id)}
                  >
                    {label} <span>{count}</span>
                  </button>
                ))}
              </div>
              <div className="profile-panel-body">
                {tab === "interests" && (
                  <>
                    <div
                      className="profile-facets"
                      role="group"
                      aria-label={de ? "Dimension" : "Dimension"}
                    >
                      <button
                        aria-pressed={facet === "all"}
                        onClick={() => setFacet("all")}
                      >
                        {de ? "Alle" : "All"}
                      </button>
                      {PROFILE_FACETS.map((f) => (
                        <button
                          key={f}
                          aria-pressed={facet === f}
                          onClick={() => setFacet(f)}
                        >
                          {facetNames[f][language]}
                        </button>
                      ))}
                    </div>
                    <label className="profile-search-label">
                      {de
                        ? "Interesse selbst hinzufügen"
                        : "Add an interest yourself"}
                      <input
                        type="search"
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
                          matches.map((term) => (
                            <button
                              key={term.id}
                              onClick={() => {
                                s.choose(term.id, "interested");
                                setQuery("");
                              }}
                            >
                              {term.value}
                              <span>+ {facetNames[term.facet][language]}</span>
                            </button>
                          ))
                        ) : (
                          <p>
                            {de
                              ? "Keine passende Projektkategorie."
                              : "No matching project dimension."}
                          </p>
                        )}
                      </div>
                    )}
                    {!shown.length && (
                      <p className="profile-empty">
                        {de
                          ? "Erkunde Projekte oder füge oben ein Interesse hinzu. Hier siehst du dann, was daraus entsteht."
                          : "Explore projects or add an interest above. This is where you’ll see what takes shape."}
                      </p>
                    )}
                    {shown.map((interest) => (
                      <div key={interest.id} className="profile-interest">
                        <div className="profile-interest-top">
                          <strong>{interest.value}</strong>
                          <span>
                            {interest.score.toFixed(1)}
                            <small>/12</small>
                          </span>
                        </div>
                        <progress
                          max={12}
                          value={interest.score}
                          aria-label={`${interest.value}: ${interest.score.toFixed(1)} / 12`}
                        />
                        <div className="profile-interest-source">
                          <span>
                            {facetNames[interest.facet][language]} ·{" "}
                            {interest.preference
                              ? de
                                ? "von dir gewählt"
                                : "you chose this"
                              : de
                                ? "abgeleitet"
                                : "inferred"}
                          </span>
                          <select
                            aria-label={`${de ? "Präferenz für" : "Preference for"} ${interest.value}`}
                            value={interest.preference ?? "auto"}
                            onChange={(event) =>
                              s.choose(
                                interest.id,
                                event.target.value as
                                  | "auto"
                                  | "exclude"
                                  | "interested"
                                  | "priority",
                              )
                            }
                          >
                            <option value="auto">
                              {de ? "Automatisch" : "Automatic"}
                            </option>
                            <option value="exclude">
                              {de ? "Nicht relevant" : "Not relevant"}
                            </option>
                            <option value="interested">
                              {de ? "Interessiert" : "Interested"}
                            </option>
                            <option value="priority">
                              {de ? "Besonders wichtig" : "A priority"}
                            </option>
                          </select>
                        </div>
                        <details className="profile-reasons">
                          <summary>
                            {de
                              ? "Warum dieses Interesse?"
                              : "Why this interest?"}
                          </summary>
                          <p>
                            {de
                              ? `Abgeleiteter Wert: ${interest.inferredScore.toFixed(2)}. Deine Auswahl hat Vorrang.`
                              : `Inferred score: ${interest.inferredScore.toFixed(2)}. Your choice takes priority.`}
                          </p>
                          {!!interest.evidence.length && (
                            <p>
                              {de
                                ? "Jüngste Beiträge zum Wert:"
                                : "Most recent contributions:"}
                            </p>
                          )}
                          {interest.evidence
                            .slice(-4)
                            .reverse()
                            .map(({ signal, points }) => (
                              <p key={signal.id}>
                                {signalNames[signal.kind][language]} ·{" "}
                                {subjectName(signal, s.catalog!)}{" "}
                                <b>+{points.toFixed(2)}</b>
                              </p>
                            ))}
                          {!interest.evidence.length && (
                            <p>
                              {de
                                ? "Von dir hinzugefügt; keine Verhaltenssignale."
                                : "Added by you; no behavioural evidence."}
                            </p>
                          )}
                        </details>
                      </div>
                    ))}
                  </>
                )}
                {tab === "activity" && (
                  <>
                    <p className="profile-section-note">
                      {de
                        ? "Was passiert ist und wie es zählt. Keine Mausbewegungen, Suchtexte oder Formularinhalte."
                        : "What happened and how it counts. No pointer trails, search text or form contents."}
                    </p>
                    {!s.profile.signals.length && (
                      <p className="profile-empty">
                        {de
                          ? "Dein nächster Schritt wird hier sichtbar."
                          : "Your next interaction will appear here."}
                      </p>
                    )}
                    {[...s.profile.signals]
                      .reverse()
                      .slice(0, 30)
                      .map((signal) => (
                        <div className="profile-signal" key={signal.id}>
                          <span
                            className="profile-signal-marker"
                            aria-hidden="true"
                          >
                            {signal.kind === "preference_changed" ? "✳" : "+"}
                          </span>
                          <div>
                            <strong>
                              {signalNames[signal.kind][language]}
                            </strong>
                            <p>{subjectName(signal, s.catalog!)}</p>
                            <small>
                              {signal.kind === "preference_changed"
                                ? `${signal.previous} → ${signal.preference} · ${de ? "zuvor abgeleitet" : "prior inference"}: ${signal.inferredScore?.toFixed(2)}`
                                : `${SIGNAL_WEIGHTS[signal.kind]} ${de ? "Punkte je Dimension" : "points per dimension"}`}
                            </small>
                          </div>
                        </div>
                      ))}
                  </>
                )}
                {tab === "suggestions" && (
                  <>
                    <p className="profile-section-note">
                      {de
                        ? "Projekte passend zu deinen Interessen. Deine Filter und die normale Projektliste bleiben unter deiner Kontrolle."
                        : "Projects that connect with your interests. Your filters and the main project list stay under your control."}
                    </p>
                    {!recommendations.length && (
                      <p className="profile-empty">
                        {de
                          ? "Mit den ersten Interessen erscheinen hier begründete Vorschläge."
                          : "Your first interests will give us something to recommend, with reasons."}
                      </p>
                    )}
                    {recommendations.map(({ project, reasons }) => (
                      <Link
                        key={project.id}
                        prefetch={false}
                        className="profile-recommendation"
                        href={project.href}
                        onClick={() =>
                          recordVisitorInteraction(
                            "recommendation_opened",
                            project.id,
                          )
                        }
                      >
                        <span>{de ? "Passend zu" : "Connects with"}</span>
                        <strong>{project.name} ↗</strong>
                        <p>{reasons.map((r) => r.value).join(" · ")}</p>
                      </Link>
                    ))}
                  </>
                )}
              </div>
              <div
                className="profile-live-status"
                role="status"
                aria-live="polite"
              >
                {announcement ||
                  (de
                    ? "Bereit für deinen nächsten Schritt."
                    : "Ready for your next interaction.")}
              </div>
              <details className="profile-settings">
                <summary>
                  {de ? "Deine Daten & Spielregeln" : "Your data & the rules"}
                  <span>
                    {s.sharing
                      ? de
                        ? "geteilt"
                        : "sharing"
                      : de
                        ? "nur lokal"
                        : "local only"}
                  </span>
                </summary>
                <label>
                  <input
                    type="checkbox"
                    checked={s.remember}
                    onChange={(event) => s.setRemember(event.target.checked)}
                  />
                  {de
                    ? "Interessen auf diesem Gerät merken (30 Tage)"
                    : "Remember interests on this device (30 days)"}
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
                  {de
                    ? "Signale und Korrekturen mit Alexander teilen"
                    : "Share signals and corrections with Alexander"}
                </label>
                <p>
                  {de
                    ? "Teilen übermittelt öffentliche Projektkategorien, Interaktionstypen und deine Korrekturen mit einer zufälligen Browserkennung für 30 Tage. Keine Kontaktdaten. Erst neue Aktionen nach deiner Einwilligung werden geteilt."
                    : "Sharing sends public project dimensions, interaction types and your corrections with a random browser identifier for 30 days. No contact details. Only new actions after you opt in are shared."}
                </p>
                {!s.catalog?.sharingAvailable && (
                  <p>
                    {de
                      ? "Teilen ist aktuell nicht verfügbar."
                      : "Sharing is currently unavailable."}
                  </p>
                )}
                <p>
                  {de
                    ? "Filter: 6 Punkte. Projekt öffnen: 2. Leistung ansehen: 3. 15 Sekunden aktive Lesezeit: 1. Punkte werden je Dimension auf die Tags verteilt. Gleiche Aktionen zählen einmal pro 30 Minuten. Abgeleitete Werte halbieren sich in 7 Tagen und sind auf 12 begrenzt. Deine Auswahl hat Vorrang. Diese Startgewichte sind Annahmen, keine Wahrscheinlichkeiten."
                    : "Filter: 6 points. Project open: 2. Service visit: 3. 15 seconds of active reading: 1. Points split across tags within each dimension. Repeats count once per 30 minutes. Inferred scores halve in 7 days and cap at 12. Your choices take priority. These initial weights are hypotheses, not probabilities."}
                </p>
                <div className="profile-settings-actions">
                  <button onClick={() => void s.reset()}>
                    {de ? "Interessen zurücksetzen" : "Reset interests"}
                  </button>
                  <button onClick={() => void s.stop()}>
                    {de ? "Profil stoppen & löschen" : "Stop & clear profile"}
                  </button>
                </div>
                <Link href={de ? "/de/datenschutz" : "/en/privacy"}>
                  {de ? "Datenschutzerklärung ↗" : "Privacy notice ↗"}
                </Link>
              </details>
            </>
          )}
          {s.storageFailed && (
            <p className="profile-error" role="status">
              {de
                ? "Browserspeicher ist nicht verfügbar. Das Profil bleibt in diesem Tab."
                : "Browser storage is unavailable. The profile stays in this tab."}
            </p>
          )}
          {s.network === "error" && (
            <p className="profile-error" role="status">
              {de
                ? "Teilen fehlgeschlagen; deine lokalen Interessen funktionieren weiter."
                : "Sharing failed; your local interests still work."}{" "}
              <button onClick={() => void s.flush()}>
                {de ? "Erneut versuchen" : "Retry"}
              </button>
            </p>
          )}
          {s.network === "delete-error" && (
            <p className="profile-error" role="alert">
              {de
                ? "Teilen gestoppt. Geteilte Daten konnten noch nicht gelöscht werden. Ein Schlüssel für einen erneuten Versuch bleibt bis zur Bestätigung, höchstens 31 Tage, auf diesem Gerät."
                : "Sharing stopped. Shared data could not yet be erased. A retry key stays on this device until confirmed, for up to 31 days."}{" "}
              <button onClick={() => void s.deleteShared()}>
                {de ? "Löschen wiederholen" : "Retry erasure"}
              </button>
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
