# Database-first website content

The durable worker base is deployed; see the
[worker rollout receipt](notion-worker-rollout-2026-11-16.md). Vercel automatic
deployments remain held, and the live website has not switched to these readers.

The public web app needs PostgreSQL, not a live Notion connection. All normal
page renders, project/profile APIs, case studies, and image routes read published
rows or mirrored image bytes. A worker failure leaves the last publication
available. Notion remains the editing interface and enquiry inbox.

## Initial rollout (order matters)

1. As the database administrator, apply `ops/knowledge/003-notion-resilience.sql`,
   then `004-notion-access.sql`. Both are additive and rerunnable. Do not run
   `002-production-access.sql` again: it contains broader historical grants.
2. Keep the existing worker running until ready to replace it. Build the updated
   `ops/knowledge/Dockerfile` with runtime-only secrets. Its existing
   `scripts/knowledge.ts watch` command now starts independent content and
   enquiry loops even with public AI disabled.
3. Run `node --import tsx scripts/notion.ts sync` once with the worker's runtime
   environment. This seeds content, case bodies, image bytes, and the existing
   Malt observation. Confirm publication and image counts. The website cannot
   serve a new database before this seed; it never falls through to Notion.
4. Start the updated worker and check `scripts/notion.ts status` and `health`.
   Confirm the Notion enquiry DB ID and real `NOTION_ENQUIRY_MENTION_USER_ID` are
   present on the worker (previously these may only have been on Vercel).
5. Deploy the web app with its existing `KNOWLEDGE_DATABASE_URL` and verified
   TLS CA. It does not require `NEXT_NOTION_TOKEN`. Keep the existing public AI
   flags disabled until the separate privacy work authorizes them.
6. Verify public pages, project/profile APIs, and images. Submit an explicitly
   authorized test enquiry and inspect its Notion page, mention and actual
   owner notification. A test adapter proves delivery behavior but cannot prove
   that Notion delivered a real notification to the owner's account.

No production schema, deployment or real test enquiry was changed by the local
implementation alone. Retain the previous web release for rollback. Preserve
PostgreSQL tables and the existing worker until the replacement is healthy.

## Cadence and recovery

- The enquiry loop polls every five seconds, claims at most five rows per batch,
  and retries failures with increasing delays up to one hour. Content/AI work
  runs independently. Notion throttling may delay notifications, but visitors
  receive receipts after the database commit. A lost page/mention response is
  reconciled before another write. Exactly-once delivery across an arbitrarily
  long network partition cannot be guaranteed by the Notion API.
- The content loop checks every minute and refreshes when the publication is
  five minutes old. Successful updates appear in rendered pages after Next's
  further 60-second ISR window (plus the refresh duration). APIs read the current
  publication; the projects API retains its existing 60-second CDN cache.
- A failed source read retains the entire previous publication. An image failure
  retains that route's prior bytes if available and reports a deferred count.
  Only public linked case bodies and approved image origins are followed. Source
  snapshots remain server-only; existing public DTOs omit private owner fields.
- Unknown image hosts are rejected rather than fetched. Add a reviewed hostname
  to `mirrorAsset.ts` when intentionally adopting another image source. Each file
  is limited to 8 MiB. Old, unreferenced asset versions are collected after a day.
  Database backups now include these bytes and pending enquiry payloads.
- Delivered enquiry payloads are erased after the page and configured mention are
  confirmed. Receipt IDs/fingerprints expire after 30 days. Pending payloads remain
  until delivered; review old pending records and honour erasure requests in both
  PostgreSQL and Notion. Existing backups expire under the backup policy.
- `scripts/notion.ts status` reports publication age, pending count/oldest receipt,
  maximum attempts and the shared cooldown, without private content. `health`
  fails if content is over 30 minutes old or an enquiry is pending over 15 minutes.
  Inspect sanitized worker codes for schema/grant/auth errors; a 429 cooldown
  normally clears automatically. Database downtime remains a website dependency.

## Local commands

`pnpm notion:migrate`, `pnpm notion:sync`, `pnpm notion:watch`, and
`pnpm notion:status` use `.env.local`. The standalone Notion watcher performs no
paid AI work. The existing knowledge watcher includes the same Notion loops;
run one watcher per intended worker, not both. Leases still tolerate overlap.

For integration tests, create the dedicated local database once:

```sh
docker exec homepage-knowledge-db-1 createdb -U homepage homepage_notion_test
pnpm test:notion:integration
```

The test runner derives a localhost test URL from `.env.local`, uses separate
processes sequentially, and refuses remote databases. An optional
`NOTION_TEST_DATABASE_URL` must point to a localhost database ending in `_test`.
Tests use synthetic Notion responses and create no real pages or notifications.
