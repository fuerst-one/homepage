# Server-side analytics design

Status: code implemented on `feat/umami-analytics`. Umami runs at
`https://stats.fuerst.one` (Coolify service `umami-fuerst-one`, project Homepage),
website "fuerst.one" `68ed8bd4-4f24-497a-a752-e6b9e8431d4a`, daily cleanup via
`prune_raw_data(interval '13 months')` at 03:40. Live since 2026-11-24 (`9f6d144`); interaction
events added 2026-11-26, see below and `docs/analytics.md`. Alex asked on 2026-11-24 for Umami on
fuerst.one without a new opt-in, plus anonymous counts of shared visitor-profile signals.

## Decisions so far

- **No-consent page views, server-side.** The browser runs no analytics script and
  stores nothing. The web app reports page views to Umami from the server, using
  only what the normal page request carries. Legal basis: legitimate interest
  (Art. 6(1)(f) GDPR). This replaces the audit's proposed analytics opt-in
  ([legal-privacy-audit](../legal-privacy-audit-2026-11-16.md), "Future analytics")
  for page views only; a client script with click events would still need that
  opt-in. **Superseded 2026-11-26:** Alex chose to count a few interactions
  without opt-in too, like Homebears does, through our own first-party script
  rather than Umami's (see "Interaction events").
- **Profile signals, anonymous.** Events that visitors already share through
  "Share signals and corrections with Alexander" are also counted in Umami,
  without the browser key and unlinkable to page-view sessions. No new consent:
  the sharing consent covers sending them to our server; the privacy text names
  the anonymous counting.
- **Own Umami instance.** A new Umami 3.5 service with its own Postgres in the
  Coolify project **Homepage**, at `stats.fuerst.one`. The existing instance at
  `stats.homebears.app` stays with Homebears so that app can split off later.
  Only our server and Alex contact the instance; visitors never do.

## What gets recorded

| Field         | Source                                                                | Kept in Umami as                                 |
| ------------- | --------------------------------------------------------------------- | ------------------------------------------------ |
| Path          | Request path                                                          | URL path                                         |
| Campaign      | `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` | UTM fields; every other query parameter dropped  |
| Referrer      | `Referer` header, reduced to its host; own host dropped               | Referrer domain                                  |
| Language      | First tag of `Accept-Language`                                        | Language                                         |
| Browser, OS   | `User-Agent`, parsed by Umami                                         | Browser, OS, device class; raw string not stored |
| Country       | `x-vercel-ip-country`                                                 | Country; region and city headers not forwarded   |
| Daily visitor | Keyed hash of IP and user agent, see below                            | Session ID only (a hash)                         |

Not recorded: raw IP, full referrer URL, other query parameters, screen size,
page title, scroll or time on page, anything from forms, search or chat. Clicks
only as the interaction events listed below.

### Daily visitor hash

Umami derives a session ID from IP, user agent, a rotating salt and an optional
client salt. To count visitors per day without recognising them across days:

- The web app sends a constant placeholder IP (`192.0.2.1`) in
  `x-analytics-client-ip`, which our Umami reads via `CLIENT_IP_HEADER`, so
  Umami never sees the real one. Without that setting Umami would hash the
  changing Vercel egress IPs and split sessions.
- It sends `salt = HMAC(ANALYTICS_SALT_SECRET, utcDate + ip + userAgent)`.
  Umami mixes it into the session hash (needs `ENABLE_CLIENT_SALT` on our
  instance) and does not store it.
- The secret is new and separate. The abuse-protection IP hash is not reused.

Consequence: unique visitors, bounce rate and visit length are correct within a
UTC day. A visitor returning the next day counts as new. Returning-visitor
reports stay empty by design.

Known weakness to accept or change: with the long-lived secret and a visitor's
IP and user agent, a day's hash could be recomputed. A per-day random salt would
avoid that, but serverless instances do not share memory, so it would need
shared storage (for example a row in the existing Postgres). See open question 3.

## Page-view capture

- Next.js 16 `apps/web/src/proxy.ts` (the former middleware). It runs on Vercel
  before the cache, so cached and static pages are counted too.
- Counted: `GET` document navigations (`Sec-Fetch-Dest: document`) and client
  navigations (`RSC: 1`) under `/en` and `/de`.
- Skipped: link prefetches (`Next-Router-Prefetch`), `/api`, `/_next`, files with
  an extension, non-`GET`, requests with `Sec-GPC: 1`, and requests without a
  user agent. Bot user agents are dropped by Umami's own check, which sees the
  forwarded user agent.
- Sending: `event.waitUntil(fetch(...))` to `${UMAMI_URL}/api/send` with a
  1.5-second timeout. Failures are swallowed and never affect the response.
- Proxy cannot see the response status, so a 404 path shows up as a page view.
  Accepted; Umami's page list makes them visible.
- Switch: disabled unless `UMAMI_URL`, `UMAMI_WEBSITE_ID` and
  `ANALYTICS_SALT_SECRET` are set. `getSiteFeatures()` gains `analyticsEnabled`,
  which also controls the privacy-page section (same pattern as
  `assistantEnabled`). Local and preview stay off unless configured.

## Profile signal counting

- In `apps/web/src/app/api/profile/events/route.ts`, after `storeProfileEvents`
  accepts a batch, send each event to Umami inside `after()`.
- Event name `profile_<kind>` (for example `profile_filter_selected`); data
  `subject` (public dimension or project), `strength`, and for corrections
  `preference` and `previous`.
- Not sent: the browser token or its hash, `inferredScore`, `basis`, consent
  time, timestamps finer than Umami's own, IP.
- Each batch gets a random client salt, so batches never join each other or a
  page-view session.
- Erasure: Umami holds no key, so switching sharing off erases the Postgres
  events as today; the Umami counts are anonymous and stay.
- Limits stay as documented: only visitors who opted into profile and sharing,
  and events are browser-reported.

## Interaction events (2026-11-26)

- Client: `components/Analytics/InteractionTracker.tsx`, mounted in the locale
  layout. It loads no Umami script; it posts to our own
  `/api/analytics/events` with `fetch(..., { keepalive: true })` and stays off
  when the browser sends Global Privacy Control.
- Events: `outbound` (destination origin and path, no query or fragment),
  `download` (file type only; the Plasma playground exports, CV downloads are
  retired), `explorer-used` (first pointer or key use inside an element with
  `data-analytics-demo="explorer"`, once per page). `enquiry-sent` is sent by
  `api/enquiries` itself after a successful save and is never accepted from
  the browser.
- Server: `server/analytics/interactionEvents.ts` allowlists names and data,
  takes the page from the same-host `Referer` (page paths only, query dropped)
  and reuses the page view's daily salt and forwarded headers
  (`visitorIdentity` in `pageView.ts`), so an event joins the visitor's
  page-view session and funnels work within a UTC day.
- The endpoint checks origin, rate limit, content type and a 1 KB body limit and
  answers 204 whether or not analytics is configured.

## Privacy texts (EN and DE, same release)

- Privacy page, "Hosting and technical access data": the sentence "separate from
  visitor analytics" now points to the new section.
- New section "Visitor statistics", shown when `analyticsEnabled`: what is
  recorded (table above in prose), server-side with no script and no cookie,
  the daily hash, country only, recipient (our own server at Hetzner, Germany),
  retention, legal basis Art. 6(1)(f), the right to object, and that a browser
  sending Global Privacy Control is not counted.
- "Cookies, analytics and browser storage": still no cookies or tracking pixels.
- Visitor-profile sharing paragraph: shared signals are also counted
  anonymously, without the browser key, in the same statistics.
- `docs/legal-privacy-audit-2026-11-16.md`: add a dated note that page-view
  analytics shipped server-side without consent, and why.

## Tests

- Unit (`tests/analytics.test.mjs`, `loadTs`): a pure function turning request
  data into an Umami payload or `null`. Covers counted versus skipped requests,
  UTM allowlist, referrer reduction, own-host referrer, language tag, GPC, bots,
  and the daily salt changing with the date.
- Unit: profile batch to Umami events, checking that token, score and basis
  never appear.
- HTTP (`tests/analytics-http.test.mjs`): run the app with `UMAMI_URL` pointing
  at a local fake collector, load pages and send a profile batch, and assert what
  arrives.
- Privacy page HTTP check: the section appears only when analytics is enabled.

## Rollout

1. Coolify: add Umami 3.5 + Postgres to project **Homepage**, domain
   `stats.fuerst.one`, `ENABLE_CLIENT_SALT=1`,
   `CLIENT_IP_HEADER=x-analytics-client-ip`, own `APP_SECRET`, plus the daily
   13-month cleanup task.
2. DNS: `stats.fuerst.one` to the Hetzner server (Alex).
3. Umami: admin account (Alex), website "fuerst.one".
4. Vercel production env: `UMAMI_URL`, `UMAMI_WEBSITE_ID`,
   `ANALYTICS_SALT_SECRET` (Alex, since they are secrets).
5. Ship code and privacy texts in one release.

## Settled questions (2026-11-24)

1. **Retention in Umami.** Self-hosted Umami keeps data indefinitely. A daily
   Coolify scheduled task deletes events older than 13 months; the privacy text
   states the period.
2. **Objection.** Global Privacy Control is honoured. No opt-out switch in
   Privacy settings for now, because server-side it would need a cookie and the
   site states it sets no application cookies. Objections by message are handled
   as described in the privacy text.
3. **Daily salt.** The long-lived `ANALYTICS_SALT_SECRET` is accepted. A per-day
   random salt in Postgres remains the upgrade path.
4. **Preview deployments.** Analytics stays off on previews (no env vars set).
