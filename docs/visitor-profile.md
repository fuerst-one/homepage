# Live visitor profile

Open **Your live profile** on any page, then **Start my live profile**. The panel
is nonmodal and can move to either side of the page. It keeps the site usable
while showing inferred interests, their evidence, manual preferences, recent
signals and matching projects. The same controls are reachable from the footer's
Privacy settings. English and German UI and privacy text are included.

Capture starts only after opt-in. Remembering and sharing are separate choices.
The default profile lives in this tab's memory; reload clears it. Remembered
profiles expire 30 days after their start. No account, contact details, typed
queries, form text, pointer trails, third-party SDK or paid AI is involved.

## Rules v1

The pure model is `packages/content/src/visitorProfile.ts`. Project dimensions come
from the public publication, never from raw research notes. Project opens add 2
points, active reading adds 1 after 15 qualifying seconds, explicit filter
selections add 6, and service visits add 3. Within a dimension points are divided
across that project's tags. Repeated kind/subject pairs are capped at once per
30 minutes. Inferred scores have a seven-day half-life and a ceiling of 12.

Manual choices override inference: not relevant = excluded, interested = 6,
priority = 12, automatic = return to the existing evidence. A correction retains
the prior inferred score and the contributing signal types. These are hypotheses
to evaluate, not calibrated probabilities. The local activity log keeps its most
recent 240 signals. Remembered tabs reconcile before writes; saved manual choices
remain authoritative even when their activity history has aged out. Unsent signals
are persisted only when remembering is enabled and restored without backfilling
earlier local actions. Page exit attempts delivery with a bounded keepalive request.
Suggestions average the strongest matches per active
dimension and respect exclusions; normal search/filter results are not reordered.

Recommendation impressions and clicks are separate zero-weight events. The
destination's project-open signal supplies the interest evidence. This prevents
one recommendation click from counting twice and supports inspection of the
recommendation feedback loop. Starting a contact form and receiving a successful
submission response are zero-weight funnel events; no enquiry contents or receipt
IDs enter this system. Owner reports describe associations, not causal lift.

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

Unit behaviour: `node --test tests/visitor-profile.test.mjs tests/visitor-profile-store.test.mjs`.
Database integration uses `tests/visitor-profile-db.integration.mjs` with an
explicit localhost database whose name ends `_test`; it never targets production.
HTTP behaviour uses `SEO_TEST_BASE_URL=http://localhost:6894 node --test tests/visitor-profile-http.test.mjs`
against the local migrated database. Browser acceptance covers keeping the panel
open across navigation, explicit filters, project evidence, manual corrections,
remembering, sharing and erasure, mobile layout and keyboard controls.
