# Image descriptions in the cached knowledge index

Base: codex/semantic-response-cache at 3a547617, including the copied uncommitted cache implementation. The new managed worktree is codex/image-description-search. Preserve the original cache worktree. No deployment or merge.

Use the existing text-embedding-3-small index (1536 dimensions). Extend deterministic public knowledge projection with image documents for published project screenshots and linked case-study images in available locales. Resolve images only through the public asset manifest and mirrored bytes, never remote URLs. Include image identity, immutable publication asset version and description model/prompt/preprocessing version in document hashes. Store actual image byte hashes and description provenance with indexed image documents.

Add a content-addressed description checkpoint table. Worker-only generation resizes bounded raster inputs, describes visible content through the existing Azure-only/ZDR route and reserves/settles existing indexer usage. Cache by actual image content and generation configuration. Reuse existing embedding checkpoints; unchanged images and locale duplicates must incur no new generation. Failures retain conservative cost reservations; absent/unsupported images should not disable ordinary text search. Failed caption requests must not be retried by every watch tick.

Use existing publication fencing and immediate withdrawal for image documents too. Search uses the same query vector and scoring formula. Chat receives image descriptions marked as observations; they cannot prove authorship, technologies, implementation or outcomes. Keep existing UI cards and filters, make image source citations distinguishable and bump answer cache version. Index hashes must invalidate cached answers on image changes.

Implementation/acceptance:

1. Behavior tests first: public-only image projection, locale gating, version changes/withdrawal, cache reuse and uncertain failures, bounded image preprocessing.
2. Add migration, checkpointed describer, projection and index integration with provenance; verify against real isolated PostgreSQL and a bounded provider fixture.
3. Preserve search response compatibility and add grounded chat source types/versioning. Verify same query embedding, cache context changes, withdrawal and no provider calls on repeat sync.
4. Run scoped tests/typechecks/build and review. Report exact base, inherited changes and validation; leave worktree available for review.

User follow-ups: show the same readable generated descriptions in project modals, carousel detail pages and case-study images, using existing components/styles and keeping editorial captions/alt text separate. Keep neutral visual observations attached to project context rather than inferring project facts from screenshots. Public description readers use a current-publication view; worker-only checkpoint internals stay private. Diagnostics report bounded document/asset identifiers and failure categories.

Concise-alt follow-up (approved 2026-11-18): each newly published or changed screenshot automatically produces a detailed visual description and a concise English alt text (160 characters / 25 words maximum) in one structured worker request. Store the pair atomically under a new content/prompt version; reuse across locales and subsequent worker ticks. Pass cached text into existing project and case-study components for initial HTML, preserving authored case captions. Project and case-study pages render dynamically because stable asset URLs resolve the current publication; seeded client views still refresh public text on mount. Verify new-upload generation, repeat zero-call reuse, initial HTML, and withdrawal after an initial page read.
