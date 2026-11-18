# Local knowledge-cache inspection — 18 November 2026

Tested the production build in a real browser at <http://localhost:6888/en>, using
the actual local PostgreSQL database `homepage_knowledge` on port 55438 and the
configured embedding/chat providers. Browser requests and answers were not
mocked. The changes were tested on `codex/semantic-response-cache`.
No production deployment was performed.

The counts below describe the initial inspection before the subsequent
[bilingual hardening](plans/2026-11-18-bilingual-cache-hardening-design.md).
That update isolates older answers with a new cache namespace while preserving
their original retention. Later manual tests can add rows beyond this snapshot.
The final German run and current local configuration (including the USD 3 daily
ceiling) are recorded in the [cache implementation receipt](knowledge-query-cache-2026-11-18.md#bilingual-false-match-hardening).

## Local setup

- Applied migrations 009 and 010 to this local database.
- Both local assistant environment switches are enabled. The database AI switch
  is enabled, with 100% local rollout.
- Raised the local daily admission allowance from USD 1 to USD 2 because prior
  conservative reservations had already accounted for USD 0.98. The monthly
  allowance and request quotas were unchanged. This is a local spending ceiling,
  not the cost of this test.
- Refreshed the previously incomplete index: 98 public documents and 143 chunks.
  A second sync changed zero documents.
- Used the real consent dialog, allowing AI under version `2026-11-18.3` with
  local conversation history disabled.

## Observed requests and database writes

Counts below are cumulative rows created during the five successful submitted
queries. Accounted cost includes the existing safety margin for paid requests;
it is not an independent provider billing statement.

| Browser action                                                            | Query rows | Shared answer rows | Usage rows | Accounted cost for this action |
| ------------------------------------------------------------------------- | ---------: | -----------------: | ---------: | -----------------------------: |
| Assistant: `  Show me TypeScript projects  `                              |          1 |                  1 |          1 |                   USD 0.002573 |
| Project search: same original text                                        |          1 |                  1 |          2 |                          USD 0 |
| Assistant: same original text again                                       |          1 |                  1 |          3 |                          USD 0 |
| Assistant: `Find TypeScript projects`                                     |          2 |                  1 |          4 |                   USD 0.001001 |
| Assistant: `Which published work could help with a product configurator?` |          3 |                  1 |          5 |                   USD 0.002398 |

The initial unconsented/declined submission created no query-cache, answer-cache
or user-query usage rows. Typing into the enabled assistant and waiting two
seconds without submitting also made no assistant/search request.

The first answer cited three public sources. Project search returned 39 ranked
projects while reusing its vector. The exact assistant repeat returned the saved
answer. The paraphrase had measured cosine similarity 0.8648446890539769 with
the first query and reused the same saved answer after the intent guard passed.
The free-form question returned a grounded answer about Konfig with five sources;
its answer was ineligible for shared reuse, so only its query vector was cached.

Total accounted cost of these five requests: **USD 0.005972**. All five usage
records reached `complete` and recorded the current consent version.

## What reached PostgreSQL

`knowledge_query_cache` contains the original submitted text, an HMAC key, a
1536-dimensional vector, and creation/expiry timestamps. The first raw text is
exactly `"  Show me TypeScript projects  "`, including both surrounding spaces.
Its creation was `2026-11-18T11:00:47.305Z` and expiry is
`2027-11-18T11:00:47.305Z`.

`knowledge_response_cache` contains the original request text, query vector,
scope/intent guard/key, the structured generated answer and actions, six public
evidence passages, and creation/expiry timestamps. Its creation was
`2026-11-18T11:00:47.880Z` and expiry is `2027-11-18T11:00:47.880Z`. Hits left both
expiry timestamps unchanged.

These are deduplicated cache entries, not a raw request log: repeated submissions
do not add another cache row. Cache tables contain no HTTP headers, cookies,
credentials or visitor identifiers. `knowledge_usage` separately records a keyed
visitor identifier, consent receipt, request kind/status, timestamps and accounted
cost. Free-form raw query text and its vector are stored even when its answer is
not eligible for shared reuse.

Expired entries immediately stop being reusable. The worker's daily cleanup
removes them physically; this browser exercise does not claim to have waited a
year or exercised a running production scheduler. Scheduler and actual expiry
deletion were verified by the separate maintenance/integration tests.

## Inspect locally

Run these read-only statements against the local database to inspect subsequent
queries without printing entire vectors:

```sql
SELECT request_text, vector_dims(embedding) AS dimensions, created_at, expires_at
FROM knowledge_query_cache
ORDER BY created_at DESC;

SELECT request_text, response, jsonb_array_length(evidence) AS evidence_count,
       created_at, expires_at
FROM knowledge_response_cache
ORDER BY created_at DESC;

SELECT created_at, kind, status, amount_micro_usd, consent
FROM knowledge_usage
ORDER BY created_at DESC
LIMIT 20;
```

Temporary inspection snapshots, including the observed answer/evidence, are in
`/tmp/homepage-cache-live-inspection-2026-11-18.json`. Browser screenshots are in
`/tmp/homepage-cache-live-{first-real-answer,project-results,final}.png`. These
temporary files are local evidence and are not required application assets.

The preview is running on port 6888 with local AI enabled. A standalone index
sync was used; no additional Notion/outbox worker was started by this test. If
the index becomes stale during a later manual test, refresh it with
`pnpm knowledge:sync` from this worktree.
