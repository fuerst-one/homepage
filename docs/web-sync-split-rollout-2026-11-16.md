# Web/sync production rollout — 16 November 2026

Alex authorized deploying the tested web/sync split, keeping public AI disabled.
The release ran from isolated branch `codex/web-sync-split`; the original checkout’s
uncommitted privacy/consent work was preserved. `main` was unchanged.

## Exact production revisions

Both applications run source commit `7898980b6356d3ad496fa4063f4b9ee495f6fe0f`.

- Vercel project: `fuerst-one-homepage`, `prj_Q8Pcq8jFFEAyztkMCPaF0M7O6WEV`.
- Vercel deployment: `dpl_4AbxrJzpGyki6Uw3T2aE1ieWT5TZ`, `READY`.
- Public site: <https://fuerst.one>; project root `apps/web`.
- Candidate: `fuerst-one-homepage-bpe50z1rm-fuerstones-projects.vercel.app`.
- Production promotion completed at approximately `2026-11-16T19:10:29Z`.
- Native Next.js 16.2.4 deployment, Node 24.x; functions remain in `fra1`.
- Coolify application: `homepage-knowledge-sync`, `z115ll8yc6eupo0meeo9lpbf`.
- Coolify deployment: `tfq4jw63c5g4fovyg7h01dqc`, finished at `19:03:18Z`.
- Running worker container: `z115ll8yc6eupo0meeo9lpbf-185722796384`.
- Production worker image: `sha256:956ddd3a69c63fac61b2f6dc5a80400c75ab7aec3fbdb66f8023b8a15ec49aa7`.

The worker’s publication, refresh and index-fencing module hashes match the exact
release source. Its production runtime cannot resolve Next.js or React. Only the
new worker container remains running, and its maintenance health check passes.
It published autonomously after the seed, including at `19:08:03.808Z`.

## Database preparation

Created and checked a custom-format database backup before migrations:

`/data/coolify/backups/homepage-web-sync-split/pre-005-20261116T185305Z.dump`

The file is 32,266,457 bytes, mode 0600 in a mode-0700 directory. SHA-256:
`dbc986aefdbd8446c28054e3ca0c4dfb7c187f4d8126709b56efed98b6d4e747`.
`pg_restore --list` successfully read its archive. This is a same-server backup;
no restore rehearsal or offsite copy was performed.

Applied the following additive migrations in one committed transaction:

- 005: `afa8d8ef19a182d9ad43b178675241dd07d745071441dc187a907e5fd7315c0f`.
- 006: `46f7f0af739dba9c3b951ba1f78fa160c74796e38881bd1373920536f2623686`.

The website role can read the public publication/view and cannot publish. Legacy
SELECT grants remain available for rollback. The worker has publication DML.

Seeded `website-v2` at `18:56:03.976Z`: 42 projects, 30 case studies, 117 images,
37,587,626 image bytes, zero deferred assets. The public payload excludes the
worker’s source cache. Using the website’s actual production role and verified
TLS, read all sections and all 117 images with its Notion token empty and all
JavaScript source fetches blocked: zero source fetches occurred.

## Environment and deployment controls

Removed all five Notion-related settings from the Vercel production target;
existing preview/development settings were preserved. The worker retains the
source and mention settings. All worker settings are now runtime-only, excluded
from Docker build-time variables. No credentials were changed or printed.

Both production flags remain `false`:

- `KNOWLEDGE_ASSISTANT_ENABLED`.
- `NEXT_PUBLIC_KNOWLEDGE_ASSISTANT_ENABLED`.

Vercel’s ignored-build command remains `exit 0`, repository Git deployments stay
disabled, and Coolify auto-deploy remains disabled. This was an explicit manual
release. Vercel’s Malt cron remains enabled on the new deployment at `23 5 * * *`.
An automation bypass was created for protected-candidate testing and revoked after
the live checks; no temporary test-access token remains active.

The installed Vercel CLI was rejected as outdated. Used CLI 65.16.0 from a
temporary package cache without replacing the globally installed CLI.

## Candidate and live verification

Built the candidate from an archive of the exact source commit, with production
settings but without assigning the public domains. Only after it passed the
checks below was that same immutable deployment promoted. Independently confirmed
the live production target and commit through the Vercel API afterward.

Both the protected candidate and the public domain passed:

- English/German home, project, contact, service and case-study pages; public
  profile/project APIs, sitemap and robots responses.
- All 117 published image routes matched PostgreSQL byte counts and SHA-256 hashes.
- Native Next.js image optimization returned a valid optimized image.
- Prerender/ISR responses retained their headers; the live projects page showed
  `x-vercel-cache: HIT` and `x-nextjs-prerender: 1`.
- Chromium navigation, named project filters and English/German rendering passed,
  with no page errors and no horizontal overflow at 390px.
- Public AI UI, background availability polling and storage writes stayed disabled.
  The assistant API returned 503 and availability returned false.
- Profile responses omitted private owner contact/address/rate fields.

The [local verification receipt](web-sync-split-verification-2026-11-16.md)
records the preceding 239 unit/HTTP, 20 database and two offline acceptance tests.

## Real enquiry delivery check

Submitted one clearly labelled synthetic enquiry through the live public API:
`DEPLOYMENT TEST - no reply needed`, using an `example.invalid` email address.
No real client was contacted. Both the initial submission and identical retry
returned 201 with receipt `c786df6a-b321-40c0-8f1b-ca6b78a9c30e`.

The worker delivered it at `19:11:29.666Z` on its first attempt. Independently
queried Notion: exactly one page and one mention of the configured owner exist.
The test page remains available for owner inspection:
<https://www.notion.so/41a86514f73681eb96f6d2f683d90500>.

The outbox payload was cleared after delivery and zero enquiries remain pending.
The API checks prove the page and mention exist; they do not independently prove
that the owner saw an Inbox notification or toast.

## Rollback and follow-up

The previous Vercel production deployment is
`dpl_HcVDWxhXPRG95GQRUf9y7htgCgJv`, source
`c884101ef6d933ec4e4616d4cc349a6242730f2c`. The previous worker is
`81106e8475a7d89fd903207e2c513d881292b2b5`. Application rollback should retain the
additive database tables and subsequent enquiries. The legacy snapshot, its
SELECT grants and referenced image bytes remain available during that window.
Private configuration checkpoints are under `/private/tmp/homepage-split-rollout`
(mode 0600 for credential material); none are committed.

After the rollback window, explicitly retire the legacy snapshot and revoke its
web-role SELECT grants. Before restoring automatic deployments, reconcile the
split onto the intended deployment branch and port the separate privacy work to
the moved paths. Public AI activation remains a separate release. Non-secret
local evidence is saved under ignored `coverage/web-sync-rollout/`.
