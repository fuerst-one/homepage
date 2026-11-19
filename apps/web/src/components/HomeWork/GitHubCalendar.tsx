"use client";

import { useState, type SyntheticEvent } from "react";
import {
  adjacentGitHubMonth,
  githubCommitBand,
  hasCalendarDetail,
  hasWorkOutsideGitHub,
  type GitHubCalendarMonth,
  type GitHubCalendarYear,
} from "@homepage/content/githubCalendar";
import type { Locale } from "@homepage/content/i18n";

const OUTSIDE_MARK = "★";

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
  const [active, setActive] = useState<{
    cell: GitHubCalendarMonth;
    anchor: TooltipAnchor;
  } | null>(null);
  const detailed = years
    .flatMap((year) => year.months)
    .filter(hasCalendarDetail);
  const [focusedMonth, setFocusedMonth] = useState(detailed[0]?.month ?? "");
  const entryMonth = detailed.some((month) => month.month === focusedMonth)
    ? focusedMonth
    : detailed[0]?.month;
  const show = (
    cell: GitHubCalendarMonth,
    event: SyntheticEvent<HTMLElement>,
  ) => setActive({ cell, anchor: tooltipAnchor(event.currentTarget) });
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
  const commitLabel = (commits: number | null) =>
    commits === null
      ? de
        ? "außerhalb des erfassten Zeitraums"
        : "outside the recorded period"
      : `${numbers.format(commits)} ${de ? "Commits" : commits === 1 ? "commit" : "commits"}`;
  const projectsHeading = de ? "Aktive Projekte" : "Active projects";
  const outsideHeading = de
    ? "Außerhalb dieser Repositories"
    : "Outside these repositories";
  const cellLabel = (cell: GitHubCalendarMonth) => {
    const names = (projects: typeof cell.projects) =>
      projects.map((project) => project.label).join(", ");
    const outside = cell.projects.filter((project) => project.outsideGitHub);
    return [
      `${dateLabel(cell.month)}: ${commitLabel(cell.commits)}`,
      ...(cell.projects.length
        ? [`${projectsHeading}: ${names(cell.projects)}`]
        : []),
      ...(outside.length ? [`${outsideHeading}: ${names(outside)}`] : []),
    ].join(". ");
  };
  const row = (year: GitHubCalendarYear) => (
    <div className="home-commit-row" role="row" key={year.year}>
      <span className="home-commit-year" role="rowheader">
        {year.year}
      </span>
      {year.months.map((cell) => (
        <div key={cell.month} role="gridcell" className="home-commit-cell">
          {hasCalendarDetail(cell) ? (
            <button
              type="button"
              className={
                cell.commits === null
                  ? "home-commit-square is-unrecorded"
                  : "home-commit-square"
              }
              data-band={
                cell.commits === null
                  ? undefined
                  : githubCommitBand(cell.commits)
              }
              data-month={cell.month}
              tabIndex={cell.month === entryMonth ? 0 : -1}
              aria-label={cellLabel(cell)}
              onPointerEnter={(event) => show(cell, event)}
              onFocus={(event) => {
                show(cell, event);
                setFocusedMonth(cell.month);
              }}
              onClick={(event) => show(cell, event)}
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
          ) : (
            <span
              className="home-commit-square is-unrecorded"
              aria-label={cellLabel(cell)}
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
      {active && (
        // The focused square's aria-label already carries this content.
        <div
          className="home-commit-tooltip"
          aria-hidden="true"
          data-side={active.anchor.side}
          data-align={active.anchor.align}
          style={{ left: active.anchor.x, top: active.anchor.y }}
        >
          <strong>{dateLabel(active.cell.month)}</strong>
          <span>{commitLabel(active.cell.commits)}</span>
          {active.cell.projects.length > 0 && (
            <>
              <em>{projectsHeading}</em>
              <ul>
                {active.cell.projects.map((project, index) => (
                  // Two projects may share a short name.
                  <li key={`${index}-${project.label}`}>
                    {project.outsideGitHub && `${OUTSIDE_MARK} `}
                    {project.label}
                  </li>
                ))}
              </ul>
              {hasWorkOutsideGitHub(active.cell) && (
                <small>
                  {OUTSIDE_MARK}{" "}
                  {de
                    ? "nicht in den verbundenen Repositories"
                    : "not in the connected repositories"}
                </small>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

type TooltipAnchor = {
  x: number;
  y: number;
  side: "above" | "below";
  align: "start" | "center" | "end";
};

/** Opens towards the calendar's centre so the card stays inside its panel. */
function tooltipAnchor(square: HTMLElement): TooltipAnchor {
  const calendar = square.closest<HTMLElement>(".home-commit-calendar");
  const cell = square.getBoundingClientRect();
  const frame = calendar?.getBoundingClientRect() ?? cell;
  const centre = cell.left + cell.width / 2 - frame.left;
  const above = cell.top + cell.height / 2 > frame.top + frame.height / 2;
  const third = frame.width / 3;
  return {
    x: centre,
    y: (above ? cell.top : cell.bottom) - frame.top,
    side: above ? "above" : "below",
    align: centre < third ? "start" : centre > 2 * third ? "end" : "center",
  };
}
