# Local assistant acceptance — 2026-11-16

This is a local prototype using the dedicated `.env.local` OpenRouter key and
Docker PostgreSQL/pgvector. No cloud database, Vercel setting or production
deployment was changed.

## Observed behavior

- Initial Notion import: 84 public locale documents, 115 passages. Repeated
  unchanged syncs reported zero updated documents and made no embedding calls.
  A local watcher polls 60 seconds after each completed read.
- Real English and German requests returned grounded project citations and
  allowlisted page actions using `openai/gpt-4.1-mini`.
- Browser: English “Show Page Control” closed the panel, showed the single
  matching project and focused `landing-projects`. German “Suche hervorheben”
  focused `landing-search`. Project navigation opened the localized public
  project URL.
- With a controlled browser response, highlighting projects from the initial
  landing mounted all 42 public results and focused them. Explicitly closing the
  assistant restored keyboard focus to its launcher. The fixture was removed
  afterward; live requests use the real backend.
- Desktop 1280×720 and mobile 390×844 checked visually. At 844×390, scrolling the
  panel exposed the complete form within the viewport. No horizontal overflow
  or browser runtime errors appeared during these interactions.
- A real off-topic/key-extraction probe produced the generic no-evidence answer
  with no citations or actions. Cross-origin requests returned 403; an injected
  client model setting returned 400. These probes are examples, not proof of
  comprehensive prompt-injection resistance.
- Live German testing exposed the model confusing project IDs with citation
  IDs. Dynamic JSON-schema enums now constrain both citations and action targets
  to the retrieved evidence; the same German question then succeeded.

## Checks

- Nine focused knowledge tests passed: request limits, publication boundaries,
  translation readiness, chunking, schema constraints and action validation.
- Two real PostgreSQL integration checks passed in the dedicated local test
  database: concurrent budget/visitor admission and a late embedding failure
  followed by a retry that reused already paid batches.
- TypeScript, scoped ESLint, formatting and whitespace checks passed.
- Production build passed. The full suite against the local built app passed
  all 194 tests, including every service-product URL and sitemap check.
- Review covered bugs, security, code quality and UI. Fixed incomplete German
  publication gating, month-boundary quota counts, lost paid import progress,
  missing initial project-highlight results, close-button focus and short-screen
  overflow.
- An initial full suite passed 193 checks against the previous local server.
  After restarting the server with the assistant flags, the expanded suite had
  188 passes and six failures: four existing service-product URLs returned 404,
  their sitemap check failed, and one service-page request timed out fetching
  Notion. Those routes and their data were not modified by this feature. All
  these checks subsequently passed against the production build; the failures
  were specific to that development-server run.

## Remaining production work

Coolify database provisioning, production TLS/pooling/backups, durable scheduled
indexing and Notion webhook wiring, a public privacy-notice review, and public
deployment remain separate. Notion edits were not made just to test the watcher;
visibility/translation transitions are covered by behavior tests, while live
polling was observed on unchanged content.

## Inline UI follow-up

The original popover described above is replaced by a shared landing input.
Quick navigation appears above it. While typing, loading and a combined filter
and project list replace navigation and intro copy above the stationary input. Enter
switches the entire section to a conversation, with messages above the composer;
navigation becomes hidden and inert. Messages use normal page scrolling, and
the composer stays sticky near the viewport bottom. Close chat and Escape
restore the default landing mode. The backend and its cost limits are unchanged.

The browser workflow uses controlled responses without model charges. It covers
typing without assistant requests, Enter, one shared composer, hidden discovery
UI during chat, focus restoration, quota-error retry text, and Stop preserving
the question. Stop prevents the click's default form action while the same
control changes back to Submit. Desktop and phone screenshots were inspected.
Fifty-two focused knowledge, search, command and hero tests passed. Both
`tests/landing-chat.browser.mjs` and `tests/landing-discovery.browser.mjs` passed,
as did TypeScript and scoped ESLint. The latter browser check covers combined
results, keyboard selection and a persistent hovered/focused 3D preview.

The result box fits its content up to 260px (less on smaller viewports), then
scrolls. Desktop and phone screenshots show the preview above the list. Manual
browser measurements confirmed a single-result phone panel shrinks to 185px
under a 239px cap, while the input stays at the same vertical position across
default, many-result and few-result states. A fixed two-line caption allocation
prevents hidden preview text from shifting the mobile composer.

## Saved history and exact navigation follow-up

The later interaction revision separates search suggestion chips into the old
navigation-button bar, with a projects-only scrolling result box above it.
Exact project names, explicit commands and exact facet labels navigate before
chat is considered. Selecting a facet returns focus to the input so Enter opens
the existing CV view filtered to the matching project IDs.

Close chat preserves history; activating the input restores it. The last five
completed exchanges persist across page changes/reloads in this tab's session
storage for two hours after the latest completed answer. Clear chat deletes
history and invalidates pending responses. Saved case-study links are accepted;
unsafe stored destinations are rejected. Public-search failure does not disable
assistant requests. EN/DE privacy notices now disclose the actual data flow and
retention; unresolved public-launch checks are in the dated privacy review.

Validation: 72 focused unit/behavior tests, TypeScript, scoped ESLint and formatter
checks passed. Three sequential browser workflows passed: existing chat and Stop
behavior; separate discovery list/bar and exact keyword/project navigation with
zero model calls; restored case-study conversation across close/navigation/reload,
Clear chat, and assistant use after a public-search failure. Browser provider
responses were controlled fixtures, so these checks caused no model charges.

## Named filters and visible filter summary

Landing suggestions now open semantic project URLs such as
`/en/projects?experiences=AI+Engineering`, instead of freezing a list of project
IDs. Public matching facets use the same URL mechanism, and the project page
joins only the existing validated public case metadata for these filters.
Optional metadata lookup failure leaves native filters/archive available and
metadata-dependent filters fail closed. The Featured facet maps to native
boolean values, including false.

The existing filter console shows active filters and result counts while
collapsed. Each chip removes its value, and Clear all filters clears the query.
Older ID-based URLs still work, with project names shown instead of UUIDs.
Controls are localized and have 44px minimum touch targets.

Validation: 45 focused search/filter tests, TypeScript and scoped ESLint passed.
Two browser workflows passed: landing exact-match navigation using named query
parameters without model calls, and visible/removable filters while collapsed,
clear-all, readable legacy-ID links, case-facet result counts and German mobile
layout. Desktop/mobile screenshots were inspected.

## Silent DB/provider failover

The existing chat now substitutes up to three locally matched public projects,
or generic project/contact links, without outage warnings. A known failure
bypasses assistant POSTs in the same tab across navigation. Clear chat preserves
availability state; Stop still cancels a question without adding a fallback turn.
The first unresponsive request has an eight-second server deadline and a
nine-second browser transport deadline. Healthy local answers had previously
needed four to eight seconds, so the normal deadline allows for that latency.

The server circuit remains outside PostgreSQL. Cooldowns start at 30 seconds and
increase to five minutes; one background probe runs per Node process. Recovery
requires a fresh nonempty corpus, working embeddings and a validated strict
structured chat response. Synthetic paid probes go through shared atomic budget
admission. Unknown/failed costs stay reserved. The tab only clears its latch on
verified health; an unverified new worker or an older answer carrying an outage
cannot clear it. This is process-local and per-tab protection, not a distributed
flag across Vercel instances.

Validation: all 228 automated tests passed, including circuit deadlines,
coalescing, cooldowns, quota isolation, stale completions, DB/provider failures,
paid-probe ordering and rejection of plain-text capability probes. Five browser
workflows passed: existing chat/Stop, history/navigation, silent fallback and
recovery, stalled transport and immediate subsequent fallback, and an older
completed answer carrying outage status. Browser provider responses were
fixtures. TypeScript, scoped ESLint and formatting passed. A real local DB
`pg_sleep(10)` was cancelled via AbortSignal in 121ms, and the same pool then
answered a normal query. No data was deleted and the running DB stayed up.

English/German draft privacy notices now also describe the technical tab latch
and fixed synthetic recovery checks. The existing public-launch prerequisites
in the privacy review still apply. No production deployment was made.
