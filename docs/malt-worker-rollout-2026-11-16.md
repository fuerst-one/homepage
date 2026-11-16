# Malt worker rollout — 16 November 2026

Source release: `218922b4623c0b16ea24694d930f8f4606506a5c` on
`codex/web-sync-split`. This follows the independently deployed web/sync split.
Interactive AI stays in Next.js and remains disabled in production.

## Change and safeguards

The existing `site_malt_mirror` table remains the source for homepage Malt terms.
Migration 007 adds the durable next-run timestamp and a two-minute fenced lease.
The worker polls independently each minute; completed attempts schedule the next
05:23 UTC run. Storage failures back off five minutes. Failed source fetches keep
the previous observation without renewing its freshness. The existing seven-day
rate expiry and dated availability checks are unchanged.

The old web refresh/import endpoint returns 410. Operator imports now go directly
through the worker with bounded public observations and no browser credentials.
The Vercel daily cron is removed by the web release. ts-shove moved both refresh
and fetch files; shared database code imports no application modules.

## Validation

- 241 unit/HTTP tests and 25 real PostgreSQL integration tests passed.
- New behavior coverage includes concurrent claims, expired-lease fencing,
  persisted daily scheduling, retry release, last-good-data preservation and
  source/freshness validation for imports.
- A review found an empty legacy seed could erase a concurrent observation.
  A regression test reproduced the loss before the fix and passes after it.
  Final bug and security reviews returned no open findings.
- Type checks and lint passed. The Next.js production build passed with Notion,
  signed source assets and Malt fetches blocked.
- The worker artifact and linux/amd64 production image built. Runtime imports
  passed with Next.js and React absent.
- The original checkout's unrelated privacy changes remain untouched: 20 tracked
  files, 607 insertions and 211 deletions, plus its pre-existing untracked files.

## Production database

A restricted backup was created before the additive migration:
`/data/coolify/backups/homepage-malt-worker/pre-007-20261116T194034Z.dump`.
It is 32,737,050 bytes, mode 0600; `pg_restore --list` validated 68 archive lines.
SHA-256: `8d7207976384642891a45750b7855339abf82e757ee4648adf4becbe19a26ac7`.
This checks archive readability, not a full restore rehearsal.

Migration 007 committed successfully. The observation remained
`2026-11-14T23:50:02.830Z`; existing role grants were preserved for rollback.
Migration SHA-256:
`fd31fb32551a5e29fbf73f81c74f60ea693a0f2ae03ecfa2f2872dfc08168c76`.

## Deployed services and live checks

- Coolify deployment `imdye4xn6smj8kx1u8ohjhl9` finished at
  `2026-11-16T19:47:47Z`. Container
  `z115ll8yc6eupo0meeo9lpbf-194225038902` is healthy and its Malt source hashes
  match the release. Image:
  `sha256:a2513fed99b6c6d8353a59e65d36f79b517ee83d7ca6a24336220d4718b4c8c5`.
- Worker health reports fresh public content and zero pending enquiries. Source
  credentials and the owner mention remain configured, with Next.js/React absent.
- The worker attempted Malt at `2026-11-16T19:42:49.115Z`. The source blocked the
  fetch, so the original €750/day observation remains unchanged, availability
  remains unknown and freshness was not extended. The lease is clear and the
  next run is `2026-11-17T05:23:00Z`. This proves background attempts and safe
  retention; automatic retrieval is still subject to the source challenge.
- Vercel deployment `dpl_E3azjQdG4G7s3kXTSBZW9nw1BcL2` is the production target
  for [fuerst.one](https://fuerst.one), from the exact same source SHA. It retains
  native Next.js hosting, `apps/web` root and Node 24. Vercel cron definitions
  are empty; GET and POST to the retired Malt endpoint return 410.
- Candidate and live HTTP checks passed: 14 page/API checks, all 117 mirrored
  images (37,587,626 bytes, hashes checked), Next image optimization and ISR.
  Both public profile checks return the original Malt rate/date and null
  availability. Private profile fields remain absent.
- Browser checks passed on candidate and live in English and German: named
  navigation works, mobile overflow is absent and no page errors occurred. The
  live browser initially could not launch under the local sandbox; it passed
  with the same browser permissions used for the candidate check.
- Public AI flags remain false, Vercel's build hold and worker automatic-deploy
  hold remain in place, production Notion secrets remain absent from Vercel,
  and temporary candidate test access was revoked.

Sanitized command results and checks are retained under the local ignored
`coverage/malt-worker-rollout` directory. Operational commands and recovery are
in [content operations](notion-content-operations.md#malt-refresh).

## Rollback

Previous web deployment: `dpl_4AbxrJzpGyki6Uw3T2aE1ieWT5TZ`.
Previous worker source: `7898980b6356d3ad496fa4063f4b9ee495f6fe0f`.
Previous worker image:
`sha256:956ddd3a69c63fac61b2f6dc5a80400c75ab7aec3fbdb66f8023b8a15ec49aa7`.

Roll both services back together to restore the old Vercel cron owner. Keep
migration 007: its additive columns are compatible with the previous release.
Confirm cron definitions after web rollback and retain the deployment holds and
both disabled AI flags. No enquiry smoke test was repeated for this Malt-only
change, so no additional owner notification was created.
