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
family interest divides the remaining cells. Every field, including tools and
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
number of cells per hue stays fixed. `encodeProfilePayload` computes the fixed
part once per profile state and `paintProfilePixels` colours a single frame.

After opt-in, the first primary link or button activation outside profile controls
chooses one of eight clockwise angles in 45-degree steps, based on its direction
from the viewport centre. Keyboard activation uses the activated control's centre.
Hover, scrolling, typing and profile controls do not seed it. Before that action,
the badge uses 0°. The discrete angle is local visual metadata: coordinates are
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
decoder. `recoverProfilePixels` takes one averaged colour per cell (sample the
central part of each cell), matches it to the nearest shade by brightness and
colour difference, and retries its twelve least certain cells with their
second-nearest shade until error correction, checksum and fingerprint all pass.
It returns a picture with the original shades or fails. Hues are outside those
checks and stay as sampled, and a picture that cannot be repaired costs all
4,096 retries (a few hundred milliseconds).

Screenshot checks sample the centres of a known grid bounding box and verify all
168 fields at 60 and 192 pixels. The decoder takes RGB pixels and the matching
catalog; automatic code location and camera-photo recovery are not implemented.

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
