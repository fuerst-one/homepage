# Functional enquiry funnel pass

Date: 2026-11-14

## Scope

This pass implements the functional journey and public CV retirement. The broader positioning/copy alignment remains a separate pass and commit. Existing substantive homepage, service, project, and profile copy is retained; labels and factual privacy/discovery statements change where needed for the new behavior.

- One English/German enquiry component supports guided questions or a single-page form.
- Visitors select intent, describe the situation and desired outcome, see curated public projects, add practical details, review, and submit explicitly.
- Project enquiries accept optional budget; embedded enquiries accept optional capacity, duration, and working arrangement. Hidden fields from another engagement type are cleared.
- Home, Work with me, project pages, and service/offer buttons carry selection identifiers into the same flow. Private brief text is not put in URLs.
- Session storage retains a draft in the current browser tab for up to two hours of inactivity and supports language switching. Successful submission or explicit discard clears it. Expired drafts are rejected on re-entry.
- Public CV PDF and print endpoints return 410 with noindex, including localized and unlocalized paths. Old CV download commands lead to contact. The obsolete signup form and server action are removed.
- Experience, project pages, public project APIs, and ordinary email contact remain available.

## Lead inbox configuration

The server uses the existing Notion integration token. Set `NEXT_NOTION_ENQUIRIES_DB_ID` to use a dedicated private database. Otherwise it reuses the existing `NEXT_NOTION_CV_SIGNUP_DATABASE_ID` inbox. The database needs the existing schema: `id` (title), `email` (email), and `createdAt` (date).

New records have a title beginning `enquiry:<reference>:` and contain the full reviewed brief in page body blocks, including selected intent/context and a New enquiry status. Historical email-only CV request rows are not rewritten or deleted. The shared database is an interim delivery inbox, not a completed CRM migration. In Notion, distinguish the new rows by the title prefix and open a row for the full brief.

The form confirms only a completed storage response. It does not automatically send an email receipt, owner notification, booking, quote, or contract. Owner notifications and pipeline automation require a follow-on configuration. No new model provider or Malt synchronization is enabled by this commit.

The endpoint validates the brief, bounds the UTF-8 request size, checks same origin, uses the existing per-instance rate limit, and includes a honeypot field. Public API responses contain no private lead data. Operational error logs exclude brief contents and credentials.

## Retry semantics

The server looks up an existing reference before creating a record, compares its payload fingerprint, and coalesces concurrent same-reference submissions within one process. A conflicting payload receives 409. Ambiguous failures leave the visitor's answers available for retry.

Notion does not offer a transactional uniqueness guarantee for caller-supplied references. Simultaneous requests reaching separate instances can still produce duplicate inbox rows. The common enquiry reference supports deduplication; this pass does not claim exactly-once delivery. Strict cross-instance uniqueness would require an atomic reservation store.

## Verification

- Behavior tests cover required fields, hidden-field normalization, safe context links, service-specific evidence, draft expiry, entry transitions, language/reload preservation, storage failure, replayed receipts, and concurrent same-instance submissions.
- HTTP tests against the local production build cover English/German contact pages, origin/content-type validation, oversized requests, multilingual text size, and six retired PDF/print paths.
- Production build (`next build --webpack`), TypeScript, scoped ESLint, scoped Prettier, and whitespace checks pass.
- Scoped baseline/task suite: 121 passed. A full shared-workspace run also passed 127 tests at verification time; separate Notion case-dimension tests were being added by another session and are excluded from this commit.
- Browser acceptance observed context entry, relevant Konfig/Seabo evidence, team-specific practical fields, field validation/focus, editable review, English-to-German draft preservation, and the conventional-form alternative. The production build's contact page also loaded and switched modes successfully.
- German review layout was inspected at 320px; measured document width did not exceed the viewport. Screenshot evidence is in `/tmp/homepage-enquiry-mobile.jpg` and `/tmp/homepage-enquiry-desktop.jpg` for this session.
- After explicit owner approval, a synthetic enquiry was submitted through the local production build's guided browser flow. The UI confirmed reference `4394fe55-6bf1-4c16-be01-5d72966ec73f`. An independent Notion API query found exactly one matching record and verified all 13 expected brief rows, the `hire` entry context, email property, and creation date. The exact synthetic record was then archived; retrieval confirmed `archived: true`, and the active database query returned zero matching records. No automatic email or booking was sent.
- Live smoke-test evidence for this session: `/tmp/homepage-enquiry-live-smoke.json` and `/tmp/homepage-enquiry-live-confirmation.jpg`. These temporary artifacts are not committed.

The production build was served locally for acceptance. This commit does not deploy the website or change external profiles. Separate Notion case-dimension script/data/test files in the shared worktree are left outside the commit.
