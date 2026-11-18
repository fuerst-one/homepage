"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PROFILE_FACETS,
  SIGNAL_WEIGHTS,
  recommendProfileProjects,
  type ProfileFacet,
  type ProfilePreference,
} from "@homepage/content/visitorProfile";
import {
  PROFILE_PIXEL_LEVELS,
  profilePixelCapacity,
} from "@homepage/content/profilePixels";
import { useLocale } from "../i18n/LocaleProvider";
import Link from "../i18n/LocalizedLink";
import { Button } from "../Button";
import { ProfileInsights } from "./ProfileInsights";
import { ProfilePixelGrid } from "./ProfilePixelGrid";
import {
  useVisitorProfileStore as useProfile,
  recordVisitorInteraction,
} from "./profileStore";
import { useProfileSnapshot } from "./useProfileSnapshot";
import { facetNames, signalNames, subjectName } from "./profilePresentation";
import "./visitor-profile.css";

export default function VisitorProfilePage() {
  const locale = useLocale(),
    de = locale === "de",
    language = de ? 1 : 0;
  const s = useProfile();
  const { interests, snapshotAt } = useProfileSnapshot();
  const searchRef = useRef<HTMLInputElement>(null);
  const privacyTitleRef = useRef<HTMLHeadingElement>(null);
  const [announcement, setAnnouncement] = useState("");
  const [facet, setFacet] = useState<ProfileFacet | "all">("all");
  const [query, setQuery] = useState("");
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
  const shown = interests.filter((t) => facet === "all" || t.facet === facet);
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

  return (
    <div className="profile-page" data-profile-ui>
      <section
        className="profile-summary"
        aria-label={de ? "Dein aktuelles Profil" : "Your current profile"}
      >
        {s.enabled ? (
          <div className="profile-page-signature">
            <ProfilePixelGrid />
          </div>
        ) : (
          <div className="profile-page-off" aria-hidden="true">
            <span>?</span>
          </div>
        )}
        <div className="profile-summary-copy">
          <p className="profile-page-eyebrow">
            {s.enabled
              ? de
                ? "Live in diesem Browser"
                : "Live in this browser"
              : de
                ? "Du entscheidest, wann es losgeht"
                : "You decide when it starts"}
          </p>
          <h2 className="text-2xl tracking-tight text-white">
            {s.enabled
              ? de
                ? "Ein Bild deiner Interessen."
                : "A picture of your interests."
              : de
                ? "Noch kein Profil erstellt."
                : "No profile generated yet."}
          </h2>
          <p className="content-reading text-sm leading-relaxed text-neutral-300">
            {s.enabled
              ? de
                ? "Dein Pixelbild fasst die aktuellen Interessenswerte zusammen. Darunter findest du jede Vermutung, ihre Grundlage und deine eigenen Entscheidungen. Du kannst jederzeit korrigieren, zurücksetzen oder stoppen."
                : "Your pixel signature summarises the current interest scores. Below, you can inspect every inference, its evidence and your own choices. Correct it, reset it or stop at any time."
              : de
                ? "Wenn du startest, werden Projekttiefe, gelesene Abschnitte, Bildbetrachtung, Beleglinks, Leistungsdetails, Explorer-Auswahl, gewählte Themen und dein Projektfeedback zu sichtbaren Signalen. Dein Profil und deine Auswahl werden für spätere Besuche 30 Tage lokal in diesem Browser gespeichert. Teilen bleibt eine separate, freiwillige Option."
                : "When you start, project depth, section reading, image exploration, proof links, service details, explorer choices, selected topics and your project feedback become visible signals. Your profile and choices are saved locally in this browser for 30 days, ready for your next visit. Sharing is a separate, optional choice."}
          </p>
          <div className="profile-summary-actions">
            {s.enabled ? (
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
            ) : (
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
          {s.catalogLoading && (
            <p role="status" className="text-sm text-neutral-400">
              {de
                ? "Projektkategorien werden geladen…"
                : "Loading project dimensions…"}
            </p>
          )}
          {s.catalogFailed && (
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

      <nav
        className="profile-page-nav"
        aria-label={de ? "Auf dieser Seite" : "On this page"}
      >
        <a href="#interests">{de ? "Interessen" : "Interests"}</a>
        <a href="#project-choices">{de ? "Merkliste" : "Shortlist"}</a>
        <a href="#patterns">{de ? "Muster" : "Patterns"}</a>
        <a href="#suggestions">{de ? "Für dich" : "For you"}</a>
        <a href="#activity">{de ? "Signale" : "Signals"}</a>
        <a href="#how-it-works">{de ? "So funktioniert es" : "How it works"}</a>
        <a href="#profile-privacy">
          {de ? "Daten & Einstellungen" : "Data & settings"}
        </a>
      </nav>

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
              {de ? "Deine Interessen" : "Your interests"}
            </h2>
          </div>
          <span>
            {active} {de ? "aktiv" : "active"}
          </span>
        </div>
        <p className="profile-section-intro">
          {de
            ? "Die Werte sind nachvollziehbare Annahmen, keine Wahrscheinlichkeiten. Deine manuelle Auswahl hat immer Vorrang. Öffne die Begründung, um die konkreten Beiträge zu sehen."
            : "These scores are inspectable hypotheses, not probabilities. Your manual choice always takes priority. Expand the evidence to see the actual contributions."}
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
                {de ? "Alle" : "All"}
              </button>
              {PROFILE_FACETS.map((f) => (
                <button
                  type="button"
                  key={f}
                  aria-pressed={facet === f}
                  onClick={() => setFacet(f)}
                >
                  {facetNames[f][language]}
                </button>
              ))}
            </div>
            <label className="profile-search-label">
              {de ? "Interesse selbst hinzufügen" : "Add an interest yourself"}
              <input
                type="search"
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  de ? "z. B. Prototyping, React…" : "e.g. Prototyping, React…"
                }
              />
            </label>
            <p className="sr-only" role="status">
              {announcement}
            </p>
            {query.trim() && (
              <div className="profile-search-results">
                {matches.length ? (
                  matches.map((term) => (
                    <button
                      type="button"
                      key={term.id}
                      onClick={() => {
                        s.choose(term.id, "interested");
                        setQuery("");
                        setAnnouncement(
                          de
                            ? `${term.value} hinzugefügt.`
                            : `${term.value} added.`,
                        );
                        searchRef.current?.focus();
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
            <div className="profile-interest-grid">
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
                          event.target.value as ProfilePreference | "auto",
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
                      {de ? "Warum dieses Interesse?" : "Why this interest?"}
                    </summary>
                    <p>
                      {de
                        ? `Abgeleiteter Wert: ${interest.inferredScore.toFixed(2)}. Deine Auswahl hat Vorrang.`
                        : `Inferred score: ${interest.inferredScore.toFixed(2)}. Your choice takes priority.`}
                    </p>
                    {interest.evidence
                      .slice(-4)
                      .reverse()
                      .map(({ signal, points, pattern }) => (
                        <p key={`${signal.id}:${pattern ?? "event"}`}>
                          {pattern
                            ? de
                              ? "Gemeinsamer Bedarf in mehreren Projekten"
                              : "Shared need across projects"
                            : signalNames[signal.kind][language]}{" "}
                          · {subjectName(signal, s.catalog!, locale)}{" "}
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
            </div>
          </>
        ) : (
          <p className="profile-empty">
            {de
              ? "Deine Interessen erscheinen hier, sobald du die Profilgenerierung startest."
              : "Your interests appear here once you start profile generation."}
          </p>
        )}
      </section>

      <ProfileInsights />

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
        <div ref={recommendationsRef} className="profile-recommendation-grid">
          {recommendations.map(({ project, reasons, affinity, feedback }) => (
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
                  recordVisitorInteraction("recommendation_opened", project.id)
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
          ))}
        </div>
        {!recommendations.length && (
          <p className="profile-empty">
            {de
              ? "Mit den ersten Interessen erscheinen hier begründete Vorschläge."
              : "Your first interests will give us something to recommend, with reasons."}
          </p>
        )}
      </section>

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
          <span>{s.enabled ? s.profile.signals.length : 0}</span>
        </div>
        <p className="profile-section-intro">
          {de
            ? "Interaktionen und Korrekturen aus diesem Profil. Die letzten 30 Einträge werden angezeigt; lokal bleiben höchstens 240 erhalten. Suchtexte, Formularinhalte und Mausbewegungen gehören nicht dazu."
            : "Interactions and corrections from this profile. Showing the latest 30 entries; the local history keeps up to 240. Search text, form contents and pointer trails are excluded."}
        </p>
        {!s.enabled || !s.profile.signals.length ? (
          <p className="profile-empty">
            {de
              ? "Dein nächster Schritt wird hier sichtbar, sobald das Profil aktiv ist."
              : "Your next interaction will appear here while the profile is active."}
          </p>
        ) : (
          <ol className="profile-signal-list">
            {[...s.profile.signals]
              .reverse()
              .slice(0, 30)
              .map((signal) => (
                <li key={signal.id} className="profile-signal">
                  <div>
                    <strong>{signalNames[signal.kind][language]}</strong>
                    <p>{subjectName(signal, s.catalog!, locale)}</p>
                    <small>
                      {signal.kind === "preference_changed"
                        ? `${signal.previous} → ${signal.preference} · ${de ? "zuvor abgeleitet" : "prior inference"}: ${signal.inferredScore?.toFixed(2)}`
                        : `${SIGNAL_WEIGHTS[signal.kind]} ${de ? "Startgewicht · Obergrenzen und Kategorienzuordnung gelten" : "starting weight · caps and facet attribution apply"}`}
                    </small>
                  </div>
                  <time dateTime={new Date(signal.at).toISOString()}>
                    {new Date(signal.at).toLocaleString(locale)}
                  </time>
                </li>
              ))}
          </ol>
        )}
      </section>

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
                  {de ? "Konkretes Angebot ansehen" : "View a focused offer"}
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
                <dt>{de ? "Thema bewusst wählen" : "Choose a search topic"}</dt>
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
                ? "Die Farbflächen zeigen grobe Interessensbereiche: Grün für Entwicklung und Hardware, Blau für KI und Daten, Pink für UX und Forschung, Orange für Geschäft und Umsetzung. Ihre Größe folgt deinen Werten für Bedarf, Kompetenzen und Methoden. Die Schattierungen kodieren alle Interessenswerte, einschließlich Tools, Branchen und Formaten. Mehrere Werte teilen sich einen Pixel."
                : "Colour regions show broad interest families: green for engineering and hardware, blue for AI and data, pink for UX and research, orange for business and delivery. Their size follows your needs, capabilities and methods. The shades encode every interest score, including tools, sectors and formats. Several scores share a pixel."}
            </p>
            <p>
              {de
                ? "Schwarze und weiße Muster in drei Ecken markieren die Orientierung. Die Farbbereiche haben keine reservierten Mindestflächen: Ein Farbton kann bei fehlendem Interesse vollständig verschwinden. Ohne Signale in Bedarf, Kompetenzen oder Methoden starten die vier Bereiche gleich groß. Ungenutzter Speicher liegt gebündelt bei den Ecken."
                : "Black-and-white patterns in three corners mark orientation. Colour regions have no reserved minimum area: a hue can disappear when there is no interest in that family. Without signals in needs, capabilities or methods, the four regions start equally. Unused capacity gathers near the corners."}
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
            <h2 id="profile-privacy-title" ref={privacyTitleRef} tabIndex={-1}>
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
                onChange={(event) => void s.setSharing(event.target.checked)}
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
          {de ? "Vollständige Datenschutzerklärung ↗" : "Full privacy notice ↗"}
        </Link>
      </section>
    </div>
  );
}
