"use client";

import type {
  ProfileCatalog,
  ProfileInterest,
  ProfilePreference,
} from "@homepage/content/visitorProfile";
import type { CSSProperties } from "react";
import {
  MAX_PROFILE_SCORE,
  facetHues,
  facetNames,
  termLabel,
  preferenceNames,
  signalNames,
  subjectName,
} from "./profilePresentation";

const SHOWN_EVIDENCE = 8;

export function ProfileInterestDetail({
  interest,
  catalog,
  locale,
  onChoose,
}: {
  interest: ProfileInterest;
  catalog: ProfileCatalog;
  locale: "en" | "de";
  onChoose: (id: string, preference: ProfilePreference | "auto") => void;
}) {
  const de = locale === "de",
    language = de ? 1 : 0,
    label = termLabel(interest, locale);
  const evidence = interest.evidence.slice(-SHOWN_EVIDENCE).reverse();
  return (
    <article
      className="profile-interest-detail"
      aria-labelledby="profile-interest-detail-title"
      style={{ "--facet-hue": facetHues[interest.facet] } as CSSProperties}
    >
      <p className="profile-page-eyebrow">
        {facetNames[interest.facet][language]} ·{" "}
        {interest.preference
          ? de
            ? "von dir gewählt"
            : "you chose this"
          : de
            ? "abgeleitet"
            : "inferred"}
      </p>
      <div className="profile-interest-top">
        <h3 id="profile-interest-detail-title">{label}</h3>
        <span>
          {interest.score.toFixed(1)}
          <small>/{MAX_PROFILE_SCORE}</small>
        </span>
      </div>
      <progress
        max={MAX_PROFILE_SCORE}
        value={interest.score}
        aria-label={`${label}: ${interest.score.toFixed(1)} / ${MAX_PROFILE_SCORE}`}
      />
      <label className="profile-interest-preference">
        {de ? "Deine Auswahl" : "Your choice"}
        <select
          aria-label={`${de ? "Präferenz für" : "Preference for"} ${label}`}
          value={interest.preference ?? "auto"}
          onChange={(event) =>
            onChoose(
              interest.id,
              event.target.value as ProfilePreference | "auto",
            )
          }
        >
          {(["auto", "exclude", "interested", "priority"] as const).map(
            (preference) => (
              <option key={preference} value={preference}>
                {preferenceNames[preference][language]}
              </option>
            ),
          )}
        </select>
      </label>
      <div className="profile-reasons">
        <h4>{de ? "Warum dieses Interesse?" : "Why this interest?"}</h4>
        <p>
          {de
            ? `Abgeleiteter Wert: ${interest.inferredScore.toFixed(2)}. Deine Auswahl hat Vorrang.`
            : `Inferred score: ${interest.inferredScore.toFixed(2)}. Your choice takes priority.`}
        </p>
        {evidence.length ? (
          <ol>
            {evidence.map(({ signal, points, pattern }) => (
              <li key={`${signal.id}:${pattern ?? "event"}`}>
                <span>
                  {pattern
                    ? de
                      ? "Gemeinsamer Bedarf in mehreren Projekten"
                      : "Shared need across projects"
                    : signalNames[signal.kind][language]}{" "}
                  · {subjectName(signal, catalog, locale)}
                </span>
                <b>+{points.toFixed(2)}</b>
              </li>
            ))}
          </ol>
        ) : (
          <p>
            {interest.preference
              ? de
                ? "Von dir hinzugefügt; keine Verhaltenssignale."
                : "Added by you; no behavioural evidence."
              : de
                ? "Noch keine Signale für dieses Interesse."
                : "No signals for this interest yet."}
          </p>
        )}
        {interest.evidence.length > SHOWN_EVIDENCE && (
          <p>
            {de
              ? `Die ${SHOWN_EVIDENCE} jüngsten von ${interest.evidence.length} Beiträgen.`
              : `The latest ${SHOWN_EVIDENCE} of ${interest.evidence.length} contributions.`}
          </p>
        )}
      </div>
    </article>
  );
}
