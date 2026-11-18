# fuerst.one

The source for [fuerst.one](https://fuerst.one): a bilingual portfolio, project browser, and freelance enquiry website built with Next.js and TypeScript. Project and profile content is maintained in Notion and published to PostgreSQL by a background worker, so public page requests do not depend on the Notion API.

This repository contains homepage implementation, content infrastructure and
technical documentation. Project screenshots, illustrations, editable visual
sources and editorial backfill receipts belong in Notion or a separate content
workspace, outside this repository. The website consumes published content and
mirrored assets from PostgreSQL.

## What the application does

- Presents projects, technical experience, and case studies in English and German, with project filters and data visualizations.
- Provides service pages and an enquiry flow. Submissions receive a database-backed receipt before a worker delivers them to Notion and adds the configured owner mention.
- Publishes project images into database-backed asset storage, retaining the last successful publication when a source refresh fails.
- Includes an optional assistant that retrieves published portfolio content. Its UI/API release flags, consent flow, quotas, and shared spending limits are separate from ordinary browsing and content publication.

## Architecture

```text
Notion content + images
        |
        v
apps/sync -----> PostgreSQL publications + asset bytes -----> apps/web
        ^                        ^                              |
        |                        |                              |
        +---- enquiry outbox <---+---- enquiry receipt <--------+
```

The web application reads public projections rather than raw Notion records. The worker owns source credentials, content publication, asset mirroring, and asynchronous delivery. PostgreSQL is required for the website even when AI is disabled.

| Workspace            | Responsibility                                                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`           | Next.js App Router website, localized pages, public APIs, and enquiry receipts                                                                           |
| `apps/sync`          | Content/asset publication, enquiry delivery with Notion mentions, daily Malt refresh, and optional knowledge indexing; packaged without Next.js or React |
| `packages/content`   | Public types and shared domain utilities                                                                                                                 |
| `packages/database`  | Persistence, public readers, and SQL migrations                                                                                                          |
| `packages/knowledge` | Provider integration, budget admission, and embedding cache                                                                                              |

The frontend uses React, Tailwind CSS, ECharts, Zustand, and Three.js/React Three Fiber. The two applications are built and deployed separately.

## Development

Use Node 24+, pnpm 10.13.1, and Docker for the local PostgreSQL service.
Root commands load the ignored `.env.local`.

```sh
cp .env.example .env.local
```

Configure `KNOWLEDGE_DB_PASSWORD` and the matching `KNOWLEDGE_DATABASE_URL`, then supply the worker's Notion integration token and source database/page IDs from `.env.example`. The integration needs access to the configured Notion sources. This repository does not bundle a copy of the portfolio's content database.

The web only needs its database settings; source credentials belong to the worker. Leave both assistant release flags false for a content-only setup. Provider credentials are needed only for optional AI operations; see [AI controls](docs/ai-operations.md).

```sh
pnpm install --frozen-lockfile
pnpm knowledge:db
pnpm knowledge:migrate
pnpm notion:sync
pnpm dev
```

The web runs at <http://localhost:6894>. Use `pnpm notion:watch` for content and
notifications plus Malt refresh, or `pnpm knowledge:watch` to include indexing. Run one worker
watch command, not both. `pnpm notion:status` reports publication/outbox progress.

Malt refresh uses the existing `site_malt_mirror` table and a durable daily schedule.
See [Malt operations](docs/notion-content-operations.md#malt-refresh) for worker commands,
manual public observations and recovery.

## Build and verification

```sh
pnpm typecheck
pnpm test
pnpm test:notion:integration
pnpm build
pnpm build:sync
```

HTTP tests need `SEO_TEST_BASE_URL` pointing to the local built website. Database
integration tests refuse remote databases and use a separate `_test` database.
`pnpm build:sync` creates `build/sync`, a portable runtime containing only worker
production dependencies. Its entrypoint is `node --import tsx scripts/knowledge.ts watch`.
The container build uses repository-root context:

```sh
docker build -f ops/knowledge/Dockerfile -t homepage-sync .
```

## Rollout

The web application deploys on Vercel from `apps/web`; the knowledge and Malt
worker deploys separately on Coolify. Both follow `main` automatically on push.
Vercel's ignored-build override must remain unset, and the Coolify worker must
follow the branch tip rather than a pinned commit. AI rollout and spending
controls remain independent of deployment settings.
See [automatic deployments](docs/automatic-deployments.md) for trigger,
verification and release-hold details.

Migrations 005/006 and the `website-v2` seed are complete. Preserve the old
publication tables and grants for rollback, then explicitly retire them after
that window.

See [the Malt worker rollout receipt](docs/malt-worker-rollout-2026-11-16.md)
for that release's deployment IDs, live verification and rollback details. The
[initial split rollout](docs/web-sync-split-rollout-2026-11-16.md) records the
underlying web/content migration.

See [the split design](docs/plans/2026-11-16-web-sync-split-design.md),
[local verification](docs/web-sync-split-verification-2026-11-16.md),
[content operations](docs/notion-content-operations.md) and
[the verified previous rollout](docs/notion-worker-rollout-2026-11-16.md).

## Author

Created by [Alexander Fürst](https://fuerst.one). The repository documents the running website and its content infrastructure; historical rollout receipts describe their dated releases.
