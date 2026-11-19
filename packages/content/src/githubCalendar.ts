import type { GitHubMonth } from "./githubActivity";
import type { TimelineMonth, TimelineProject } from "./workPortfolio";

export type GitHubCalendarMonth = {
  month: string;
  commits: number | null;
  projects: TimelineProject[];
};
export type GitHubCalendarYear = {
  year: number;
  months: GitHubCalendarMonth[];
};

/** Missing coverage and future months stay distinct from recorded zero activity. */
export function githubCalendarYears(
  months: Pick<GitHubMonth, "month" | "commits">[],
  timeline: TimelineMonth[] = [],
): GitHubCalendarYear[] {
  if (!months.length) return [];
  const counts = new Map(months.map((row) => [row.month, row.commits]));
  const projects = new Map(timeline.map((row) => [row.month, row.projects]));
  const first = Number(months[0].month.slice(0, 4));
  const last = Number(months.at(-1)!.month.slice(0, 4));
  return Array.from({ length: last - first + 1 }, (_, index) => {
    const year = first + index;
    return {
      year,
      months: Array.from({ length: 12 }, (_, monthIndex) => {
        const month = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
        return {
          month,
          commits: counts.get(month) ?? null,
          projects: projects.get(month) ?? [],
        };
      }),
    };
  });
}

/** Stable bands across all years; the highest tint begins at 25 monthly commits. */
export function githubCommitBand(commits: number): 0 | 1 | 2 | 3 | 4 {
  if (commits === 0) return 0;
  if (commits <= 2) return 1;
  if (commits <= 7) return 2;
  if (commits <= 24) return 3;
  return 4;
}

/** Months with a commit figure or active projects have something to show. */
export function hasCalendarDetail(cell: GitHubCalendarMonth) {
  return cell.commits !== null || cell.projects.length > 0;
}

export function hasWorkOutsideGitHub(cell: GitHubCalendarMonth) {
  return cell.projects.some((project) => project.outsideGitHub);
}

/** Without a mark, a zero-commit month with work elsewhere reads as idle. */
export function marksWorkOutsideGitHub(cell: GitHubCalendarMonth) {
  return cell.commits === 0 && hasWorkOutsideGitHub(cell);
}

export function adjacentGitHubMonth(
  years: GitHubCalendarYear[],
  month: string,
  offset: number,
): string {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  const target = date.toISOString().slice(0, 7);
  return years.some((year) =>
    year.months.some(
      (cell) => cell.month === target && hasCalendarDetail(cell),
    ),
  )
    ? target
    : month;
}
