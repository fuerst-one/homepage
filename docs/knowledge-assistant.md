# Local knowledge assistant

Current rollout/configuration instructions are in [AI operations](ai-operations.md).
Migration 008 moves budgets and admission controls into PostgreSQL `settings`,
adds the stable visitor lottery and BotID, and changes the serving provider to
Microsoft Azure with renewed consent. Historical local acceptance below predates
that rollout; consult the [production release receipt](ai-production-release-2026-11-16.md)
for exact production activation state.

The isolated 18 November cache implementation adds migrations 009/010 and renews
consent to `2026-11-18.3`. Query vectors are shared between both semantic search
paths; supported public assistant answers have exact and guarded semantic reuse.
See [cache behavior and acceptance](knowledge-query-cache-2026-11-18.md) for
retention, migration order, measured provider calls and the deliberately limited
answer-sharing scope. This change has not been deployed.

Open <http://localhost:6888/en> or <http://localhost:6888/de>. Type into the
shared input to preview project suggestions; press **Enter** to ask the
assistant. Try “Show projects with AI automation”. Answers cite
published projects; the buttons can filter the landing page, open a known page,
or highlight its search, project results, and contact area. Each question is
independent. Available AI asks for opt-in before sending a question; allow and
decline are remembered for 180 days without renewal on visits. A remembered
refusal is asked again at most once per browser session, on a submitted question;
after that, and after a refusal or withdrawal made in the session, Enter is plain
search. Unknown/unavailable AI is plain search too: no chat opens, no opt-in is
offered and the input shows the search-only copy. The last five exchanges are saved in this
tab for two hours after the latest answer only when the separate history option
is selected; otherwise they remain in page memory. Chat replaces
the entire discovery section, with messages above the shared input. The page
grows naturally and the composer stays near the bottom while scrolling. Choose
**Close chat** or press Escape to restore the default landing page.

While typing, loading and project results replace the intro above the input.
Search suggestions use the navigation-button bar, below the projects-only
result box. The box fits its content up to 260px (less on smaller screens), then
scrolls. Hovering or focusing a project keeps its 3D preview visible. Arrow keys
move from the input into results and suggestions. Clicking a suggestion selects
its filter and focuses the input; Enter opens the project view with
the selected named facet. Exact project names and explicit commands also navigate.
Unmatched submitted text asks the assistant. If public search is unavailable,
chat remains available; opening history never repeats a model request.

Close chat hides the conversation and restores the landing. Clicking or focusing
the input resumes saved messages, including after page navigation or reload.
Clear chat erases them. Withdraw AI permission aborts pending requests, clears
chat/status and remembers a refusal; Change AI preference permits a new choice.
Reading history does not extend expiry. Expired storage
is cleared on the landing page or on the next return.

The local English/German privacy notices have been updated. See the
[pre-publication privacy review](privacy-launch-review-2026-11-16.md)
for provider settings, DPA/transfers and production hosting checks that remain
outstanding. The site is deployed with public AI disabled; the consent and legal
changes remain local pending review. Before release, apply the updated initial
SQL migration as administrator to add the consent receipt column. The app and
indexer login roles cannot alter tables. Provider routing is pinned to OpenAI
with no-training/ZDR restrictions and no provider fallback. Changing model
recipients requires another privacy review and notice-version update.

## Silent fallback

The fallback only appears inside a conversation that is already open. If the
vector DB, corpus freshness or OpenRouter fails while a question is pending or
after earlier answers, that chat shows up to three matching projects from the
public search index, or project/contact links. There are no outage banners. The
first failure is bounded to eight seconds on the server (nine seconds including a
browser transport timeout); later questions in the open chat use local
suggestions immediately. Stop and Clear still cancel pending questions. Once the
chat is closed, Enter no longer opens it until AI is verified again.

Used-up budgets and request caps count as unavailable. The status endpoint checks
the shared allowance (daily/monthly budget, global and per-visitor caps) without
reserving anything and reports `available: false` with no recovery probe; a
question refused by the allowance returns the same state so the tab stops
offering questions until status confirms the allowance is back.

A process-local circuit starts with a 30-second cooldown, increasing failed
recovery checks to a maximum five minutes. Active pages check status in the
background with no question/history, and Next `after()` runs synthetic checks
one per Node process at a time, including while health is still unknown.
Fallback stays active until fresh DB content, embeddings and a tiny structured
chat response all work. These synthetic checks use the same global spending
budget as chat/indexing, not visitor messages. No traffic means no checks.

The tab remembers only outage/retry state in session storage, separately from
chat history; verified recovery removes it. Clearing chat does not override an
outage. New server instances reporting unverified health cannot clear the tab's
latch. Browser transport/status failures also fail over quietly.

This circuit is shared within one Node process, not across all Vercel instances.
The per-tab latch prevents repeated slow requests for that visitor; quota and
spending admission remain atomic across instances in PostgreSQL. A distributed
outage flag would require a separate available shared store.

## Start again

The initial setup is already configured in the ignored `.env.local`. To start a
fresh installation, use `.env.example` as a reference and supply a dedicated
OpenRouter key with a provider spending limit, the existing Notion credentials,
a random database password, and a random rate-limit secret. The database URL
password must match `KNOWLEDGE_DB_PASSWORD`. Enable both assistant flags locally.

```sh
pnpm knowledge:db
pnpm knowledge:migrate
pnpm knowledge:sync
pnpm dev
```

In a second terminal, keep `pnpm knowledge:watch` running. It checks Notion again
60 seconds after each completed sync. Unchanged documents need no new embedding
calls, and completed embedding batches are reused after an interrupted import.
Changes can take one polling cycle plus import time to appear. Without a
successful sync for 15 minutes, the assistant uses the project-suggestion fallback. Normal project
search stays available. `pnpm knowledge:status` shows corpus size, last sync and
conservative budget accounting (which can exceed the actual provider bill).

The Docker database listens on localhost port 55438 and persists in the
`homepage_knowledge-data` volume. Stop it without removing data with
`docker compose --env-file .env.local -f compose.ai.yaml stop`.

## Limits and publication

- Default model: `openai/gpt-4.1-mini`. Change `OPENROUTER_MODEL` in `.env.local`
  and restart the server to test another model supporting structured JSON output.
  Models above $2/M input or $10/M output tokens are rejected.
- Embeddings use `openai/text-embedding-3-small` at 1536 dimensions. This index
  deliberately rejects other embedding models.
- Defaults: $1/day, $10/month shared budget for chat and indexing; three requests
  per minute and 20 per rolling day per visitor; three paid operations in flight.
  Local requests share one visitor bucket. Input is limited to 1000 characters,
  output to 700 tokens. Unknown costs retain their full reservation.
- Only explicitly visible Notion projects and linked, published case studies are
  imported. German content uses the site's existing translation publication gate.
  Editorial notes, relations, arbitrary URLs, child pages and synced blocks are
  excluded. Removing publication withdraws material on the next completed read.
- The server stores public-content embeddings, budget records, temporary query
  vectors and supported public answers. Cache entries have keyed fingerprints,
  original submitted query text, no visitor identifiers, and expire after
  one calendar year. Younger entries are not evicted for capacity. Raw IP addresses are not stored by the application. On cache misses,
  questions and relevant public passages go to OpenRouter and Azure. Personal
  or free-form answers are excluded from shared response caching.
- Actions use server-owned links and targets. Model output is rendered as plain
  text; citations show retrieved evidence but do not guarantee every generated
  claim is accurate. Check answers before public release.

Production now has a separate Coolify database and continuous sync application,
with production variables configured on Vercel. Public AI stays disabled pending
provider privacy setup. See [production deployment](deployment-2026-11-16.md)
for resources, TLS, backups, release provenance and rollback. No Notion webhook
is needed for the minute-level polling sync.

## Verification

`pnpm test`, `pnpm exec tsc --noEmit`, and scoped ESLint cover application checks.
The database integration suite is intentionally separate:
`node --test tests/knowledge-db.integration.mjs`. It requires
`KNOWLEDGE_DATABASE_URL` pointing to a dedicated **localhost** database whose name
ends in `_test`; it clears usage and embedding-cache records in that test database.
It checks atomic quotas and reuse of completed embedding batches after failure.
