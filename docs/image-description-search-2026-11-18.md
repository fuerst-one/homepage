# Image descriptions in cached search and project pages

Implementation worktree: `/Users/Alex/.codex/worktrees/image-description-search/homepage`, branch `codex/image-description-search`. Base: `codex/semantic-response-cache` at `3a5476170cf8a3806ac1f4c46367cba57fa44083`, including the caching worktree's copied uncommitted changes (44,464-byte tracked patch and 15 untracked source/doc/test files). Its snapshot provenance is in ignored `data/image-search-implementation/`. The implementation phase did not modify the source caching or image-lab worktrees, deploy, or merge the image feature. During implementation, the caching changes were separately committed as `b9e5553223d896ee237fbeaecb55343cf6fa583c` and merged into main; the source caching worktree has since been removed. That paragraph records the original implementation stage. Release integration subsequently moved the image feature onto current main plus service-imagery commit `795bd4a`; see `docs/image-landing-release-2026-11-18.md`.

## Behaviour

Published project screenshots and linked case-study images become additional knowledge documents with the same 1,536-dimensional `text-embedding-3-small` vectors. Existing search and suggestion entry points reuse their current query embedding and ranking path. Chat receives separately typed image observations; its prompt prohibits inferring authorship, technologies, implementation, delivery status or outcomes from appearance. Image sources have distinct titles and metadata; the answer-cache version and revision include visual evidence provenance.

Descriptions remain neutral English descriptions of visible image content. The surrounding project, recorded facts and editorial caption provide context; those fields remain separate. This avoids, for example, treating Page Control's screenshot of Konfig as proof that Page Control implemented the configurator.

Project modals, project-detail carousels and case-study images display a collapsed, keyboard-operable “Automatically generated image description” disclosure. German pages use a German label and mark the English paragraph with `lang="en"`. Editorial captions and alt text are retained. Viewing descriptions reads public cached text and never invokes a model. Concurrent case-study reads share an in-flight request for that project/locale.

## Indexing and costs

Only bytes reached through the current public asset manifest are described. No remote image URL or visitor request is used as image input. Bounded raster decoding strips metadata and resizes within 1024 × 1024; unsupported formats fail locally. GPT-4.1-mini uses the existing Azure-only, ZDR, no-training, no-fallback route.

Description checkpoints include actual image-byte hash, model, literal prompt and preprocessing version. Identical content and both locales reuse one paid description. Checkpoints are claimed before dispatch; uncertain provider outcomes require review and do not repeat every worker tick. A known pre-dispatch admission denial releases its claim for later recovery. Existing embedding checkpoints avoid repeated vector generation.

The worker uses existing budget reservations and settles known embedding/description costs. Image failures produce bounded document/asset identifiers and categories (`budget-admission`, `checkpoint-review`, `unsupported-image`, `description-unavailable`). Failed image description or embedding work is skipped while valid text evidence is published. Text indexing errors retain the existing fail-closed behaviour. Completed image work remains cached for retry.

The separate local preview database contains a copy of the real public publication, mirrored public assets and existing public embedding checkpoints. Backfill produced **288 documents / 334 chunks**, including **190 image documents** backed by **94 unique descriptions**, with no skipped images or uncertain description calls. Provider-reported description cost: **US$0.0605924**. Repeated indexing had zero updates and zero provider calls.

The preview's initial $0.25 accounting allowance was reached because admission records include a $0.001 margin per call. For the final local validation only, that accounting allowance was raised to $0.50 after independently bounding the combined provider cost: known description cost $0.05878 + three remaining images at $0.004 each + a $0.02 allowance for all new text embeddings = **$0.09078**, below the announced **$0.25 provider-cost cap**. This is a conservative cost bound, not a claim that accounting margins were billed. Production settings were not changed.

## Migration and recovery

Apply `011-image-descriptions.sql` through the existing knowledge migration command before running the new worker/web code. It adds image provenance and worker-only description checkpoints, and grants the application role SELECT on a publication/locale-scoped `public_image_descriptions` view. The app role does not need access to the checkpoint table.

Then run the existing knowledge sync. The publication fence and redaction transaction include image documents: withdrawn projects, locales, screenshots and image versions cannot remain retrievable or readable as public captions. Any image evidence change invalidates the relevant answer-cache scope.

For `checkpoint-review`, inspect the identified image and matching content-hash checkpoint and provider outcome before clearing an uncertain checkpoint. A temporary admission denial retries automatically once allowance is available; do not clear checkpoints just to bypass a budget.

## Validation

Behaviour checks cover public/locale-only projection, default first-image URLs without `?i=0`, image-version invalidation and withdrawal, citation provenance, safe labelled text rendering, content/configuration cache reuse, uncertain failures, admission recovery, bounded raster processing, restricted database-role reads and a complete index/search/chat/withdrawal flow. The full flow also injects image embedding failures and verifies text retrieval stays fresh.

Existing cache and publication-worker PostgreSQL regression suites ran in this task's dedicated localhost test database, separate from the original worktree databases. Runtime preview: `http://localhost:6914` against `homepage_image_descriptions_preview`. No private editorial records were copied for the preview.

Initial image-description validation completed on 2026-11-18:

- Full unit suite: 363 passed.
- PostgreSQL integration suites: 21 passed (4 image, 9 cache, 8 publication worker), all in `homepage_image_descriptions_test`.
- Workspace TypeScript checks, scoped ESLint and production build passed.
- Independent bug, security, code-quality and UI reviews returned no open findings after fixes.
- Production-browser checks passed for the default first screenshot, changing carousel images, expanded generated text, case-study captions and German labels with English paragraph language. The modal was also verified in the development preview. No browser warnings/errors or horizontal overflow were observed in the checked production views.

The production preview remains on port 6914. Browser evidence is saved locally at `/private/tmp/homepage-image-description-preview.jpg`. The image-only review patch is stored in ignored `data/image-search-implementation/image-description-only.patch`; it compares the scoped image files against caching commit `b9e5553223d896ee237fbeaecb55343cf6fa583c`, separating this task from inherited caching changes.

## Automatic concise alt text

The worker now produces `{description, altText}` in one structured model response for each new or changed published image. The detailed description targets 90 words; the concise English alt text is validated to at most 160 characters and 25 words. Both values are stored atomically in the same byte/configuration-addressed checkpoint, so locales and repeated syncs reuse both without further model requests. The v2 generation version automatically schedules existing v1 images for the same upgrade through the ordinary knowledge watch/sync cycle.

Migration 011 idempotently adds `alt_text` to existing local previews and exposes it through the same scoped public view. Apply that migration again when upgrading a prior local preview. No model is called from a page or modal.

Project screenshots use the concise text as `alt`; case-study images preserve meaningful authored caption text and otherwise use the generated alt. Generated English alts carry `lang="en"` on German pages. Detailed descriptions remain independently expandable. Project and case-study pages read public text during server rendering and use dynamic rendering to avoid stale observations after asset changes. Client views start with that HTML and refresh the current public view on mount; pending or unavailable descriptions retain the existing fallback labels.

Concise-alt validation completed on 2026-11-18:

- 367 unit/HTTP regression tests passed, including initial-HTML rendering and authored-caption precedence.
- Four image PostgreSQL integration tests passed with automatic generation for a newly published screenshot, atomic pair storage, no completed partial results, locale reuse and zero calls on unchanged indexing.
- The dedicated production-HTTP test passed: after the first project and case-study page read, withdrawing preview assets removed generated observations immediately; restoring the publication restored them immediately. The preview payload was restored in `finally`.
- Workspace types, scoped ESLint, production build and independent bug/security/quality/UI reviews passed. The build confirms both project detail routes render dynamically.
- Browser checks confirmed generated `alt` strings and `lang="en"` in German project details and modals, correct disclosure reset on image change, no horizontal overflow and no console errors in the checked views. Screenshot: `/private/tmp/homepage-image-alt-preview.jpg`.

The completed preview has **94 paired descriptions** supporting **190 public image documents**, all with concise alts (longest 155 characters), and no skipped images. Repeated sync updated zero documents and made zero provider calls. Completed-pair generation cost was **US$0.0684668**. Provider-reported cost for the entire concise-alt follow-up was **US$0.07086358**, including re-embedding and three initially rejected responses. Those three confirmed, cost-reported validation outcomes were reconciled narrowly after implementing automatic word-boundary length bounding and increasing the response allowance to fit both JSON fields; the audit is in ignored `data/image-search-implementation/paired-preview-validation-recovery.json`. Unknown provider outcomes retain the existing no-repayment policy.

For this follow-up, the isolated preview's accounting allowance was US$0.90 to accommodate per-call accounting margins. An independent per-request guard preserved the original US$0.25 provider-cost cap; the final conservative cumulative provider bound was US$0.1597703, including the earlier image-description validation. Production budgets and data were unchanged.
