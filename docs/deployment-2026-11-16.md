# Homepage production preparation — 16 November 2026

Alex authorized the Coolify/Vercel setup and redeployment, then explicitly chose
**deploy with public AI disabled** until the OpenRouter privacy work is complete.
Both production assistant flags must remain `false`. Local development stays enabled.

## Resource layout

- Vercel project: `fuerst-one-homepage` (renamed by Alex during setup), `prj_Q8Pcq8jFFEAyztkMCPaF0M7O6WEV`, team
  `fuerstones-projects`. Web application and current domain bindings stay here.
  `vercel.json` selects Frankfurt (`fra1`) for functions near the Nuremberg DB.
- Coolify project: **Homepage**, `yu6sq6oxax68hrlm74r6egyi`.
- Production environment: `fvics3v4al9oxeextt3l1em3`.
- Server: `hetzner-nbg1 (localhost)`, `awo8ck0`; destination/network `coolify`.
- Native pgvector/PostgreSQL 17 database: `homepage-knowledge-production`,
  `moxlluwm5wpiqta6eedpkzj4`, persistent Coolify-managed storage, 512 MB/1 CPU.
- Separate background application: `homepage-knowledge-sync`,
  `z115ll8yc6eupo0meeo9lpbf`, Dockerfile `/ops/knowledge/Dockerfile`,
  384 MB/0.5 CPU, no public domain or mapped HTTP port.

This project can accept the web application later without moving the database
or indexer to another project. No web application or apex domain was moved to
Coolify, and no Buchstabiene resource was changed.

## Database access and backups

The public TCP proxy uses port `55439`, SCRAM authentication and PostgreSQL TLS.
Vercel uses `homepage_app`, which can read public documents/chunks/freshness and
maintain budget records, but cannot create tables or update public knowledge.
The indexer uses the separate `homepage_indexer` login with knowledge-table DML.
Remote database administration is rejected by the HBA allowlist.
`KNOWLEDGE_DATABASE_CA_CERT` supplies the Coolify server CA; remote clients always
verify the CA and hostname. Plaintext remote connections are rejected. The
indexer's internal Docker address also uses verified TLS.

Versioned permissions and HBA rules are under `ops/knowledge/`. Passwords are
only in Coolify/Vercel runtime variables and the ignored mode-0600 local
`.env.production.local`; never copy them into this document or build arguments.
The local development DB and its environment were preserved.

Coolify schedules a database dump at `02:17` server time daily, retaining at most
seven local copies and seven days. These are same-server backups; **offsite
backups are not configured**. Public corpus data was copied from the already
built local DB without copying local usage records or invoking embeddings again.

Installed Coolify 4.1.3 attempted to use the SQL username as the Unix owner of SSL
certificate files. Its initial private-key permissions prevented startup. The
new DB's native administrator is now `postgres`, matching the container's Unix
account; certificate files are owned by PostgreSQL UID 999. The interrupted first
initialization was completed without deleting a volume. If certificates are
regenerated, verify key ownership and actual TLS before reopening access.

## Content sync and release

The sync application runs `node --import tsx scripts/knowledge.ts watch`. It
checks published Notion content 60 seconds after each completed sync and reuses
unchanged content and embedding cache entries. It shares production usage
admission with future chat. Secrets are runtime-only. Its Docker healthcheck
checks DB accessibility; inspect `knowledge_sync.synced_at` and sync logs to
verify actual content freshness as well.

Deploy this application from the recorded source commit when knowledge code
changes. Notion content changes need no code deployment. Keep this background
service running while the web app remains on Vercel; Vercel Hobby's daily cron
is not used for the minute-level content sync.

Production key: the dedicated existing homepage OpenRouter key has a verified
$10 total key limit. Application defaults additionally enforce $1/day and
$10/month across chat/indexing. Both Vercel AI flags are disabled pending the
[privacy follow-up](knowledge-assistant-privacy-review-2026-11-16.md).

## Validation and rollback

Pre-change production deployment: `dpl_HHG332PPsxRgL9WkruSBzAjFJkR9`,
`30a9fc59a55f5b89be9fd778e3db175effd3c8ea`. A private deployment checkpoint records
existing environment identities, production target and domain bindings. New
production variables affect new deployments, not the old immutable deployment.

Rollback the Vercel production pointer to the checkpoint if the new web release
fails live checks. Keep AI disabled and preserve the Coolify DB volume. No DNS
rollback should be necessary because domain records were not changed.

Final release provenance and live validation are appended after deployment.
