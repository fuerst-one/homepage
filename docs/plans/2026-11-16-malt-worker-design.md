# Malt refresh on the sync worker

The homepage reads the existing `site_malt_mirror` snapshot. The sync worker
owns public Malt fetches and operator imports; interactive AI stays in Next.js.
The Vercel daily cron is removed and its old HTTP endpoint returns 410.

Reuse the singleton table with additive scheduling columns. A two-minute UUID
lease coordinates overlapping workers, and publication checks the lease token
before updating the snapshot and next-run timestamp together. Completed attempts,
including blocked/invalid responses, run next at 05:23 UTC. Storage failures retry
after five minutes; crashes recover when the lease expires. Poll every minute in
an independent worker loop so Notion backoff cannot stop Malt or vice versa.

Keep the current parser, source identity checks, observation ordering and stale
rate/availability rules. Failures retain the last observation without renewing its
freshness. Public browser observations can be imported directly with worker DB
credentials; inputs remain size-limited, bound to the intended profile and at
most one hour old. No browser cookies are imported.

Validate concurrency and fencing against a dedicated local PostgreSQL database,
then test the built homepage with upstream access blocked. Roll out the additive
migration before the worker and web releases. Preserve old role grants during the
rollback window; the previous release can still read the extended table.
