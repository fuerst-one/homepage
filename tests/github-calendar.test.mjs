import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const subject = () =>
  loadTs(new URL("../packages/content/src/githubCalendar.ts", import.meta.url));

test("calendar distinguishes recorded zero months from months outside coverage", () => {
  const { githubCalendarYears } = subject();
  const years = githubCalendarYears([
    { month: "2020-11", commits: 2 },
    { month: "2020-12", commits: 0 },
    { month: "2021-01", commits: 7 },
  ]);
  assert.deepEqual(
    years.map((row) => row.year),
    [2020, 2021],
  );
  assert.equal(years[0].months.length, 12);
  assert.deepEqual(
    [years[0].months[9], years[0].months[10], years[0].months[11]].map(
      ({ month, commits }) => ({ month, commits }),
    ),
    [
      { month: "2020-10", commits: null },
      { month: "2020-11", commits: 2 },
      { month: "2020-12", commits: 0 },
    ],
  );
  assert.equal(years[1].months[1].commits, null);
});

test("calendar grows by calendar year without inventing missing commit figures", () => {
  const { githubCalendarYears } = subject();
  const years = githubCalendarYears([
    { month: "2020-12", commits: 3 },
    { month: "2022-01", commits: 4 },
  ]);
  assert.deepEqual(
    years.map((row) => row.year),
    [2020, 2021, 2022],
  );
  assert.ok(years[1].months.every((month) => month.commits === null));
  assert.deepEqual(githubCalendarYears([]), []);
});

test("commit intensity caps at 25 while the calendar retains exact counts", () => {
  const { githubCommitBand, githubCalendarYears } = subject();
  assert.deepEqual(
    [0, 1, 2, 3, 7, 8, 24, 25, 734].map(githubCommitBand),
    [0, 1, 1, 2, 2, 3, 3, 4, 4],
  );
  assert.equal(
    githubCalendarYears([{ month: "2026-02", commits: 734 }])[0].months[1]
      .commits,
    734,
  );
});

test("keyboard calendar movement crosses year boundaries and stays within recorded months", () => {
  const { githubCalendarYears, adjacentGitHubMonth } = subject();
  const years = githubCalendarYears([
    { month: "2021-12", commits: 1 },
    { month: "2022-01", commits: 0 },
    { month: "2022-12", commits: 2 },
  ]);
  assert.equal(adjacentGitHubMonth(years, "2022-01", -1), "2021-12");
  assert.equal(adjacentGitHubMonth(years, "2021-12", 12), "2022-12");
  assert.equal(adjacentGitHubMonth(years, "2021-12", -1), "2021-12");
  assert.equal(adjacentGitHubMonth(years, "2022-01", 1), "2022-01");
});

test("calendar months carry their active projects, also outside recorded commit coverage", () => {
  const { githubCalendarYears } = subject();
  const [year] = githubCalendarYears(
    [{ month: "2020-11", commits: 2 }],
    [
      { month: "2020-10", projects: [{ label: "Early client" }] },
      {
        month: "2020-11",
        projects: [{ label: "Early client" }, { label: "Side project" }],
      },
    ],
  );
  assert.deepEqual(year.months[9], {
    month: "2020-10",
    commits: null,
    projects: [{ label: "Early client" }],
  });
  assert.deepEqual(year.months[10].projects, [
    { label: "Early client" },
    { label: "Side project" },
  ]);
  assert.deepEqual(year.months[11], {
    month: "2020-12",
    commits: null,
    projects: [],
  });
});

test("keyboard calendar movement reaches unrecorded months that have active projects", () => {
  const { githubCalendarYears, adjacentGitHubMonth } = subject();
  const years = githubCalendarYears(
    [{ month: "2020-11", commits: 2 }],
    [{ month: "2020-10", projects: [{ label: "Early client" }] }],
  );
  assert.equal(adjacentGitHubMonth(years, "2020-11", -1), "2020-10");
  assert.equal(adjacentGitHubMonth(years, "2020-10", -1), "2020-10");
  assert.equal(adjacentGitHubMonth(years, "2020-11", 1), "2020-11");
});
