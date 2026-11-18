import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const subject = () =>
  loadTs(new URL("../packages/content/src/githubActivity.ts", import.meta.url));
const sha = (n) => n.toString(16).padStart(40, "0");
test("GitHub aggregates unique authored commits across public, private and fork histories", () => {
  const { aggregateGitHubActivity } = subject();
  const result = aggregateGitHubActivity(
    [
      {
        id: 1,
        private: true,
        commits: [
          { sha: sha(1), date: "2026-01-01T01:00:00Z" },
          { sha: sha(2), date: "2026-03-02T12:00:00Z" },
        ],
      },
      {
        id: 2,
        private: false,
        commits: [{ sha: sha(1), date: "2026-01-01T01:00:00Z" }],
      },
    ],
    "fuerst-one",
    "2026-03-20T12:00:00Z",
  );
  assert.equal(result.totalCommits, 2);
  assert.equal(result.repositoryCount, 2);
  assert.equal(result.includesPrivate, true);
  assert.deepEqual(result.months, [
    { month: "2026-01", commits: 1, cumulative: 1 },
    { month: "2026-02", commits: 0, cumulative: 1 },
    { month: "2026-03", commits: 1, cumulative: 2 },
  ]);
  assert.doesNotMatch(JSON.stringify(result), new RegExp(sha(1)));
});
test("malformed and future commit timestamps cannot inflate public totals", () => {
  const { aggregateGitHubActivity } = subject();
  assert.equal(
    aggregateGitHubActivity(
      [
        {
          id: 1,
          private: false,
          commits: [
            { sha: "bad", date: "2026-01-01" },
            { sha: sha(1), date: "invalid" },
            { sha: sha(2), date: "2027-01-01T00:00:00Z" },
          ],
        },
      ],
      "fuerst-one",
      "2026-03-20T12:00:00Z",
    ).totalCommits,
    0,
  );
});
test("public GitHub parser rejects inconsistent aggregates and drops source-only fields", () => {
  const { readGitHubActivity, aggregateGitHubActivity } = subject();
  const good = aggregateGitHubActivity(
    [],
    "fuerst-one",
    "2026-03-20T12:00:00Z",
  );
  assert.equal(
    readGitHubActivity({ ...good, token: "secret", repositories: ["private"] })
      .token,
    undefined,
  );
  assert.equal(readGitHubActivity({ ...good, totalCommits: 2 }), null);
  assert.equal(readGitHubActivity({ ...good, login: "<script>" }), null);
});
