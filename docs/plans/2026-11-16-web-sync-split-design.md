# Independent web and sync applications

Approved scope: extract the committed worker base (`78f0ce0`) into a pnpm
workspace, leaving concurrent privacy work in the original checkout. No production
migration, deployment, build-hold change, or AI activation is part of this change.

## Boundaries

- `apps/web`: Next.js application, routes, UI and web-only dependencies. Reads
  published content/assets and writes durable enquiries. No Notion SDK or secrets.
- `apps/sync`: standalone TypeScript worker, Notion adapters, content preparation,
  asset mirroring, enquiry delivery and indexing. No Next.js/React dependencies.
- `packages/content`: source-neutral DTOs and existing shared domain utilities.
- `packages/database`: verified-TLS connection, publication readers, enquiry and
  Malt persistence, migrations. No imports from either application.
- `packages/knowledge`: existing provider/budget/cache runtime used by web chat
  and background indexing. No application imports.

Use explicit workspace dependencies and independent production artifacts. Root
commands forward to the appropriate application. Keep the shared lockfile and
existing pinned framework/provider versions.

## Public publication

The worker constructs allowed fields before storage: public project/client data,
reviewed locale variants, safe rich text, supported case blocks and mirrored image
references. Exclude hidden/archived/unreviewed content, contact relations, private
client contact details and unused owner fields. Preserve the public CV contact
fields used by existing rendering. Resolve source links and image routes during
publication; the website only renders prepared records.

Create a versioned public publication table through an additive migration. Keep
existing deployed tables intact for the running worker and rollback. A single
publication contains locale variants, blocks and the active image manifest; reads
must never straddle revisions. Source cache/leases remain worker-only. Public
asset access is scoped to the active manifest. Content publication stays separate
from paid embeddings; withdrawn source records must also leave retrieval results.

## Verification and sequence

1. Capture existing unit/integration behavior; add failing publication boundary
   tests before changing publication behavior.
2. Move modules with ts-shove and update package/test/tooling paths.
3. Implement the allowlisted public publication and simplify web readers.
4. Check frozen install, dependency boundaries, typecheck, unit/Postgres suites,
   independent worker image and Next build with Notion unavailable.
5. Run local browser/HTTP acceptance and independent review. Record exact results
   and remaining rollout steps. Retain the isolated worktree for review.

The currently deployed worker stays pinned to `81106e8`; Vercel remains held.
