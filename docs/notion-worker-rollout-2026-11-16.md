# Notion worker rollout — 16 November 2026

Alex authorized deploying the current durable worker base to Coolify first,
while holding Vercel deployments. The independent monorepo packages and the
source-neutral, prepared-public-data contract planned for the next change
have not been implemented by this rollout.

## Source and deployment

- Source commit: `81106e8475a7d89fd903207e2c513d881292b2b5`.
- Remote deployment branch: `codex/notion-worker-rollout`; `main` was unchanged.
- Coolify application: `homepage-knowledge-sync`, `z115ll8yc6eupo0meeo9lpbf`.
- Deployment: `a1lmpfi6vre1pxyol6ipv46a`.
- Dockerfile: `ops/knowledge/Dockerfile`.
- Command: `node --import tsx scripts/knowledge.ts watch`.
- The combined worker runs independent content, embedding and enquiry loops.
- Production image: `sha256:c9e7590dfc12f811e8766753464fb23a305d4353cca4f2976a8b079b50f6eed6`.

The worker remains pinned to this commit, with Coolify auto-deploy disabled.
The previous worker revision was `c91eb00bcb2bdc4f34fec065114af993a4f8da30` on
`main`; its application settings are checkpointed for rollback. No public
domain, mapped port, DNS record or unrelated service was changed.

## Database and environment

The sibling database session applied additive migrations 003 and 004 and seeded
42 public projects, 30 case studies and 117 images. See the
[database preparation receipt](notion-production-preparation-2026-11-16.md) for
the backup, migration hashes, role permissions and reader verification.

Added three missing settings to the existing worker as encrypted runtime-only
variables: `NEXT_NOTION_OWNER_CONTACT_ID`,
`NEXT_NOTION_CV_SIGNUP_DATABASE_ID` and `NOTION_ENQUIRY_MENTION_USER_ID`.
The owner ID came from the existing validated local configuration because
Vercel's API does not reveal that sensitive variable. The other values came
from existing Vercel production settings. Their saved values were verified
without printing them. No new credentials were created.

Concurrent privacy/UI work, including the consent column and provider-routing
changes, was excluded from the release. The deployed indexer retains its
previous provider configuration and existing spending limits. Both production
assistant flags remain false.

## Vercel hold

The project `fuerst-one-homepage` has the ignored-build command `exit 0`, read
back through the Vercel API. The release also records
`git.deploymentEnabled: false` in `vercel.json`.

The production target remains `dpl_HcVDWxhXPRG95GQRUf9y7htgCgJv` and the live
homepage returned HTTP 200 after the worker deployment request. No Vercel
deployment was requested and no builds were active at the verification check.
The hold is intentionally retained for the subsequent website rollout.

## Validation

- 34 focused worker/enquiry/Malt unit tests passed.
- 15 PostgreSQL/worker integration tests passed against a dedicated localhost
  test database, including a run against the exact release source snapshot.
- The exact release source passed TypeScript, scoped ESLint and Prettier checks.
- Its Linux/amd64 Docker image built, and content/outbox/indexer modules loaded
  in the image with networking disabled.
- The source suite passed 233 of 235 tests against a local web server with
  Notion disabled. Two enquiry HTTP failures were caused by using the numeric
  loopback origin while Next.js used localhost; the complete six-test enquiry
  HTTP suite passed when rerun against the matching localhost origin.
- Git commit hooks also passed formatting and ESLint. All 63 committed files
  matched the validated source snapshot.

The deployed maintenance health command passed with zero pending enquiries.
Its first indexing cycle reported 84 documents, 116 chunks and zero changed
documents, reusing existing vectors. No real test enquiry or owner notification
was sent.

The new worker completed its first autonomous publication at
`2026-11-16T18:00:10.704Z`, advancing beyond the initial seed. It retained all
42 projects, 30 case studies and 117 assets, with zero deferred images and zero
pending enquiries. Its maintenance health command passed again afterward.

Coolify marked the deployment `finished` at `2026-11-16T18:03:10Z`, after its
configured 300-second startup period. The previous container was retired;
the only running worker uses the exact source commit above and is healthy.
The final maintenance health check passed, with zero pending enquiries and
no active Notion cooldown. Coolify auto-deploy remains disabled.

Non-secret verification evidence is under ignored `coverage/worker-rollout/`.
