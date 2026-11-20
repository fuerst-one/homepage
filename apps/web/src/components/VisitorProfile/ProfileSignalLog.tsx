"use client";

import { useState } from "react";
import {
  SIGNAL_WEIGHTS,
  type ProfileCatalog,
  type ProfileSignal,
} from "@homepage/content/visitorProfile";
import {
  preferenceNames,
  signalLogPage,
  signalNames,
  subjectName,
} from "./profilePresentation";

export function ProfileSignalLog({
  signals,
  catalog,
  locale,
}: {
  signals: ProfileSignal[];
  catalog: ProfileCatalog;
  locale: "en" | "de";
}) {
  const de = locale === "de",
    language = de ? 1 : 0;
  const [requestedPage, setPage] = useState(0);
  const { entries, page, pages } = signalLogPage(signals, requestedPage);
  const weight = (signal: ProfileSignal) => {
    if (signal.kind === "preference_changed")
      return `${preferenceNames[signal.previous ?? "auto"][language]} → ${preferenceNames[signal.preference ?? "auto"][language]} · ${signal.inferredScore?.toFixed(2) ?? "–"}`;
    const points = SIGNAL_WEIGHTS[signal.kind];
    return points > 0 ? `+${points}` : String(points);
  };
  const time = new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
  });
  return (
    <>
      <ol className="profile-signal-list">
        {entries.map((signal) => (
          <li key={signal.id} className="profile-signal">
            <strong>{signalNames[signal.kind][language]}</strong>
            <span className="profile-signal-subject">
              {subjectName(signal, catalog, locale)}
            </span>
            <span className="profile-signal-weight">{weight(signal)}</span>
            <time dateTime={new Date(signal.at).toISOString()}>
              {time.format(signal.at)}
            </time>
          </li>
        ))}
      </ol>
      {pages > 1 && (
        <nav
          className="profile-signal-pages"
          aria-label={de ? "Seiten der Signale" : "Signal pages"}
        >
          <button
            type="button"
            className="profile-text-button"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            ← {de ? "Neuere" : "Newer"}
          </button>
          <span aria-live="polite">
            {de
              ? `Seite ${page + 1} von ${pages}`
              : `Page ${page + 1} of ${pages}`}
          </span>
          <button
            type="button"
            className="profile-text-button"
            disabled={page === pages - 1}
            onClick={() => setPage(page + 1)}
          >
            {de ? "Ältere" : "Older"} →
          </button>
        </nav>
      )}
    </>
  );
}
