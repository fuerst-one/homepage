# Live visitor profile

Open **Your live profile** on any page, then **Start my live profile** on the
localized `/profile` page. Once enabled, the floating entry becomes a 60px pixel
signature. Clicking it opens the dedicated page with interests, evidence, manual
preferences, recent signals, matching projects and data settings. The same page
is reachable from the footer's Privacy settings. English and German UI and privacy
text are included. The fixed entry adds no space after the footer and moves above it while the footer is visible.

The page uses the site's shared Layout, content surface, typography, buttons and
localized links. It is excluded from indexing. Capture/restore and delivery remain
mounted across client navigation; the profile page itself does not add interest
points.

Capture and local persistence start together after the explicit opt-in. Profiles
and manual choices restore on later visits and expire 30 days after their start.
Remembering can be switched off to remove stored profile data and continue in
this tab until reload. Sharing remains a separate, optional choice. No account, contact details, typed
queries, form text, pointer trails, third-party SDK or paid AI is involved.

## Rules v2

The pure model is `packages/content/src/visitorProfile.ts`; additional public-subject
rules and derived patterns are in `visitorProfileSignals.ts`. The browser protocol
and stored profile remain version 1 for compatibility, while shared events record
rule version 2. Public project dimensions remain the only term source.

- Preview +2, details +3 and case-study open +4 are a progression: only the strongest
  depth contributes for a project within 30 minutes. Active project reading adds +1
  after 15 visible, focused, recently active seconds.
- Section reading adds +2 only to its relevant facets: outcomes → buyer needs,
  architecture → capabilities/tools, process → methods, delivery → stages. Explicit
  bilingual heading classification leaves unknown headings unclassified. Duplicate
  annotations cannot accelerate the 15-second threshold. Covered/hidden sections
  do not count.
- Explicit filters and fixed topic choices add +6. Deliberately selected Explorer
  cluster terms add +4; lens/cluster context is zero-weight. Selecting a lens again
  after another lens preserves the latest chosen perspective. Default views, hover,
  panning and zooming do not create interests.
- General service/collaboration pages add +3; focused offers add +4. Active reading
  of fixed service sections is zero-weight evidence for process, deliverables,
  commercial information and collaboration. Related-project links add +2 only to
  reviewed needs and methods shared by both public projects.
- Exploring several gallery images or enlarging them, opening GitHub/live proof,
  and returning to a project after at least one day affect project affinity, not
  topic scores. Gallery enlargement preserves the selected image. Affinity decays
  with the same seven-day half-life and caps at 3.
- Reading distinct projects with a shared buyer need in the last seven days adds
  one +2 boost to that need. Merely opening case studies does not qualify. Other
  inspectable patterns describe proof preferences, returns, the latest Explorer
  lens and an ordered case-study → collaboration → enquiry journey within 30
  minutes. They do not infer identity or occupation and do not add topic points.

Within each facet, points divide across its matching tags. Repeated kind/subject
pairs count at most once per 30 minutes, except editable project choices and lens
transitions. Inferred scores have a seven-day half-life and a ceiling of 12.
Manual term choices override inference: excluded = 0, interested = 6, priority = 12,
automatic = the underlying evidence. Corrections retain their previous inference
and contributing signal kinds. Weights are hypotheses, not probabilities.

### Saving and related work

Project cards have no profile-action buttons. The preview overlay footer groups a
heart-only Save control and a More like this link on the right on desktop, below
the existing links on narrower screens. The heart has an accessible name, pressed
state and a viewport-clamped tooltip. Before profile opt-in it leads to the profile
onboarding. More like this works as navigation regardless of profiling: it closes
the overlay and opens the project's `#related-projects` section. When profiling is
active it also records positive project feedback. Neither action opts visitors in
implicitly.

The profile page collects saved public projects with heart controls for removal;
removing the last row returns keyboard focus to the section heading and announces
the change. Saved state and positive feedback are independent and survive bounded
history truncation and remembered-tab reconciliation. Removed public projects are
not restored. Negative project feedback is retired; old negative choices restore
as automatic and their retired events are dropped without losing saved projects.

Suggestions combine facet-normalized topical matches, bounded project affinity
and positive project feedback, respecting manual term exclusions. Explicit search
and filter results keep their normal order. Recommendation impressions and clicks
are separate zero-weight events; the destination supplies the project-depth signal.
Enquiry start and successful submission are zero-weight funnel events; form content
and receipt IDs never enter the profile.

The local history keeps at most 240 signals. Manual choices remain authoritative
when old activity drops out. Unsent signals persist only when remembering is enabled,
and sharing starts with new actions after its separate opt-in. Earlier local actions
are not backfilled. Page exit attempts bounded keepalive delivery.

## Pixel signature

`packages/content/src/profilePixels.ts` encodes every catalog term, sorted by ID,
into 128 quantized levels (seven bits per score). The full precision model remains
authoritative. The current 168-term catalog fits a 12×12 grid. Seventeen fixed
black-and-white pixels in three corners identify orientation. The top-left marker
is 3×3; the top-right and bottom-left markers are 2×2 with different patterns.
There are no reserved minimum areas or fixed corner pixels for any coloured hue.
The image uses orange, brand lime, blue and pink, with saturation 50–82% and
lightness 36–72%. Each hue has 4,096 distinct RGB shades, carrying 12 bits per cell.

Hue areas summarize quantized needs, capabilities and methods: green for
engineering/hardware, blue for AI/data, pink for UX/research, orange for
business/delivery and unclassified terms within those facets. Without signals in
these facets, the areas start equally. A hue can disappear entirely when its
family has no interest. The entire non-marker area is allocated proportionally and
assigned near stable corner anchors using minimum-cost assignment. The last
layout is cached by grid size and hue counts. Every catalog field, including
tools and sectors, is encoded independently in the shades.

Payload positions fill from the centre out in a deterministic order. Spare cells
form corner pockets instead of a blank strip. At 168 fields, 72 format/checksum
bits plus 1,176 score bits leave 276 bits (23 whole cells) unused. The 12×12 format
supports 207 fields at 128 levels, leaving room for 39 additional fields. The
shared SVG renders at 60px in the floating entry and 192px on the profile page.

The payload includes a version, term count, catalog fingerprint and checksum.
Decoding validates those and padding against the matching catalog. The grid grows
for catalogs that exceed its capacity rather than dropping terms. The same score
levels and catalog produce the same image, independent of catalog input order.
Decoding requires exact RGB values; this is not a camera-scannable code. The image
contains the quantized interest scores, without a browser identifier or activity
history. Sharing an image therefore shares those scores.

## Owner insights

Apply the additive migration as database owner before deploying collection:

```sh
node --env-file=.env.local --import tsx scripts/profile-insights.mjs migrate
```

The catalog exposes whether collection is available. Local personalisation works
when collection is unavailable, and its sharing checkbox is disabled. After
migration, visitors may separately opt into sharing _subsequent_ actions; earlier
local activity is not backfilled. The API requires same-origin JSON, limits body
size and batch size, accepts only public subjects and a current sharing receipt,
rate-limits requests, and deduplicates event UUIDs. The database stores only a
SHA-256 hash of a random 256-bit browser secret, never the secret itself.

Run the report locally with database access:

```sh
node --env-file=.env.local --import tsx scripts/profile-insights.mjs report
```

It returns counts by event and selected interest, manual corrections grouped by
previous choice and prior inferred score, correction feedback by contributing
signal type, and browser profiles with reported enquiries. There is no public report
endpoint. A browser key can span visits if remembering is enabled; counts denote
browser profiles, not unique people or independently verified enquiries. Data is
consent-selected and client-reported and can be missing, blocked or fabricated.

Shared events are excluded from reports after 30 days and removed by the existing
sync worker's independent daily maintenance loop or a collection write. The report
command also prunes. For manual maintenance:

```sh
node --env-file=.env.local --import tsx scripts/profile-insights.mjs prune
```

Deploy the sync worker with the web app for scheduled pruning. Disabling sharing,
resetting or stopping requests erasure using the browser secret. Per-secret
transaction locks and revocation tombstones prevent in-flight posts recreating
erased events. Tombstones expire after 31 days and are removed at the next cleanup.
Failed erasure is visible with a retry control and local recovery keys for each
outstanding erasure, retained until acknowledgement or 31 days until next use.
Recovery survives reload; if browser storage is unavailable, keep the tab open to
retry. Clearing
browser data first loses its erasure key, so the normal server retention applies.

## Validation

Unit behaviour: `node --test tests/visitor-profile.test.mjs tests/visitor-profile-signals.test.mjs tests/visitor-profile-reading.test.mjs tests/visitor-profile-store.test.mjs tests/profile-pixels.test.mjs`.
Database integration uses `tests/visitor-profile-db.integration.mjs` with an
explicit localhost database whose name ends `_test`; it never targets production.
Browser behavior uses `SEO_TEST_BASE_URL=http://localhost:6895 node --test tests/visitor-profile-signals.browser.mjs`.
HTTP behaviour uses `SEO_TEST_BASE_URL=http://localhost:6894 node --test tests/visitor-profile-http.test.mjs`
against the local migrated database. The profile-page HTTP test also checks EN/DE rendering and noindex metadata. Browser acceptance covers the live signature across navigation, explicit filters, project evidence, manual corrections, remembering, sharing and erasure, footer clearance, responsive spacing and keyboard controls.

### Extended-signal acceptance (18 November 2026)

The final local suite passed 698 tests, plus four isolated database integration
checks and the real-browser rich-signal journey. The production build, TypeScript,
scoped lint and formatting passed. Independent reviews rechecked fixes for strict
compound-subject validation, duplicate reading annotations, lens transitions,
related-link capture, modal navigation races, gallery selection and mobile layout.
The active feature worktree is `/private/tmp/homepage-profile-signals`; the preview
is on port 6895. This is local validation, not a production release.
