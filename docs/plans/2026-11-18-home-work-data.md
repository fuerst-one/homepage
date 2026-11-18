# Landing page: selected work and portfolio data

Approved 18 November 2026. Order: hero, profile and its existing actions, selected
work and portfolio data, enquiry choices and rate, repeated actions, footer.

## Implementation

- [x] Derive a small public homepage model from the current publication: curated
      cases, named client-challenge/industry groups, and monthly starts/engagements.
- [x] Replace the initial categorical landscape with the merged Explorer. Reuse
      its four perspectives, 3D/2D/network views, project picker and contextual links.
      Load the embedded explorer near the viewport and keep the enquiry at the end.
- [x] Add selected project stories, live portfolio figures and monthly charts in
      both languages, matching the existing dark monospace design.
- [x] Add private worker-side GitHub history ingestion and a separate public
      aggregate. Count unique authored SHAs on default branches across accessible
      repositories, including private repositories and forks. Never publish repository
      names, messages, identities or raw commits. Preserve successful data on failure.
- [x] Wire the collector into an independent worker loop and maintenance CLI.
- [x] Verify behavior, PostgreSQL access boundaries, build/types, and desktop/mobile
      interaction. Review the scoped changes and resolve actionable findings.

## Definitions and boundaries

Monthly engagement means a recorded project period overlaps a calendar month; it
does not measure hours or prove continuous work. Only explicitly in-progress
projects without an end extend to the current month. Historical dates do not
establish when a present-day skill tag was learned. Outcomes retain their source
wording and measurement/estimate qualification.

Explorer uses its existing fitted project models; coordinates approximate the
relationships described by each perspective and are not skill ratings. The
homepage and standalone Explorer share the same renderer and published-data
projection, including localized destinations and current screenshots. If a project
is no longer public, its records, connections and cached matrix rows/columns are
removed together without changing the remaining coordinates.

On 18 November Alex chose to add reusable project-list data views now, then replace
the current landscape with Experience Atlas after its final polish. The homepage
now shows capabilities, industries and methods using the sidebar's shared counting
helper and treemap presentation. Charts show up to 12 common categories; the
equivalent category links include every category and open the full matching
directory, including non-featured projects. Counts describe projects, not hours;
memberships can overlap. Both languages use the current public publication.

After Explorer was merged into main at `8e65bc1`, Alex requested its integration.
The embedded component omits the standalone introduction and enquiry section,
preserves URL project/lens/view state, and keeps the server-rendered heading and
standalone link. Owner embedding experiment controls stay disabled on the homepage.
Both deferred loading stages keep a localized placeholder; visitors without
JavaScript get a project-directory link. No atlas-worktree files were changed.

GitHub uses the authenticated account's linked author identity. Each repository's
default-branch head pins its history scan. Unchanged heads reuse private cached
history for up to seven days; changed heads and weekly reconciliation scan that
repository's complete authored history. A publication is replaced only after the
entire inventory succeeds.
Public counts describe currently accessible repositories and default-branch
history, not deleted repositories or every historical branch.

Alex's final UI adjustment retains only engagement periods and removes time-range
sliders and monthly drilldown controls. Project history keeps its monthly bars.
GitHub activity uses a calendar matrix with Jan–Dec columns and one row per year.
The colour bands are 0, 1–2, 3–7, 8–24 and 25+; exact monthly counts remain
available on hover, focus or tap. Arrow keys navigate recorded months. Missing
coverage is distinct from recorded zero. Month targets stay at 24px, with contained
horizontal scrolling on narrow screens. Both chart areas share the same height.
Screen-reader tables retain access to values without visible extra controls.
Explorer perspectives and the shared map/project-picker selection remain available.

Seabo's GitLab work is explained below the GitHub matrix, linked to its public
case and using the project's recorded engagement dates (July 2021–July 2026).
It is not mapped to presumed GitHub gaps or added to GitHub commit totals.

No deployment is included. Existing unrelated changes are preserved. The first
local publication contains 2,510 authored commits across 36 accessible repositories,
including private work, as of 18 November 2026. Alex rotated the credential and
saved its replacement in Coolify; the accidental Vercel production copy was removed.
Coolify's token is runtime-only and excluded from builds. No credential is stored
in tracked files or requested through chat.

## Validation

- 404 unit/HTTP tests passed, including collector pagination, SHA deduplication,
  branch reconciliation, empty repositories, locale provenance and worker scheduling.
- Four calendar behavior tests passed; the 13-test calendar/activity/portfolio
  regression set covers missing coverage, colour bands and keyboard movement.
- The 21-test facet/filter/portfolio regression set passed after adding the sidebar
  views. It covers category deduplication and locale-aware links to non-featured
  matching projects, including category names with punctuation.
- Facet browser checks verified 22 UX-design results, 14 prototyping results and
  seven maritime results through the German category link. Keyboard category-list
  navigation and 320/390px layouts passed without document overflow. The current
  data-view build, types, lint and format checks passed; logs use the
  `/private/tmp/home-project-views-` prefix.
- Explorer integration passed 31 scoped behavior and production HTTP-route checks,
  including current-public eligibility, coordinate/matrix alignment, localization
  and the standalone routes. Build, workspace types, scoped lint and formatting
  passed. Browser checks cover desktop 3D/2D, selection across perspectives,
  project navigation and history restoration, German language switching and
  320/390px widths without document overflow. Logs use `/private/tmp/home-explorer-`.
- 29 PostgreSQL integration checks passed, including raw-history access exclusion,
  lease fencing, atomic publication and retaining prior data after failure.
- Production build and workspace typecheck passed. Scoped lint has no errors;
  two image warnings follow the existing lazy-loaded screenshot pattern.
- Browser checks cover English/German, desktop and 320/390px widths, theme filters,
  list selection, optional WebGL rendering and simplified chart controls.
- Independent bugs, security, quality and UI reviews completed; actionable findings
  were resolved. Final build verification is recorded in the companion runbook.

Operational setup and release order: [GitHub activity](../github-activity.md).
