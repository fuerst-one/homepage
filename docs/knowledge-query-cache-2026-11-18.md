# Knowledge cache — 18 November 2026

Implemented in the isolated `codex/semantic-response-cache` worktree, based on
`3a54761`. The original checkout's edits are untouched. No deployment was made.
The subsequent [local browser inspection](knowledge-cache-local-inspection-2026-11-18.md)
applied the cache migrations to the local development database and enabled local
AI for real-provider testing.

## Behavior

Both project search and the landing assistant share persistent query embeddings.
Keys use HMAC with the configured server secret, model, 1536 dimensions and
normalization version. Whitespace is collapsed; case and punctuation remain
significant. Each cache entry stores the original submitted query text separately
from the normalized embedding input. API routes preserve the original message
before trimming. This is deduplicated cache storage, not a log of every request,
header or cookie. Raw text is never selected into answers for other visitors or
inserted into their prompts. No visitor identifier is stored in the cache. Raw
text and query-derived vectors are not treated as anonymous.

Supported public assistant questions can reuse validated answers and their public
evidence. Exact hits skip embedding and chat. Supported paraphrases buy an
embedding if necessary, then can skip chat. Eligibility is intentionally narrow:
explicit project-list requests for an allowlisted public topic, or overview questions
that resolve to one published project ID. Personal/free-form questions still work
but their answers are never shared. Unsupported qualifiers, multiple technologies
and quantities miss safely rather than being silently removed.

Semantic reuse requires matching parsed topic/entity and relationship, matching
language/content/model/prompt scope, and cosine similarity >= 0.75. Broad topic
requests and explicit technology-usage requests are separate intents. Negation,
ownership, about/for relationships, quantities, time, comparisons and other
qualifiers bypass shared answer reuse entirely. The guard carries the equivalence
decision; the vector score is additional evidence. Real model
calibration found React/React Native similarity 0.894, higher than the valid
Show/Find React paraphrase at 0.823. Similarity alone is unsuitable.

Eligible questions use an explicit English/German grammar and generate from a
fixed localized provider question per intent. German forms include hyphenated
topic compounds, usage questions and overview requests. Ambiguous project names
(including case and terminal punctuation), compound terminal punctuation and
unknown wording fail closed. Project overview intents carry the resolved project
ID through evidence retrieval, and canonical names must be unambiguous across
projects. Version `portfolio-answer-v3-strict-intents` prevents older generated
answers from bypassing these tighter rules; existing retained rows keep their
original expiry. See the [hardening design](plans/2026-11-18-bilingual-cache-hardening-design.md).

Cached evidence and responses pass the same answer validator on read. Ungrounded
answers, provider errors and aborted work are not persisted. Cache SQL failures
fall through to ordinary bounded provider work; successful paid output is kept
even if persistence fails, and failed provider work is never retried by the cache.
Transaction advisory locks coalesce concurrent misses across processes. These
transactions occupy the existing database pool while paid work runs and remain
bounded by the existing request deadline and concurrency limit.

New entries expire one calendar year after creation. Hits never renew that
lifetime. The old 1000-entry capacity eviction was removed: fresh entries cannot
be deleted just because the cache grows. The independent daily maintenance job
deletes expired entries even when AI is paused. Earlier required erasure is an
exception to normal retention and can be requested through the privacy contact. Backups follow the existing rotation.
Cached answers are scoped to a fingerprint of the whole public knowledge index;
content withdrawal/changes invalidate them. A final index check rejects answers
if the public knowledge revision changed while the request ran. Public project
ranking is rerun each time; result lists are not cached.

Current consent, request admission, enabled state, request quotas and conservative
budget admission remain mandatory on hits. Complete cache hits record zero
provider cost. Misses combine known embedding and chat costs; unknown costs keep
the full reservation. Admission still reserves the normal maximum before lookup,
so an exhausted operator budget can block a cache hit. Keystrokes stay local.

## Disclosure and rollout

EN/DE privacy pages and the existing consent dialog disclose shared query vectors,
public answer reuse, expiry and cleanup. Consent version `2026-11-18.3` rejects
previous receipts, including `2026-11-16.2`, `2026-11-18.1` and `2026-11-18.2`; local chat history remains a separate
choice. Withdrawal stops further client requests and removes local history;
stored text/vectors can be located for earlier erasure by contacting the site
controller with the submitted query. Normal retention is one year, rather than
an unconditional minimum that would override erasure rights.

This disclosure update does not establish that any duration is legally necessary.
[EU guidance on erasure](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/dealing-requests-individuals_en)
explains erasure following withdrawal of consent; the
[EDPB data-protection basics](https://www.edpb.europa.eu/sme/learn-the-basics/data-protection-basics_en)
require retention limits tied to purpose. This implementation provides the user's
requested normal duration and factual disclosures, without claiming legal sign-off.

Before deploying this branch, apply migrations `009-query-cache.sql` and `010-query-cache-retention.sql` as the database
administrator (the `knowledge:migrate` command includes it). They create the two
cache tables and grant only their required DML privileges to existing app/indexer
roles. Migration 010 does not extend or backfill existing short-lived records.
Legacy entries without stored text stay ineligible for reuse until replaced by
new requests admitted under the renewed notice. Deploy the worker and web with the migration and new notice together. No
production migration, release, provider-recipient change or legal sign-off is
claimed by this implementation receipt.

## Reproduce checks

```sh
# Uses an existing local development URL, creates/uses a separate _test database.
node --env-file=.env.local tests/run-knowledge-cache.mjs

# Explicit paid check; reads one already-public passage from the local index,
# copies it to a different test database, and uses normal spending reservations.
node --env-file=.env.local tests/run-knowledge-cache.mjs --provider
```

Both commands refuse remote database hosts and never enable AI or write schema
changes in the source development database. The deterministic suite clears only
its dedicated `homepage_semantic_cache_test`. The provider check uses
`homepage_cache_provider_test`, retains usage accounting and disables its AI
setting on completion. It requires configured OpenRouter/Azure access and a
sufficient test budget; it is intentionally excluded from `pnpm test`.

## Observed one-year-policy acceptance

- Repository unit/HTTP suite: **337 passed** against this worktree's production
  server at localhost:6888.
- PostgreSQL cache integration: **8 passed**, covering persistence, cross-request
  coalescing, context/expiry isolation, semantic constraints, failures, aborted
  owners, no renewal on hits, one-year retention under capacity pressure, original text, legacy migration and paused maintenance.
- Real provider acceptance: **1 passed**. One project search and four assistant
  questions used **3 embedding + 2 chat calls**, compared with **5 + 4** uncached.
  Accounted cost including existing safety margins: **USD 0.005088**. These are
  observed calls for this fixture, not a projected production savings percentage.
- A fresh process reused the persisted real answer with **zero provider calls**.
- Consent/local-search browser acceptance: **7 passed**, including no-consent,
  declined/expired/outdated receipts, withdrawal and 320px project search.
- Production build: **175 pages generated**; workspace types and scoped ESLint pass.
- Bugs, quality and security reviews returned no remaining actionable findings.

Evidence captured under `/tmp/homepage-cache-*`: `full-tests.txt`,
`db-acceptance.txt`, `real-provider.txt`, `real-vectors.txt`, `restart.txt`,
`browser.txt`, `build.txt`, `types2.txt` and `lint.txt`. The retention update is verified separately in
`year-db-final.txt`, `year-unit.txt`, `year-types-final.txt`,
`year-build-final.txt`, `year-browser-final.txt` and `year-full-tests.txt`.

## Daily pruning update

Cache cleanup now has its own independent loop, running at worker startup and
every 24 hours after a completed run, including while paid AI is paused. Usage
and admission-record cleanup keeps its existing hourly loop. Expired cache
entries stop being served at their one-year expiry and are physically removed
on the next daily run. The EN/DE notices reflect this, with consent version
`2026-11-18.3`. Scheduler behavior and actual PostgreSQL expiry deletion are
verified separately in the daily-update checks: 16 focused tests and 8 PostgreSQL
checks passed, together with workspace type checks, scoped ESLint and diff checks.
Evidence: `/tmp/homepage-cache-daily-{tests,db,types,lint}.txt`.

## Bilingual false-match hardening

The phrase corpus contains 40 approved English/German phrasings in 10 separate
intent/language groups and 67 qualified, negated or otherwise unsafe phrasings.
The real service/PostgreSQL test sets **every vector identical (similarity 1)**:
approved aliases reuse within their group, different groups generate separately,
and all 67 rejected phrases generate afresh on both their first and repeated
requests without creating shared answer rows. This checks the intent boundary
independently of embedding quality.

Additional regressions cover case/punctuation/name collisions, multilingual
aliases, canonical provider questions, resolved project evidence ownership and
old answer-namespace isolation. Focused parser checks and PostgreSQL integration
checks passed (20 and 9 tests respectively). This is a bounded equivalence policy,
not a claim that a generated answer can never be wrong.

A real German exclusion question also exposed an overconfident fresh answer
claiming catalogue-wide absence from six retrieved passages. The generation
instruction now explicitly limits claims to the retrieved subset and requires
positive evidence for exclusion constraints. Prompt version 3 isolates earlier
wording; integration tests seed both v1/v2 scopes to verify they cannot be reused.

Full regression suite: **356 passed**. Final PostgreSQL checks: **9 passed**.
Workspace types, scoped ESLint, formatting and the production build (175 pages)
passed. Independent bugs, quality and security reviews returned no remaining
findings after fixes for canonical-name identity and compound punctuation.

The final real-provider browser run at `/de`, using prompt version 3, observed:

| Request                                    | New query rows | New answer rows | Accounted cost |
| ------------------------------------------ | -------------: | --------------: | -------------: |
| `Zeige mir TypeScript-Projekte`            |              0 |               1 |   USD 0.002612 |
| `Finde TypeScript Projekte`                |              0 |               0 |          USD 0 |
| `Zeige mir TypeScript-Projekte ohne React` |              0 |               0 |   USD 0.002289 |

All three query vectors already existed from the initial German smoke run. The
paraphrase returned the same saved answer. The qualified request generated a fresh
answer acknowledging insufficient evidence to establish the exclusion; its
answer remained ineligible for sharing. Local cache totals after this run were
6 query rows and 3 answer rows, including earlier retained answer namespaces.

Local AI remains enabled with 100% rollout and a USD 3 daily admission ceiling.
The ceiling was raised from USD 2 after the index refresh hit conservative
accounting limits; the remaining 65 missing document chunks needed USD 0.47 of
indexer allowance. The refreshed index contains 98 documents and 144 chunks.
These allowance/reservation amounts are not independently verified provider bills.
No production settings, migration or release was performed.

Evidence: `/tmp/homepage-cache-harden-{unit2,db3,types,lint,full-tests,build3}.txt`
and the `german-v3-*` snapshots in
`/tmp/homepage-cache-live-inspection-2026-11-18.json`.
