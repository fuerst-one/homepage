# Adaptive embedding playground

The user wants to experiment with field combinations and compare embeddings of
the complete text against combinations of separately embedded fields. Cluster
counts must adapt to changing project data and filtered subsets.

## Scope

- Reuse the Experience Atlas views and Embedded Together strip. Add searchable
  field selection, a sector subset, an explicit Run comparison action, and A/B
  result switching. Preserve the original lens as a resettable reference.
- Use the same projects and selected fields for both representations. Require
  recorded values for every selected field so missing data cannot masquerade as
  semantic similarity. Report excluded projects.
- Joint mode embeds one labelled text per project. Blend mode averages cosine
  similarities of separately normalized field vectors; this is equivalent to
  equally weighted concatenated blocks, not the joint-text embedding.
- Cache vectors by model, version and canonical input hash. Changes invalidate
  affected inputs only. Reuse existing joint vectors where inputs match.
- Local-only server endpoint; known public fields and snapshot projects only.
  Reject non-development and non-local/cross-origin requests before reading a
  body or calling a model. No browser credentials or public paid endpoint.
- Automatically evaluate feasible k with multi-start PAM, silhouette and
  resampling. Prefer a coarser solution within one standard error of the best
  resampled silhouette. Report stability separately, not as model accuracy.
  Allow an unpartitioned result for insufficient or unseparated data.
- Filter changes refit both representations on the same subset. Controls remain
  drafts until Run comparison, so no paid request on each keystroke.

## Validation

Behavior tests cover adaptive counts, order invariance, degenerate data,
filtered subsets, canonical input/cache reuse, changed-input invalidation,
missing fields, equivalent blend geometry, and local endpoint access rules.
Then typecheck, existing suite, scoped lint/format, browser A/B/cache/filter
checks, and independent review. No model quality claim without measured evidence.

## Evidence before implementation

Read-only diagnostics for 42 projects, k=2..10, 32 PAM starts and 100 random
33-project subsets are saved outside the repository in the Codex artifact
folder `atlas-analysis-2026-11-18`. Five clusters was a fixed application
setting. Current model is text-embedding-3-small with 1536 dimensions.

## Implemented and measured

- Added the development-only field playground and joint-versus-blend comparison.
  Dev server now binds to 127.0.0.1; deployed requests cannot run embeddings.
- Rebuilt the public prepared spaces from existing cached vectors with adaptive
  counts: product 5, engineering 2, practice 7. No new vectors were needed.
- Owner approved the first real product comparison: 41 complete projects,
  five fields, 160 new vectors and 41 reused. Joint: K5, silhouette 0.103,
  stability 0.607. Blend: K9, silhouette 0.165, stability 0.727.
- Browser first run 9.3s; cached repeat 2.1s and no new vectors. Maritime subset
  refit 0.2s: joint unpartitioned; blend K2, stability only 0.087.
- Separate review findings fixed: normalized loopback hostname handling, local
  listener binding, stale selection reconciliation, cache failure diagnostics,
  mobile picker/metric overflow, and accurate applied-mode labels.
- Full suite: 373/375 with an IP test origin; the two origin-sensitive enquiry
  checks passed when rerun with the canonical localhost origin (6/6 in file).
  Web typecheck, scoped lint/format, production build and browser checks passed.
- No deployment or commit performed. Local result details are in the Codex
  artifact folder `atlas-analysis-2026-11-18/README.md` and `joint-vs-blend.json`.

## Coverage and marker follow-up

- Expanded the picker from 17 to 29 public fields, including delivery/outcomes,
  maintenance, engagement/status, names/dates, case-study length and wow factor.
  Numeric fields explicitly use text embeddings. Private research notes and
  identities used only for storage are not exposed as model inputs.
- Local capability metadata now includes per-field project presence, not values.
  Chips and picker options preview missing counts within the current sector
  filter; the combined ready/incomplete count deduplicates overlapping gaps.
  Fewer than two complete projects disables comparison with an explanation.
- Preserved complete-case A/B semantics; the prepared atlas still includes
  projects with partially populated field selections. No new provider calls
  were needed to verify the preview.
- Reduced scored marker diameters by 25%; uniform and unscored markers are
  smaller too. The shared sizing function applies to 2D, 3D and network views.
- Verified 25 relevant behavior tests, typecheck, lint, build, live API coverage,
  filter changes, numeric field selection, and mobile picker layout. Preserved
  the owner's existing 17-field experiment in the original browser tab.
