"use client";

import type { CSSProperties } from "react";
import { githubCalendarYears } from "@homepage/content/githubCalendar";
import { GitHubCalendar, GitHubCommitLegend } from "./GitHubCalendar";
import dynamic from "next/dynamic";
import type { PortfolioMonth } from "@homepage/content/workPortfolio";
import type { GitHubActivity } from "@homepage/content/githubActivity";
import type { Locale } from "@homepage/content/i18n";
import { DeferredWorkView } from "./DeferredWorkView";
import Link from "../i18n/LocalizedLink";
const Chart = dynamic(() => import("./WorkTimelineChart"), {
  ssr: false,
  loading: () => (
    <div className="home-work-loading" role="status">
      Loading…
    </div>
  ),
});

export function WorkTimeline({
  months,
  projectCount,
  seabo,
  github,
  locale,
}: {
  months: PortfolioMonth[];
  projectCount: number;
  seabo: { href: string; startDate: string; endDate: string | null } | null;
  github: GitHubActivity | null;
  locale: Locale;
}) {
  const de = locale === "de";
  const calendar = githubCalendarYears(github?.months ?? []);
  const chartStyle = {
    "--home-history-chart-height": `${Math.max(270, (calendar.length + 1) * 26 + 48)}px`,
  } as CSSProperties;
  const periodDate = (date: string) =>
    new Intl.DateTimeFormat(de ? "de-DE" : "en-GB", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(date));
  const peak = Math.max(0, ...months.map((m) => m.engagements.length));
  return (
    <div className="home-work-history" style={chartStyle}>
      <header className="home-work-heading">
        <div>
          <p className="home-work-kicker">
            03 / {de ? "Über die Jahre" : "Across the years"}
          </p>
          <h3>
            {de
              ? "Eine Praxis, die weiter wächst."
              : "A practice that keeps evolving."}
          </h3>
        </div>
        <p>
          {de
            ? "Projekte beginnen, wachsen und verändern sich. Ein Blick auf die erfassten Projektzeiträume und die Arbeit am Code."
            : "Projects start, grow and change. A look at recorded project periods and the work in code."}
        </p>
      </header>
      <div className="home-history-grid">
        <section
          className="home-history-panel"
          aria-labelledby="project-history-title"
        >
          <header>
            <h4 id="project-history-title">
              {de ? "Projektverlauf" : "Project history"}
            </h4>
            <span>
              {months[0]?.month.slice(0, 4)} —{" "}
              {months.at(-1)?.month.slice(0, 4)}
            </span>
          </header>
          <div className="home-history-total">
            <strong>
              {new Intl.NumberFormat(locale).format(projectCount)}
            </strong>
            <span>{de ? "dokumentierte Projekte" : "documented projects"}</span>
          </div>
          <p className="home-history-measure">
            {de ? "Projektzeiträume" : "Engagement periods"}
          </p>
          <div
            className="home-history-chart"
            role="img"
            aria-details="project-history-data"
            aria-label={
              de
                ? `Monatliche Projektzeiträume von ${months[0]?.month} bis ${months.at(-1)?.month}. Höchster Monatswert: ${peak} Projekte.`
                : `Monthly engagement periods from ${months[0]?.month} to ${months.at(-1)?.month}. Highest monthly count: ${peak} projects.`
            }
          >
            <DeferredWorkView>
              <Chart
                rows={months.map((m) => ({
                  month: m.month,
                  count: m.engagements.length,
                }))}
                locale={locale}
              />
            </DeferredWorkView>
          </div>
          <AccessibleChartData
            id="project-history-data"
            caption={
              de ? "Monatliche Projektzeiträume" : "Monthly engagement periods"
            }
            rows={months.map((m) => ({
              month: m.month,
              count: m.engagements.length,
            }))}
            locale={locale}
          />
          <div className="home-history-notes home-work-map-note">
            <p>
              {de
                ? "Jeder Monat zählt Projekte mit überlappenden, erfassten Zeiträumen. Das sind keine Arbeitsstunden oder Nachweise durchgehender monatlicher Tätigkeit."
                : "Engagement periods count projects whose recorded dates overlap the month. They do not measure hours or confirm continuous monthly activity."}
            </p>
          </div>
        </section>
        <section
          className="home-history-panel"
          aria-labelledby="github-history-title"
        >
          <header>
            <h4 id="github-history-title">
              {de ? "GitHub-Aktivität" : "GitHub activity"}
            </h4>
            <a
              href="https://github.com/fuerst-one"
              target="_blank"
              rel="noreferrer"
            >
              GitHub ↗
            </a>
          </header>
          {github ? (
            <>
              <div className="home-history-total">
                <strong>
                  {new Intl.NumberFormat(locale).format(github.totalCommits)}
                </strong>
                <span>
                  {de
                    ? "eigene Commits auf GitHub"
                    : "authored commits on GitHub"}
                </span>
              </div>
              <GitHubCommitLegend locale={locale} />
              <div
                className="home-history-chart home-history-calendar"
                aria-details="github-history-data"
              >
                <GitHubCalendar years={calendar} locale={locale} />
              </div>
              <AccessibleChartData
                id="github-history-data"
                caption={
                  de ? "Monatliche GitHub-Commits" : "Monthly GitHub commits"
                }
                rows={github.months.map((m) => ({
                  month: m.month,
                  count: m.commits,
                }))}
                locale={locale}
              />
              <div className="home-history-notes home-work-map-note">
                {seabo && (
                  <p className="home-commit-client-work">
                    <Link prefetch={false} href={seabo.href}>
                      <strong>Seabo</strong> ·{" "}
                      <time dateTime={seabo.startDate}>
                        {periodDate(seabo.startDate)}
                      </time>{" "}
                      –{" "}
                      {seabo.endDate ? (
                        <time dateTime={seabo.endDate}>
                          {periodDate(seabo.endDate)}
                        </time>
                      ) : de ? (
                        "heute"
                      ) : (
                        "present"
                      )}{" "}
                      ↗
                    </Link>
                    <span>
                      {de
                        ? "Produktentwicklung auf GitLab. Diese Arbeit ist in den GitHub-Zahlen nicht enthalten."
                        : "Client product development on GitLab. This work is additional to the GitHub figures."}
                    </span>
                  </p>
                )}
                <p>
                  {de
                    ? `${github.repositoryCount} verbundene Repositories${github.includesPrivate ? ", einschließlich privater" : ""}. Eigene Commits auf den Standard-Branches, über Repositories hinweg dedupliziert. Monatswerte in UTC.`
                    : `${github.repositoryCount} connected repositories${github.includesPrivate ? ", including private work" : ""}. My authored commits on default branches, deduplicated across repositories. Monthly values use UTC.`}
                </p>
                <p>
                  {de
                    ? "Letzte erfolgreiche Synchronisierung: "
                    : "Last successful sync: "}
                  <time dateTime={github.refreshedAt}>
                    {new Intl.DateTimeFormat(de ? "de-DE" : "en-GB", {
                      dateStyle: "medium",
                      timeZone: "Europe/Berlin",
                    }).format(new Date(github.refreshedAt))}
                  </time>
                </p>
              </div>
            </>
          ) : (
            <div className="home-github-pending">
              <span className="home-work-kicker">GitHub</span>
              <h5>
                {de
                  ? "Die Geschichte hinter dem Code."
                  : "The history behind the code."}
              </h5>
              <p>
                {de
                  ? "Commit-Zahlen erscheinen nach der ersten erfolgreichen GitHub-Synchronisierung. Öffentliche und private Arbeit wird dabei ausschließlich als zusammengefasste Statistik veröffentlicht."
                  : "Commit figures will appear after the first successful GitHub sync. Public and private work is published here only as an aggregate."}
              </p>
              <a
                href="https://github.com/fuerst-one"
                target="_blank"
                rel="noreferrer"
                className="home-work-text-link"
              >
                {de ? "GitHub-Profil ansehen" : "Explore my GitHub profile"} ↗
              </a>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/** Keeps the time series available to assistive technology without extra controls. */
function AccessibleChartData({
  id,
  caption,
  rows,
  locale,
}: {
  id: string;
  caption: string;
  rows: { month: string; count: number }[];
  locale: Locale;
}) {
  const format = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return (
    <div className="sr-only">
      <table id={id}>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{locale === "de" ? "Monat" : "Month"}</th>
            <th scope="col">{locale === "de" ? "Anzahl" : "Count"}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.month}>
              <th scope="row">
                {format.format(new Date(`${row.month}-01T00:00:00Z`))}
              </th>
              <td>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
