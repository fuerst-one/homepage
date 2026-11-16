# fuerst.one

A pnpm workspace with two independently packaged applications:

- `apps/web`: Next.js website. Reads prepared PostgreSQL publications and writes
  enquiry receipts; it has no Notion dependency or credentials.
- `apps/sync`: background content/asset publication, enquiry delivery with Notion
  mentions, and optional knowledge indexing. It has no Next.js or React dependency.
- `packages/content`: public types and shared domain utilities.
- `packages/database`: persistence, public readers and migrations.
- `packages/knowledge`: shared provider, budget and embedding-cache runtime.

## Development

Use Node 24+ and pnpm 10.13.1. Root commands load the ignored `.env.local`.
The web only needs its database settings; source credentials belong to the worker.

```sh
pnpm install --frozen-lockfile
pnpm knowledge:db
pnpm knowledge:migrate
pnpm notion:sync
pnpm dev
```

The web runs at <http://localhost:6894>. Use `pnpm notion:watch` for content and
notifications alone, or `pnpm knowledge:watch` to include indexing. Run one worker
watch command, not both. `pnpm notion:status` reports publication/outbox progress.

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

The split is **not deployed**. The running worker remains pinned to `81106e8`,
and Vercel deployment holds remain in place. Before the split is released, apply
migrations 005/006 as administrator, seed `website-v2`, then validate the new worker
before releasing the website. Keep the old publication tables and SELECT grants for rollback. After the rollback
window, separately revoke the web role’s legacy snapshot/asset grants.
Vercel's future project root is `apps/web`; do not change the live project root or
remove deployment holds as part of a local build.

See [the split design](docs/plans/2026-11-16-web-sync-split-design.md),
[local verification](docs/web-sync-split-verification-2026-11-16.md),
[content operations](docs/notion-content-operations.md) and
[the verified previous rollout](docs/notion-worker-rollout-2026-11-16.md).
