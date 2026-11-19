# Homepage GitHub activity

The sync worker reads GitHub; the website reads the public aggregate in PostgreSQL.
The credential belongs only to `homepage-knowledge-sync` in Coolify. Vercel does not
need it. Use a fine-grained token for the intended repository owner and all desired
repositories, with Contents read-only and Metadata read-only. A token limited to
selected repositories publishes only that accessible set.

Set `GITHUB_TOKEN` as a runtime-only, literal environment value in Coolify. Exclude
it from build-time variables and never use a `NEXT_PUBLIC_` name. A saved environment
change takes effect at the worker's next restart/deployment. Alex saved the rotated
token on 18 November 2026; its value was not read back. Existing local credentials
may need updating independently after a rotation.

## Counting contract

- Count commits authored by the authenticated GitHub account, on currently
  accessible repositories' default branches. Include private repositories, forks
  and archived repositories when the token can read them.
- Deduplicate SHAs across repositories. Count author timestamps by UTC month and
  fill zero-commit months between the first commit and the publication month.
- Each scan is pinned to a default-branch SHA. An unchanged head can reuse history
  for seven days; a changed head or weekly reconciliation rescans that repository.
- Empty repositories contribute zero commits. Repository removal or a branch rewrite
  is reconciled in the next successful complete inventory. Historical deleted
  repositories, inaccessible work, unmatched author identities and other branches
  are outside this count. It is not GitHub's contributions-calendar metric.
- The worker checks every minute and refreshes at most hourly. A failed refresh
  preserves the previous aggregate and waits an hour before retrying.

The raw `github_worker_snapshots` table contains repository identifiers and
SHA/date history. The web role cannot read it. The separate `public_github_activity`
table contains only the account name, scope, refresh timestamp, repository count,
private-work flag, total commits and monthly/cumulative counts. Its reader applies
an explicit allowlist. Publishing both tables is atomic and fenced by the worker's
renewed database lease.

The homepage renders monthly counts as a Jan–Dec matrix, with one row per year.
Colour intensity saturates at 25 commits (bands 0, 1–2, 3–7, 8–24, 25+), while
hover, focus and tap open a card with the exact value and the projects whose
recorded period overlaps that month. Hatched cells fall outside recorded coverage;
neutral cells are recorded zero months. Arrow keys move between months that have a
commit figure or active projects. The project-history chart lists the same projects
in its tooltip. Project lists come from the public project model's dates, not from
commit attribution.

In the card, a star marks projects with `hasConnectedRepo: false`, with a one-line
note that they are not in the connected repositories. A square carries the star
only when it is a recorded zero-commit month with such a project, so an apparently
idle month shows that work happened elsewhere; the legend explains it. Months with
commits are not starred, because long-running off-GitHub work would mark nearly
all of them. While the flag is unknown nothing is marked.

## Project repositories

Notion projects name their code in two properties. `Github-URL` is the single link
shown on the site. `GitHub Repos` is a worker-only text property listing every
repository behind the project, one `owner/name` or GitHub URL per line; it may
contain private repositories and is never published.

When the website publication is prepared, the worker checks both against its own
GitHub inventory (`github_worker_snapshots`):

- A `github.com` link in `Github-URL` is published only when the inventory lists
  that repository as public. Private, renamed, deleted and unconnected repositories
  are withheld. The check uses the repository the URL resolves to, so path tricks
  such as `/public/repo/../private` do not pass, and `github.com` subdomains (for
  example gists) are withheld. The published link is rebuilt as
  `https://github.com/<inventory name>`, so deeper paths, queries and fragments
  from Notion are dropped. Links to other code hosts are published unchanged.
- Each project gets the public boolean `hasConnectedRepo`: true when any repository
  from either property is in the inventory. Without an inventory (no token, first
  run) the flag is omitted and GitHub links are withheld, so "unknown" is never
  published as "no repository".

The website publication refreshes at most every five minutes, so a visibility change
reaches the site after the next hourly GitHub collection.

## Release order

Production preparation on 18 November 2026: a custom-format database backup was
saved on the database host at
`/root/homepage-release-backups/2026-11-18-home-work-before.dump`. The migration
was applied transactionally. Permission checks confirmed that `homepage_app`
can read the public aggregate, cannot read raw GitHub history, and
`homepage_indexer` can write the worker snapshot. Deployment and the first
production collection are verified separately after the release push.

1. Apply `packages/database/migrations/011-github-activity.sql` using the migration
   owner role. The additive migration is rerunnable and grants the existing app and
   indexer roles their respective read/write permissions.
2. Deploy the updated worker with its runtime credential. Its regular loop collects
   activity independently of website, enquiry, Malt and AI maintenance.
3. Check the aggregate with the status command, then deploy the website. If the web
   release precedes the migration/initial collection, it displays an explicit
   pending state rather than a fabricated zero.

From a configured checkout:

```sh
pnpm github:migrate
pnpm github:sync
pnpm github:status
```

These root commands load the ignored `.env.local`. Inside a deployed worker with
runtime environment already set, use `node --import tsx scripts/github.ts status`
or `sync`. Use the migration-owner connection for `migrate`, rather than expanding
the runtime role's privileges. `sync` bypasses the normal freshness interval but
still respects a failure cooldown and other workers' active leases. Status outputs
only aggregate metadata, never repository names or token values.

## Local acceptance, 18 November 2026

The first real collection published 2,510 unique authored commits across 36 connected
repositories, including private work, at `2026-11-18T12:43:23.081Z`. Subsequent token
rotation has not been followed by a production collector run in this task.

The 404-test suite and 29 database integration checks pass. The database runner
uses a dedicated local database ending in `_test`; it includes the GitHub tests
alongside the shared Notion/Malt snapshot regressions. Reviews covered correctness,
security, code quality and UI. Browser acceptance covers two languages, map/list
selection, optional 3D, phone layouts and the simplified charts without monthly
drilldown or time-range controls. Monthly values remain available to assistive
technology through visually hidden tables. A later 13-test calendar/activity/
portfolio regression set passed, including four new calendar behavior tests.

Validation logs are under `/private/tmp/`: `home-work-tests-fixed.log`,
`home-work-db-final.log`, `home-work-build-final.log`,
`home-work-types-complete.log`, `home-work-lint-final.log` and
`home-work-format-final.log`. Screenshots are in
`/private/tmp/homepage-landing-review-2026-11-18/`.
