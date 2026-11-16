# AI controls

AI controls live in PostgreSQL `settings(key text primary key, value jsonb,
updated_at timestamptz)`. Connect as administrator to edit them. Web and indexer
roles have SELECT only on this table. There is no public configuration endpoint.
Keep credentials and secrets in the existing environment, never in this table.

Migration `008-ai-admission.sql` adds the controls, structured consent column,
usage kinds and hourly aggregate counters. It is safe to rerun and preserves
configured values. Back up production before applying it as administrator.

| Key                     | Default | Meaning                                               |
| ----------------------- | ------- | ----------------------------------------------------- |
| `ai.enabled`            | `false` | Pause interactive AI and paid recovery checks         |
| `ai.rollout_percent`    | `25`    | Eligible share, 0–100                                 |
| `ai.lottery_hours`      | `24`    | Stable IP-based lottery window, 1–168 hours           |
| `ai.daily_budget_usd`   | `1`     | Shared UTC-day budget, including indexing/probes      |
| `ai.monthly_budget_usd` | `10`    | Shared UTC-month budget                               |
| `ai.visitor_per_minute` | `3`     | Chat admissions per keyed IP in rolling minute        |
| `ai.visitor_per_day`    | `20`    | Chat admissions per keyed IP in rolling 24 hours      |
| `ai.global_per_minute`  | `20`    | Chat admissions across all instances, rolling minute  |
| `ai.global_per_day`     | `200`   | Chat admissions across all instances, UTC day         |
| `ai.concurrency`        | `3`     | Paid operations globally in flight                    |
| `ai.probe_per_minute`   | `1`     | Synthetic recovery admissions, rolling minute         |
| `ai.probe_per_day`      | `24`    | Synthetic recovery admissions, UTC day                |
| `ai.block_bots`         | `true`  | Known automation signatures and production BotID      |
| `ai.block_suspicious`   | `true`  | Obvious extraction/injection/control-character probes |

Use real JSON booleans/numbers, not quoted JSON strings. Invalid values fail
closed. Settings are read per request and again inside atomic paid admission;
budget environment variables from older releases no longer control admission.
Missing keys use conservative defaults. Missing table or unavailable DB uses local
suggestions. Both environment release flags must also be true; changing those
requires a web deployment. A database change affects subsequent requests, not
already transmitted operations.

```sql
-- Pause immediately, preserving ordinary browsing/search and corpus maintenance.
UPDATE settings SET value='false'::jsonb WHERE key='ai.enabled';

-- Example: offer AI to half of eligible traffic.
UPDATE settings SET value='50'::jsonb WHERE key='ai.rollout_percent';

SELECT key,value,updated_at FROM settings WHERE key LIKE 'ai.%' ORDER BY key;
SELECT hour,reason,count FROM knowledge_admission_counts ORDER BY hour DESC,reason;
SELECT kind,status,count(*),sum(amount_micro_usd)/1000000.0 AS accounted_usd
FROM knowledge_usage
WHERE created_at >= date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
GROUP BY kind,status;
```

Lottery assignment uses an HMAC of a keyed IP hash and a fixed time window. It
adds no cookie, does not use arbitrary forwarded IP headers, and cannot be
rerolled by refreshing. Visitors on a shared IP share eligibility. Changing the
percentage/window changes cohort membership. The uncached status endpoint
returns `eligible` separately from service health and, for selected visitors,
`eligibleUntil`. The browser starts with the original search UI, without AI
controls or consent restoration. Only explicit eligibility enables AI UI;
consent is offered only after verified health. Unknown eligibility leaves saved
choices untouched; explicit exclusion clears consent/history just like a
disabled release. Exclusion also closes any open AI UI. The browser rechecks at
the lottery boundary even while healthy, and every new paid question rechecks
admission and quotas. Public privacy disclosures remain visible to everyone
while the AI release is enabled.

BotID is initialized for assistant POST/status GET only, with no analytics SDK.
No BotID calls run with the public release flag false. Production bot verification
must succeed; failures fall back locally. Local development skips external bot
verification. Bot signatures and text heuristics are imperfect; OpenRouter
budgeting, fixed models, bounded input/output and allowlisted actions remain the
spending/action boundary. Do not claim every bot or malicious prompt is detected.

Successful synthetic probes are shared through usage records for one hour,
avoiding a paid check per cold instance. Instances that observed an actual
dependency failure verify recovery themselves. Probe quota contention waits
without declaring a dependency outage. Indexing continues while interactive AI
is paused, within the shared budget. Unknown costs retain reservations; accounted
spend may exceed the actual provider bill. Chat reserves $0.10 and indexing/probes
$0.01 before calls; completed chat/probes include a conservative embedding margin.

The worker deletes usage and hourly counters older than 35 days each hour,
independent of traffic/AI pause. Admission also prunes expired usage. Monitor the
worker's cleanup loop; this is not a hard expiry during worker downtime. Backups
may retain deleted records through their configured seven-day rotation.
Counters describe admission checks, including status polling, not unique people.
No questions, answers or IP hashes appear in aggregate counters.

## Provider and consent

Route only to Azure for `openai/gpt-4.1-mini` and
`openai/text-embedding-3-small`, with no provider fallback, no-training and ZDR.
Guardrail `Homepage privacy — ZDR and approved models` is assigned to the two
homepage keys in OpenRouter, with Azure and these two models allowed, OpenAI ZDR
and Other ZDR enabled, Other retention set to ZDR only, and training disabled.
Other project keys retain their existing settings. Input/output logging,
data-sharing discount and broadcast destinations were checked separately.
Changing recipients requires updated notices and a new consent version.

OpenRouter's DPA is incorporated into its terms; retain the applicable version
and transfer/subprocessor review with the operator's records. Guardrails do not
establish EU-only processing or remove legal safety exceptions. Current provider
terms: <https://openrouter.ai/data-processing-agreement> and
<https://openrouter.ai/docs/guides/features/zdr>.

Rollback: set `ai.enabled=false`, restore the recorded prior web/worker revisions
if needed, and retain the additive migration and new usage records. Leave manual
deployment holds in place. Verify exact revision, live consent, real provider
answers, excluded/bot fallback and database quota state after each rollout.
