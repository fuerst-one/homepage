# Notion resilience acceptance — 16 November 2026

Implemented the database-first architecture: web requests read PostgreSQL;
the worker alone refreshes Notion content and delivers enquiry pages/mentions.
The initial implementation was verified locally. Production database preparation
is recorded separately in [the preparation receipt](notion-production-preparation-2026-11-16.md);
website and worker release decisions remain separate from those checks.

Verified locally:

- 34 focused unit tests passed, covering retries, shared cooldowns, safe error
  diagnostics, enquiry persistence/mentions, and Malt freshness behavior.
- 15 PostgreSQL/worker integration tests passed, including concurrent admission,
  renewable/fenced leases, atomic publication reads, content/image withdrawal,
  and reconciliation of a lost Notion mention response without duplicate pages
  or mentions. Notion responses in these tests are synthetic.
- A real background refresh published 42 public projects, 30 case studies and
  117 mirrored assets. A real 429 interrupted an earlier refresh without
  replacing the last publication.
- Type checking, scoped ESLint and Prettier checks passed. The standard Next.js
  production build passed with an empty Notion token and an interceptor that
  rejects Notion API/file fetches. No intercepted Notion requests were recorded.
- The worker Docker image built successfully and its maintenance status command
  ran against local PostgreSQL inside the container.
- Two offline acceptance tests passed against the built application and an
  isolated local test database. Chrome rendered the homepage, loaded the avatar
  and a case study without Notion requests. HTTP submission returned a durable
  receipt, repeated submission reused it, and changed content returned 409.
  These enquiries were confined to the test database and never sent to Notion.
- The full concurrent worktree suite reported 239/240 passing. Its remaining
  failure was the separate AI provider-routing assertion in
  `tests/knowledge-privacy.test.mjs`, expecting `provider.only = ['openai']`.
  This is not a fully green whole-worktree result.

Independent bugs, security and code-quality reviews were completed. The review
fixes cover undashed owner IDs, lease renewal/fencing, sanitized diagnostics and
consistent multi-section publication reads.

Verification logs are under the ignored `coverage/notion-resilience/` directory.
The browser check is `tests/notion-offline.browser.mjs`; it requires an explicitly
selected localhost server and localhost database ending in `_test`. Its server
must use the same test database, seeded with published content/image rows, and
must run with Notion disabled. No real owner notification receipt was claimed.

Follow the ordered migration, seed, worker and web rollout in
[the operations guide](notion-content-operations.md).
