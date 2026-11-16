# Local homepage knowledge assistant

Approved direction: retain Next.js on Vercel, use PostgreSQL/pgvector hosted on
Coolify, and use a dedicated OpenRouter key. Start with local testing; do not
provision, deploy, or change either cloud service during this iteration.

## First local vertical slice

- PostgreSQL/pgvector in Docker, bound only to localhost, with a persistent volume.
- Import the public Notion project projection and explicitly linked case studies.
  Preserve the existing Hidden, locale and case-study publication boundaries.
- Split text into bounded passages, hash it, and embed changed passages only.
  Replace the index transactionally; remove hidden, deleted and unlinked material.
- A local watcher checks for changes. Production webhooks/managed jobs are a
  follow-up; localhost cannot receive Notion webhooks without a public tunnel.
- Retrieve relevant passages and generate one bounded, structured answer via
  OpenRouter. Return only server-validated source links and page actions.
- Reuse the landing page's project results and navigation. The visitor can filter
  projects, navigate to known pages and highlight registered sections.
- Reserve usage in PostgreSQL before calling models. Apply global daily/monthly
  budgets, per-visitor quotas, bounded input/output and concurrency limits.
- Keep normal navigation available. Do not persist chat text or raw visitor IPs.

## Acceptance

Behavior tests cover publication boundaries, bounded chunks, response/action
validation and failure behavior. PostgreSQL checks cover migrations, incremental
indexing and atomic quotas. Live local tests use the dedicated key and real
Notion content. Browser checks cover English/German and desktop/mobile.

## Production boundary

Local success does not imply production deployment. Before deployment, provision
a separate database/user, verify TLS/pooling/backups, select nearby execution
regions, configure Notion webhook verification and managed indexing jobs, review
the public privacy notice, and repeat live verification.
