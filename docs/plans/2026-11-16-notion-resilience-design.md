# Database-first website content and Notion delivery

The website reads published content and image bytes exclusively from PostgreSQL.
Only the background worker talks to Notion. PostgreSQL is the serving source;
Notion remains the editorial source and enquiry inbox with mention notifications.
Reuse the current database and always-on worker rather than adding Redis or a
second service. Keep existing environment names compatible with deployment.

- A single worker publication includes visible projects, owner, bilingual copy,
  case dimensions, case-study bodies, icons, and an image manifest. Prepare the
  publication off to the side, then replace it atomically under a renewable,
  token-fenced lease. Preserve the last successful publication through outages.
  Web readers never refresh, call Notion, or expire valid database content.
- Mirror approved portfolio image origins into immutable database asset versions.
  Image routes resolve only the active manifest; withdrawn assets stop resolving.
  Keep existing public DTO and visibility filtering boundaries. Source records are
  server-only and never exposed wholesale as a new API.
- Pace worker Notion traffic through PostgreSQL at one admission per 550 ms.
  Respect 429/529 cooldowns across SDK clients, use bounded retries and jitter,
  and never replay uncertain writes on a generic 5xx response.
- Acknowledge enquiries only after durable PostgreSQL storage. The outbox worker
  reconciles existing Notion pages by the same receipt/fingerprint before creating
  a page. It separately reconciles and delivers the owner mention. A failed or
  uncertain mention remains pending without creating a duplicate page. Erase the
  queued brief after delivery and retain receipt fingerprints for 30 days.
  This is retryable delivery with reconciliation, not a claim of distributed
  exactly-once writes to Notion, which offers no atomic receipt constraint.
- Run the outbox loop every five seconds independently of content and AI work.
  Check content every minute, refresh at five-minute intervals, and let Next ISR
  regenerate rendered pages from the database within a further minute. Preserve
  Malt freshness rules, importing the existing Notion observation once and using
  the database for subsequent observations.
- Expose safe freshness/queue diagnostics and worker health. Log allowlisted error
  codes and statuses, never briefs, credentials, SQL parameters or SDK messages.

Validate behavior with unit tests and a dedicated local PostgreSQL test database:
shared admission/cooldown, persistence across readers, lease renewal/fencing,
atomic publication/withdrawal, image access, durable receipts and actual SDK
mention reconciliation after a lost response. Check built pages with Notion
network access disabled. Add migrations and least-privilege grants; deployment
and production schema changes remain separate from this implementation.
