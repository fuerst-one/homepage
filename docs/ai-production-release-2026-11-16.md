# Controlled AI production release — 16 November 2026

Public AI is enabled at <https://fuerst.one> for a 25% keyed-IP cohort, stable
within 24-hour windows. Ordinary project search remains available to everyone.
Controls are administrator-managed in PostgreSQL `settings`; see
[AI operations](ai-operations.md) for all keys and SQL examples.

## Exact deployed source

- Source: `60f10b8274ac1ff0664d8d0441a1daf90412b20a`, pushed to `main`.
- Vercel: `dpl_AFvWRgJQe1GDyCUQE6kuVas6xuMR`, independently verified `READY`,
  assigned to production, functions in `fra1`, root `apps/web`.
- Coolify: `lxacvws32oupsoxcemvwm9fa`, independently verified `finished`.
- Only running worker: `z115ll8yc6eupo0meeo9lpbf-214715509231`, healthy.
- Worker image:
  `sha256:0488c43822a8bd64ea2fd51df8de4771eb75fa180b07f734c157597891b3c09b`.
- Provider, policy and maintenance module hashes in the worker match that source.
  Its public-content health check passed with zero pending enquiries.

Both environment release flags are true. Database `ai.enabled=true` and
`ai.rollout_percent=25` were read back after activation. Defaults remain $1/day,
$10/month, three requests/minute and 20/rolling day per keyed IP, global chat caps
20/minute and 200/UTC day, three paid operations in flight, and separate probe
caps 1/minute and 24/UTC day. Settings are read before admission and again inside
the shared paid-work transaction. Invalid/inaccessible policy fails closed.

Vercel's automatic-build hold (`exit 0`), disabled Git deployments, empty cron
configuration, and worker auto-deploy hold remain. Vercel has no production
Notion source credentials. A first unpromoted candidate with the default US
region was canceled; only the Frankfurt candidate was promoted.

## Database and backup

Backup created before additive migration 008:
`/data/coolify/backups/homepage-ai-admission/pre-008-20261116T214028Z.dump`.
It is 32,737,328 bytes, mode 0600. `pg_restore --list` read its archive.
SHA-256: `31207dc5500b5c709dbe0ee3f64f731cc41884ece603f16dec076a90d94d2ea2`.
This is a same-server backup, not a restore rehearsal or offsite copy.

Migration 008 committed successfully, including the previously missing consent
column. Existing usage was preserved and classified by operation kind.
Production privilege checks prove the web role can SELECT settings while both
web and indexer roles cannot UPDATE them. The worker independently cleans up
usage/aggregate counters older than 35 days hourly, including while AI is paused.

## Provider account and consent

Using the existing authenticated Chrome tab, created
`Homepage privacy — ZDR and approved models` guardrail
`2c40d0ed-4ddc-469c-99d7-b628a8396e10`, assigned only to the two homepage keys.
Azure and the two existing model IDs are allowlisted; OpenAI ZDR and Other ZDR
are enabled; Other retention is ZDR only; free training is off. Account paid
training and data-sharing discount were already off. Workspace input/output
logging is off and no trace destinations are configured. Other project keys and
global routing were not changed.

The current OpenRouter UI excludes direct OpenAI endpoints under strict ZDR.
Requests therefore pin Microsoft Azure, without fallback. A synthetic request
verified Azure chat and 1536-dimensional embeddings. EN/DE notices and inline
consent name Microsoft Azure; consent version is `2026-11-16.2`, invalidating the
previous recipient-policy permission. No new agreement, billing upgrade, account
creation or credential rotation was performed. The existing production key
ending `9c4` retains its $10 total provider cap. The separately listed homepage
key ending `f19` has the same privacy guardrail but was not installed as a new
runtime credential.

OpenRouter's current public DPA is incorporated into its terms; account settings
and a successful request do not establish a comprehensive legal clearance.
Existing operator agreement/transfer records and Vercel Hobby commercial-plan
eligibility remain separate follow-ups from the prior review. No purchase or
hosting migration was authorized or performed as part of those follow-ups.

## Validation and observed public behavior

- All 273 unit/HTTP tests passed; 25 worker/database and three knowledge admission
  integration checks passed against dedicated local test databases.
- Workspace type checks, ESLint, formatting, production web build and deployable
  worker artifact/import checks passed. Security, bugs and quality review findings
  were resolved; final delta reviewers returned no remaining findings.
- Seven browser cases passed across final runs: chat, consent, unavailable AI,
  consent rejection, outage recovery, stalled transport and stale outage replies.
  German mobile consent was inspected. The first local production-build browser
  attempt exposed BotID's Vercel-only script path; initialization now skips
  localhost, consistent with server-side development verification bypass.
- Public EN/DE home and privacy pages return 200 and disclose Azure. The BotID
  challenge script returns JavaScript 200 via Vercel's automatic routing, without
  additional Next.js rewrites. No protected-candidate browser bypass was used.
- With rollout temporarily zero, the existing real Chrome session passed BotID
  and recorded an excluded admission, without any paid usage.
- Temporarily enabled 100% for bounded acceptance. Real English and German
  questions returned substantive answers with public project citations/actions.
  The database recorded two completed chats and one successful synthetic probe.
  Restored and verified the agreed 25% immediately after those checks.
- A visible extraction-probe submission used local fallback and recorded
  `suspicious`; a direct curl-signature POST with valid consent also used fallback.
  Usage stayed at 88 rows across the direct bot check: 85 prior indexer records,
  two chats, one probe. No extra paid reservation was admitted for either probe.
- Public absent/expired consent returned 428, injected model parameters 400 and
  cross-origin submission 403. Synthetic conversation was cleared and its test
  permission withdrawn afterward.

Acceptance added $0.005827 in conservative application accounting, including
embedding margins, to the existing $0.85 indexing reservations. This is not the
actual OpenRouter invoice. Hourly counters contain reasons/counts only; they
count admission checks, including status polls, rather than unique visitors.
Bot detection and request heuristics cannot guarantee that all abuse is caught;
shared atomic budgets remain the final spending control.

Sanitized release evidence is retained locally under
`/private/tmp/homepage-ai-release`. No credentials are committed.

## Rollback

Pause without deploying:

```sql
UPDATE settings SET value='false'::jsonb WHERE key='ai.enabled';
```

Previous web deployment: `dpl_8aA3Nkp7FSY9jttG6c3QWXMaD8xT`, source
`46edf1f0fbaa6faee7d25dbb55b50bb93ebf67ea` (AI disabled).
Previous worker source: `218922b4623c0b16ea24694d930f8f4606506a5c`.
Retain migration 008 and subsequent usage/enquiries during rollback. The previous
worker's OpenAI-only routing conflicts with the new Azure guardrail, so align
provider code before expecting it to generate new embeddings. Keep the current
worker for routine web-only rollback. Preserve the deployment holds.
