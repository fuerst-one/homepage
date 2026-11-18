"use client";

import { useState } from "react";
import {
  adjacentGitHubMonth,
  githubCommitBand,
  type GitHubCalendarMonth,
  type GitHubCalendarYear,
} from "@homepage/content/githubCalendar";
import type { Locale } from "@homepage/content/i18n";

export function GitHubCommitLegend({ locale }: { locale: Locale }) {
  return (
    <div
      className="home-commit-legend"
      aria-label={
        locale === "de"
          ? "Commits pro Monat, Farbstufen"
          : "Commits per month, colour bands"
      }
    >
      {["0", "1–2", "3–7", "8–24", "25+"].map((label, band) => (
        <span key={label}>
          <i
            className="home-commit-square"
            data-band={band}
            aria-hidden="true"
          />
          {label}
        </span>
      ))}
    </div>
  );
}

export function GitHubCalendar({
  years,
  locale,
}: {
  years: GitHubCalendarYear[];
  locale: Locale;
}) {
  const de = locale === "de";
  const [active, setActive] = useState<GitHubCalendarMonth | null>(null);
  const recorded = years
    .flatMap((year) => year.months)
    .filter((month) => month.commits !== null);
  const [focusedMonth, setFocusedMonth] = useState(recorded[0]?.month ?? "");
  const entryMonth = recorded.some((month) => month.month === focusedMonth)
    ? focusedMonth
    : recorded[0]?.month;
  const numbers = new Intl.NumberFormat(locale);
  const monthName = new Intl.DateTimeFormat(de ? "de-DE" : "en-GB", {
    month: "long",
    timeZone: "UTC",
  });
  const dates = new Intl.DateTimeFormat(de ? "de-DE" : "en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const dateLabel = (month: string) =>
    dates.format(new Date(`${month}-01T00:00:00Z`));
  const row = (year: GitHubCalendarYear) => (
    <div className="home-commit-row" role="row" key={year.year}>
      <span className="home-commit-year" role="rowheader">
        {year.year}
      </span>
      {year.months.map((cell) => (
        <div key={cell.month} role="gridcell" className="home-commit-cell">
          {cell.commits === null ? (
            <span
              className="home-commit-square is-unrecorded"
              aria-label={`${dateLabel(cell.month)}: ${de ? "außerhalb des erfassten Zeitraums" : "outside the recorded period"}`}
            />
          ) : (
            <button
              type="button"
              className="home-commit-square"
              data-band={githubCommitBand(cell.commits)}
              data-month={cell.month}
              tabIndex={cell.month === entryMonth ? 0 : -1}
              aria-label={`${dateLabel(cell.month)}: ${numbers.format(cell.commits)} ${de ? "Commits" : cell.commits === 1 ? "commit" : "commits"}`}
              onPointerEnter={() => setActive(cell)}
              onFocus={() => {
                setActive(cell);
                setFocusedMonth(cell.month);
              }}
              onClick={() => setActive(cell)}
              onBlur={() => setActive(null)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setActive(null);
                const offsets: Record<string, number> = {
                  ArrowLeft: -1,
                  ArrowRight: 1,
                  ArrowUp: -12,
                  ArrowDown: 12,
                };
                const offset = offsets[event.key];
                if (offset !== undefined) {
                  event.preventDefault();
                  const target = adjacentGitHubMonth(years, cell.month, offset);
                  event.currentTarget
                    .closest(".home-commit-matrix")
                    ?.querySelector<HTMLButtonElement>(
                      `button[data-month="${target}"]`,
                    )
                    ?.focus();
                }
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
  return (
    <div
      className="home-commit-calendar"
      onPointerLeave={() => setActive(null)}
    >
      <div className="home-commit-scroll">
        <div
          className="home-commit-matrix"
          role="grid"
          aria-label={
            de
              ? "Erfasste GitHub-Commits nach Jahr und Monat"
              : "Recorded GitHub commits by year and month"
          }
        >
          <div className="home-commit-row home-commit-months" role="row">
            <span role="columnheader">
              <span className="sr-only">{de ? "Jahr" : "Year"}</span>
            </span>
            {Array.from({ length: 12 }, (_, index) => {
              const name = monthName.format(new Date(Date.UTC(2020, index, 1)));
              return (
                <span role="columnheader" aria-label={name} key={index}>
                  {name.slice(0, 1)}
                </span>
              );
            })}
          </div>
          <div role="rowgroup">{years.map(row)}</div>
        </div>
      </div>
      <p className="home-commit-tooltip" aria-live="polite" aria-atomic="true">
        {active &&
          `${dateLabel(active.month)} · ${numbers.format(active.commits!)} ${de ? "Commits" : active.commits === 1 ? "commit" : "commits"}`}
      </p>
    </div>
  );
}
