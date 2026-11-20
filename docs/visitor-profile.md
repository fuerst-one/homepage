# Live visitor profile

Open **Your live profile** on any page, then **Start my live profile** on the
localized `/profile` page. Once enabled, the floating entry becomes a 60px pixel
signature. Clicking it opens the dedicated page with interests, evidence, manual
preferences, recent signals, matching projects and data settings. The same page
is reachable from the footer's Privacy settings. English and German UI and privacy
text are included. The fixed entry adds no space after the footer and moves above it while the footer is visible.

From 1240px viewport width the pixel signature fits beside the project dialog and
stays in view above a dialog's backdrop, so it can be seen reacting to actions
inside the dialog. It is inert there like the rest of the page: a click on it
closes the dialog. On narrower viewports, and under the full-screen image view, it
stays behind the backdrop.

The page uses the site's shared Layout, content surface, typography, buttons and
localized links. It is excluded from indexing. Capture/restore and delivery remain
mounted across client navigation; the profile page itself does not add interest
points.

A saved profile can only be restored once the catalog has arrived. Until then the
page shows a loading state in the layout of the finished profile: the summary copy,
a placeholder for the signature and stand-ins for the statistics and the first
interests. An inline script in the server HTML checks browser storage for a saved
profile before the first paint and marks the page with `data-profile-loading`; the
store's `loading` field takes over after hydration and for client navigation.
Visitors without a saved profile get the start state unchanged, also without
JavaScript.

Capture and local persistence start together after the explicit opt-in. Profiles
and manual choices restore on later visits and expire 30 days after their start.
Remembering can be switched off to remove stored profile data and continue in
this tab until reload. Sharing remains a separate, optional choice. No account, contact details, typed
queries, form text, pointer trails, third-party SDK or paid AI is involved.

## Rules v2

The pure model is `packages/content/src/visitorProfile.ts`; additional public-subject
rules and derived patterns are in `visitorProfileSignals.ts`. The browser protocol
and stored profile remain version 1 for compatibility. Public project dimensions
remain the only term source. [Rules v3](#rules-v3) changes what clicks and project
pages credit; everything else here still applies.

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

## View tracker

One listener, `useRichProfileSignals` with `createProfileViewTracker`
(`profileViewTracker.ts`), measures every tagged element once a second and
whenever the page or a dialog scrolls or resizes. Tags name where, never what:
`data-profile-section`, `data-profile-service-section`, `data-profile-project`
and `data-profile-region` (`card:<project>`, `project:<project>|needs`,
`project:<project>|details`). For each tag it holds, in memory only, how long
the element has been continuously in view, its seconds in view and how many of
those were active (visible, focused, recently used tab). Sections keep their
in-view rule (enough visible height, nothing covering them); a region is in view
when at least half of it, or half the viewport if it is taller, is visible, the
tab is visible and no dialog covers it. Section reading, service-section reading
and "project read" are read from the tracker. `profileRegionTerms` in
`visitorProfileSignals.ts` says which public terms a region displays: a card its
industries, product types and first two buyer needs (`CARD_BUYER_NEED_COUNT`);
the needs block all buyer needs; the details table industries, product types,
capabilities, methods and tools.

Cards show their product types in the meta line and their first two buyer needs
as filter links; the project page and the preview dialog list every buyer need
below the screenshots. A click on a need link is a filter choice.

## Rules v3

Shared events record rule version 3. A signal may carry a `strength` of 0.5,
0.75 or 1 (absent means 1); it earns its weight times its strength, and the
strongest-depth rule per project compares weight times strength. Saved profiles
without strength restore unchanged; restore and the sharing API accept strength
only with those values and only on the kinds that can carry it.

- **Card click** (`project_card_clicked`, +2): a click on a card's own link, its
  thumbnail or its case-study pill credits what the card displays, nothing
  else. Strength from the card's continuous time in view: under 0.5 s no signal,
  0.5–3 s half, from 3 s full (`profileClickLevel`). Card clicks while the list
  shows typed search results, and landing-page search results, count as full.
  Website and GitHub pills stay `proof_opened`; need links stay filter choices.
- **Stay rule:** project previews, project pages, case studies and service pages
  record their signal only after 10 s with the tab visible or an interaction
  inside the page's or dialog's own content (a link, button, gallery image,
  expandable item or form field). Scrolling, the header and footer, the
  profile's own controls, closing the dialog and going back do not count;
  leaving earlier records nothing. `project_returned` waits for the same moment.
  A project selected in the Explorer is a preview without a dialog: it follows
  the same rule, with the Explorer's side panel as its own content, at full
  strength when chosen inside the Explorer and at half when the selection came
  with the URL.
- **What a page credits:** a stayed project page credits only its header, the
  industry; a stayed preview credits none of the seven dimensions but still
  counts for returns. Once a project page has been stayed on, each region that
  has been in view for 3 s in total during the visit records
  `project_region_viewed` (+3, the page's weight): the needs block all buyer
  needs, the details table its facts. The preview's needs block works the same
  way. Case studies and service pages keep crediting what they did before.
- **Arrival strength** (`profileArrivalStrength`), applied to the page signal
  and its regions: 1 after a full or exempt card click or another in-site link,
  0.75 after a half-strength card click, 0.5 after a card click that earned
  nothing or an arrival without a click the profile saw (pasted URL, back
  button, another site). The last click is held in memory and matched to the
  next page signal for the same target; a reload loses it.
- Section reading and "project read" keep their rules and weights on top.

The 0.5 s and 3 s marks are the owner's; the 10 s come from the bounce evidence
in the intent model design. None is validated on this site. Shared events need
`packages/database/migrations/014-visitor-profile-strength.sql` (strength column,
the two kinds, rule version 3); sharing is offered only once the table accepts
them, and local profiling works without it.

### Malt rate reveal

The Malt day rate on the home and "Work with me" pages is blurred until it is
clicked. The click records `rate_revealed` with the page (`home` or `hire`) as
its subject, only for visitors with a live profile. It is zero-weight: it adds
no topic points and no project affinity, and serves the owner report, where it
appears per page under reading and in the enquiry journeys. The amount stays in
the HTML and the public API; the blur is a choice, not concealment. Sharing it
needs `packages/database/migrations/015-visitor-profile-rate.sql`, and sharing is
offered only once the table accepts the new kind.

## Pixel signature

`packages/content/src/profilePixels.ts` encodes every catalog term, sorted by ID,
into 128 quantized levels (seven bits per score). The full precision scoring model
remains authoritative; integers 0–127 are used at the image boundary. The current
168-term catalog fits a 16×16 grid with 64 separated shades per hue. The shared SVG
renders at 60px in the floating entry and 192px on the profile page.

The hue arrangement is a mirrored wave, sampled from the same geometric field as
the site's ASCII plasma. The field folds into a triangle wave, so the bands run
magenta, coral, lime, azure from trough to crest and back again without a seam.
The hues are coral 18°, lime 81.21°, azure 198° and magenta 300°; lime is the
site's `--primary`, and the other three were chosen for the widest separation
from it and from each other. The legacy decoder keeps its own earlier hues.

Hue areas summarize business/delivery (coral), engineering/hardware (lime),
AI/data (azure) and UX/research (magenta) interest families. Each hue first
receives `PROFILE_PIXEL_MIN_SHARE` (5%) of the wave cells, so none disappears;
family interest divides the remaining cells. Every family starts with
`PROFILE_PIXEL_SHARE_PRIOR` (32 quantized levels, about a score of 3) of
evidence, so an empty profile splits evenly, a first topic choice (+6) moves the
areas about a third of the way towards its family, and the prior fades as real
evidence accumulates. Without it a single signal handed its family the whole
remaining area at once. Every field, including tools and
sectors, is carried independently by the shade values. Seventeen asymmetric
black-and-white corner marker cells and eight fixed colour calibration cells
keep their positions. Only the hue field rotates inside the upright square.

The wave rests at a position set by the interaction count: every accepted signal
and manual choice after opt-in adds one, and each one advances the field by
`PROFILE_PIXEL_PHASE_PER_INTERACTION` (0.25) along the plasma's own angle
increments. The count is local signature metadata next to the angle. It follows
the Remember setting and cross-tab synchronization, keeps rising while old
signals leave the 240-signal history, saturates at 65,535, and reset, stop and
expiry clear it. Earlier saved profiles restore with a count of zero.

`useProfileFlowPhase` plays the step when the count rises while a signature is
on screen: six frames at 20 frames per second, about 0.3 seconds, and at most
the last second of a burst. A reset and `prefers-reduced-motion` go straight to
the resting frame. A profile that has just loaded does the same in the launcher,
and so does the profile page when it is reached by navigation with the profile
already in memory. Only a profile page that opened without the profile and then
restored it lets the signature run in: over a fixed 0.8 seconds the wave
eases across at most the last two steps and comes to rest on the counted frame,
so a reload always ends on the same picture. Replaying more of the history in
that time would change up to half of the cells per frame at some counts. Steps,
the run-in and rotation only move hues between cells; the
number of cells per hue stays fixed. When the family split changes while a
signature is on screen, `useProfileHueCounts` grows and shrinks the colour areas
towards it within the same 0.3-second step, through `blendHueCounts`, so the
band edges move a few cells per frame. `encodeProfilePayload` computes the fixed
part once per profile state and `paintProfilePixels` colours a single frame.
On screen every cell fades into its new colour over 0.3 seconds, unless
`prefers-reduced-motion` is set. That also softens the error-corrected shades,
which change in about a tenth of the cells with every new state and cannot move
gradually. A signature that mounts appears at once, and the resting frame keeps
its exact colours. Together with the damped split and the turn below, a first
topic choice that seeds 135° spreads about 190 changed cells over roughly 60
frames in one second, at most 32 in one frame; before, it switched up to three
quarters of the cells in one.

After opt-in, the first primary link or button activation outside profile controls
chooses one of eight clockwise angles in 45-degree steps, based on its direction
from the viewport centre. Keyboard activation uses the activated control's centre.
Hover, scrolling, typing and profile controls do not seed it. Before that action,
the badge uses 0°. When the angle is seeded while a signature is on screen,
`useProfileTurn` turns the wave there from 0° over one second, the shorter way
round, so no frame switches the two thirds of the cells a direct jump would.
Frames of the turn pass any angle to `paintProfilePixels`; the picture rests on
the discrete angle. A signature that appears with its angle, a reset and
`prefers-reduced-motion` go straight to it. The discrete angle is local visual metadata: coordinates are
never retained and it does not create a scoring or shared event. It follows the
existing Remember setting and cross-tab synchronization; reset, stop and expiry
clear it. Earlier saved profiles restore without an angle and seed on their next
eligible action.

The payload includes a format version, the 16-bit interaction count, the catalog
fingerprint and a CRC. The fingerprint already changes with the number of terms,
so the count takes the place of a separate term-count field and the grid stays
16×16. `decodeProfileInteractions` reads it back.

The profile page offers the same payload as text: "Copy profile code" in the
summary copies `encodeProfileText`, the payload bytes as base64url (208
characters for 168 terms), without showing it. `decodeProfileText` checks the
same version, fingerprint and CRC and returns the scores and the count, so a
pasted code can be compared with a picture exactly.
Seventeen Reed–Solomon parity bytes per block correct up to eight damaged bytes
per block. Larger catalogs grow the grid and split into bounded correction blocks
without dropping fields. All eight rotations carry the same quantized scores;
rotation metadata is unnecessary for decoding. The decoder also accepts the
previous exact-RGB 12×12 format, which carries no count. The image contains the
scores and the number of interactions, without a browser identifier, interaction
angle metadata or activity history. Sharing it shares those quantized scores and
that count.

Lossy copies such as JPEG or messenger re-encodes shift colours past the exact
decoder. `recoverProfilePixels` takes one averaged colour per cell and works in
three steps. It first undoes the gain and offset that colour-space conversion
and compression give each colour family, estimated per channel from the family's
two calibration cells and from the cells that already sit close to a shade. It
then matches every cell to the nearest shade by brightness and colour
difference. Finally it retries uncertain cells with their second-nearest shade
until error correction, checksum and fingerprint all pass: every combination of
the twelve least certain cells, then up to four at a time of the 24 least
certain. It returns a picture with the original shades or fails. Hues are
outside those checks and stay as sampled, and a picture that cannot be repaired
costs about 16,000 retries (one to two seconds).

`profileSignatureImage.ts` reads a signature from raw image pixels without any
dependency. `locateProfileSignature` finds the white square with the black
centre in the top left corner at any size and position, settles the cell size
by where the markers in the other two corners turn up, and refines the four
corners until the cells line up. `sampleProfileSignature` averages the inner
half of each cell in linear light; measured on compressed screenshots, the
inner half misreads a third as many cells as the inner two thirds.
`readProfileSignatureImage` combines both with the recovery.

```sh
pnpm profile:read screenshot.png --site https://example.com
pnpm profile:read screenshot.jpg --catalog catalog.json --json
```

The script prints the interaction count, the active interests and the text
code. A picture only verifies against the catalog it was made with, so the
script loads `/api/profile/catalog` from the given site (the local dev server by
default) or a saved copy of that response.

The image has to be upright and undistorted, which screenshots are. Photos of a
screen are out of reach of this format: neighbouring shades are five to seven
colour units apart, while in the best of four test photos cells of the same
true colour differed by about three units even after sampling only the centres
and removing the brightness drift measured on the markers.

Browser tests verify all 168 fields from real screenshots at 60 and 192
pixels.

## Owner insights

Apply the additive migration as database owner before deploying collection:

```sh
node --env-file=.env.local --import tsx scripts/profile-insights.mjs migrate
```

The command replays every profile migration in one transaction, so each file must
be safe to replay on a table that already holds newer data. A migration that
redefines the kind or rule-version check adds it `NOT VALID`; the command
validates the final constraints at the end. A single file applied on its own (as
on production) leaves its check unvalidated, which is harmless because earlier
rows only use older, narrower values.

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

## For you: readiness, hint and nav entry

`isForYouReady(profile, catalog, now)` in
`packages/content/src/forYouReadiness.ts` is the only decision about whether a
profile is ready for personalised suggestions. It is a confidence gate on the
visitor's buyer needs as scored by `profileInterests`: the leading need scores
at least `FOR_YOU_MIN_LEADING_SCORE` (6) and leads the third-ranked need by at
least `FOR_YOU_MIN_LEAD_OVER_THIRD` (1). The thresholds were re-fitted to Rules
v3 from a five-seed sweep of the benchmark: (4, 1), fitted on Rules v2, left the
six-card focused visitor right only 73.5% of the time (firing for 94%); (6, 1) is
right 82.7% for it and 92.4% for the twelve-card one, firing for 81% and 90%. The aim is that the visitor's real need
is among the top two when the gate fires. Because manual choices count, one
explicit choice of a buyer need passes at once: a filter or topic choice (+6),
or a manual preference of interested (6) or priority (12). Choices of a tool,
an industry or any other facet do not. Viewing projects passes once their
shared needs pull ahead; three projects with spread needs are not enough. An
expired profile, signals later than `now`, and projects and terms that have
left the public catalog do not count, as everywhere in `profileInterests`.

The gate can turn false again as scores decay or a new view narrows the lead.
The store latches it: `forYouUnlocked` in the profile store is set the first
time the gate passes, after any profile change or a restore, and is never set
back. The latch judges the gate both now and as of the profile's latest
evidence, because a single choice of exactly 6 decays below the threshold a
moment later. A saved profile that already passes restores unlocked, also when it was
saved before the field existed. Like `forYouHintSeen` it follows the Remember
setting, merges across tabs (an unlock in any tab wins for the same profile),
and is cleared by reset, stop and expiry. `useForYouReady` reads
`enabled && forYouUnlocked`; the hint and the header link both read that hook
and add no profile conditions of their own.

The gate is held to a simulation benchmark, `tests/profile-benchmark.test.mjs`.
Seeded simulated visitors, each with one real buyer need, browse
`tests/fixtures/profile-catalog.json` (a snapshot of `/api/profile/catalog`
with project ids, names and links replaced) through the real scoring code. Each
pick is a card click with a time-in-view level, then a bounce or a stay on the
project page, then whether the needs block and the details table came into
view, then possibly a deep read; a visitor recognises their need only on cards
that show it. The behavioural assumptions are named constants in the test. For
focused visitors (65% of picks go to a card showing their need, six or twelve
cards seen per pick) the test fails if the real need is among the top two less
than 75% of the time when the gate fires, or if the gate fires for fewer than
60% of them; it also fails if the gate fires for 5% or more of rapid clickers
(hasty clicks, never staying). Loose visitors (40%) and aimless visitors (no
real need) are reported only. At the time of writing (seed 23): focused
visitors 82.5% and 92.0% right, the gate firing for 79.8% and 90.0% after a
median of five and four projects; loose visitors 83.8% right; rapid clickers
0%; and the gate fires for about 39% of aimless visitors, a known limit.
The visitor behaviour is an assumption, not traffic data: the benchmark holds
signal and gate changes to one bar, it does not measure real accuracy. Refresh
the fixture when the public catalog changes materially. Run it with
`node --test tests/profile-benchmark.test.mjs`; the numbers are printed as test
diagnostics.

The hint is a small popover above the pixel signature: "Your profile is ready."
/ „Dein Profil ist bereit." with a link "See your matches" / „Vorschläge
ansehen". It is due from the moment the profile is ready and stays, across pages
and reloads, until the visitor closes it (button or Escape), follows its link or
clicks the signature. `forYouHintSeen` in the profile store records that. It is
local metadata like the signature angle: it follows the Remember setting and
cross-tab synchronization, an out-of-date snapshot from another tab cannot bring
the hint back, and reset, stop and expiry clear it. Earlier saved profiles
restore with the hint unseen. Marking it seen is not a signal, adds no interest
points and does not count as an interaction.

The hint is not rendered while any dialog is open, which covers the project
dialog and the full-screen image view where the signature is inert, and not on
the profile page. It sits in a polite live region that exists before the hint,
never takes focus, and comes directly before the signature in the tab order;
after a dismissal focus continues from the signature. It carries
`data-profile-ui`, so it neither seeds the signature angle nor records a signal.
Its entrance animation is skipped under `prefers-reduced-motion`.

The header link "For you" / „Für dich" (`ForYouNavLink` in the shared Layout)
renders only in the browser and only for a ready, opted-in profile. It sits
below the availability link and the language switch. From 768px it fills the
space beside the portrait: availability and languages move up, and the header
keeps its height. On narrower screens it is a full-width row of its own above
the navigation, so the navigation and the page move down by that row when the
link appears. Visitors without a ready profile or without JavaScript get the
header unchanged.

The same link hangs under the floating signature as a one-line button in the
primary colour, as wide as the signature (60px, 36px on phones, where the
signature has no frame around it). It appears with a ready profile and stays
away on `/for-you` itself.

The hint and the header link both lead to the localized `/for-you`, which shows
the local preview built in the browser from the profile
(`packages/content/src/forYouPreview.ts`, see
[the For you design](plans/2026-11-20-for-you-page-design.md)). The hint is not
shown on `/for-you` itself.

Unit behaviour: `node --test tests/for-you-readiness.test.mjs tests/for-you-hint.test.mjs tests/profile-benchmark.test.mjs`.
Browser behaviour: `SEO_TEST_BASE_URL=http://localhost:6895 node --test tests/for-you-hint.browser.mjs`
runs the journey in English and German at 1360 and 375 pixels: a buyer-need
topic chip on the project list makes the profile ready, then the dialog and
image-view exclusions, the unchanged header layout,
and the three endings: keyboard dismissal, following the link and clicking the
signature.

## Validation

Unit behaviour: `node --test tests/visitor-profile.test.mjs tests/visitor-profile-signals.test.mjs tests/visitor-profile-reading.test.mjs tests/profile-view-tracker.test.mjs tests/visitor-profile-store.test.mjs tests/profile-pixels.test.mjs`.
Database integration uses `tests/visitor-profile-db.integration.mjs` with an
explicit localhost database whose name ends `_test`; it never targets production.
Browser behavior uses `SEO_TEST_BASE_URL=http://localhost:6895 node --test tests/visitor-profile-signals.browser.mjs`;
Rules v3 clicks, stays and regions use `tests/profile-click-credit.browser.mjs` in English and German.
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
