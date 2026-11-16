# Web/sync split verification — 16 November 2026

The split was implemented from committed base `78f0ce0` in isolated branch
`codex/web-sync-split`, worktree `/private/tmp/homepage-web-sync-split`. The original
checkout’s privacy/consent work was left untouched. This receipt describes local
verification; no production migration or deployment was performed.

## Implementation

- ts-shove previewed and applied a 250-file move manifest, rewriting references.
  Follow-up edits replaced cross-package paths with declared workspace imports.
- `apps/web` reads a prepared, localized version-2 publication and mirrored image
  bytes from PostgreSQL. It contains no Notion SDK imports or source credentials.
- `apps/sync` independently prepares that publication, mirrors assets, delivers
  durable enquiries with Notion mentions, and optionally indexes public evidence.
  Source block/revision caches stay outside the public publication.
- Publication writes retain the existing lease fence. Readers obtain related
  sections from one publication. Withdrawals and redactions atomically remove
  changed search documents and invalidate retrieval before paid indexing work.
  Index commits check the source publication revision to reject stale work.
- Migrations 005/006 add the new public table/view and grants. Existing reader
  permissions and legacy image references remain valid through the rollback
  window. Neither migration has been applied to production by this change.

## Local acceptance

| Check                                        | Result                                                  |
| -------------------------------------------- | ------------------------------------------------------- |
| Frozen workspace install                     | Passed, pnpm 10.13.1                                    |
| TypeScript and ESLint                        | Both applications passed                                |
| Prettier                                     | Passed                                                  |
| Unit and built-site HTTP tests               | 239 passed                                              |
| Dedicated local PostgreSQL integration tests | 20 passed                                               |
| Chromium offline acceptance                  | 2 passed                                                |
| Next.js production build                     | Passed with Notion fetches blocked and token empty      |
| Worker production artifact                   | Built and imported outside the workspace                |
| Worker Linux amd64 image                     | Built; runtime imports passed with network disabled     |
| Worker dependency isolation                  | Next.js and React cannot be resolved in either artifact |
| Image health command                         | Passed against a disposable local database fixture      |

Offline browser acceptance covered the homepage/avatar, a published case study,
image bytes, a durable enquiry receipt, duplicate retry and changed-payload
conflict. Synthetic SDK integration covered 429 preservation, hidden-project and
locale/body withdrawal, unchanged body caching, old-image rollback retention,
lease loss, stale index rejection, and reconciliation of an uncertain mention
response without duplicate pages/mentions. No real Notion notifications or paid
provider calls were made.

Read-only bug, security, code-quality and UI reviews ran. Confirmed findings were
fixed: pre-cutover grants, relocated icon-seeder input resolution, unchanged body
cache reuse, withdrawal/index fencing, independent indexing limits, and retention
of legacy image bytes. The icon seeder was checked without credentials: it loads
its local inputs and stops at the intended environment check without networking.

Final local worker image: `sha256:770f8e0cc385e488dd9a5bd58aa4f32f6f5d4f069b3410a33c067ab230b55071`.

Logs are saved under `/private/tmp/homepage-split-*`. Temporary test databases and
the review worktree are local; they are not production resources.

## Subsequent production release

The staged rollout was completed afterward; see the
[production rollout receipt](web-sync-split-rollout-2026-11-16.md). The following
was the release handoff at the time of local verification.

## Original release handoff

Follow [content operations](notion-content-operations.md): apply 005/006, seed and
validate `website-v2`, replace the worker, then switch Vercel’s project root to
`apps/web` and release only when authorized. Retain legacy grants/snapshot for
rollback, then explicitly retire them after that window. Public AI flags and
Vercel deployment holds remain unchanged. Concurrent privacy changes must be
ported onto the moved paths before a combined privacy release.
