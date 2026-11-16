# Notion database preparation — 16 November 2026

Alex authorized production database preparation without deploying the website.
This receipt covers database changes and the initial content seed only. A sibling
chat owns the separately authorized worker rollout and Vercel build hold.

## Backup and migrations

Before migration, PostgreSQL contained only the five existing knowledge tables.
The database and existing worker were healthy. A custom-format dump was created
and checked with `pg_restore --list`:

`/data/coolify/backups/homepage-notion-prep/pre-003-20261116T174535Z.dump`

The dump is 1,615,548 bytes, mode 0600, in a mode-0700 directory on the existing
server. It is a same-server backup; no restore rehearsal or offsite copy was made.

Applied `003-notion-resilience.sql` and `004-notion-access.sql` in one committed
transaction. Neither the historical access migration 002 nor the concurrent
privacy changes to migration 001 were applied.

- Migration 003 SHA-256: `cbb51d3a57929625c84b724518650f8937e434de29ad134ab0ead11285da6105`.
- Migration 004 SHA-256: `4a2e89f8902b69d8bf8c4e4d3840638c9fe28b82a68ab0de3f42e303fcde9c15`.

Using the website's production credentials, verified TLS and these permissions:

- `homepage_app` can read snapshots and assets, but cannot insert/update/delete
  either table, access the Notion request gate, or create tables.
- The app has the intended DML access to the enquiry outbox and Malt mirror.
- `homepage_indexer` has DML access to all five new tables.

## Content and rollout checkpoint

The first seed stopped before publication because Vercel's API does not expose
the sensitive owner-page ID. The existing local owner ID was then validated
against Notion using the production integration. Secrets stay in runtime memory.

The content seed uses the worker role over verified TLS and runs only
`scripts/notion.ts sync`: no embeddings, AI requests, enquiry pages or mentions.
It published `website-v1` at **2026-11-16T17:53:31.598Z**, containing 42 public
projects, 30 case-study bodies, 42 case-metadata records, 21 copy entries and
117 mirrored images (37,587,626 bytes). No images were deferred and no case
bodies were incomplete. The existing Malt observation was imported as one row.
The enquiry outbox remains empty; no real notification test was sent.

At 17:54:09 UTC, the website's `homepage_app` role read the related sections and
all 117 image bodies using the production TLS connection. Its Notion token was
removed and all JavaScript fetch calls were blocked: zero fetch attempts occurred.
The non-secret verification record is in the ignored
`coverage/notion-resilience/production-readiness.json`.

The existing worker was missing these runtime keys. The sibling rollout added
them as runtime-only settings and verified their configuration before deployment:

- `NEXT_NOTION_OWNER_CONTACT_ID` from the existing validated local configuration.
- `NEXT_NOTION_CV_SIGNUP_DATABASE_ID` from Vercel production.
- `NOTION_ENQUIRY_MENTION_USER_ID` from Vercel production.

Vercel's production pointer was independently verified unchanged at
`dpl_HcVDWxhXPRG95GQRUf9y7htgCgJv`, with ignored-build command `exit 0` set by the
sibling chat. Both production assistant flags remain `false`. This preparation
does not switch the live website to database reads or activate the new worker.
