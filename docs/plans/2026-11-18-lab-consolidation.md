# Research Lab consolidation

User accepted the assessment on 2026-11-18: keep one Atlas for spatial exploration, one weighted expert workbench and compact pair explanations.

## Recovery and history

Temporary checkpoint: `69d5736` (`chore(lab): checkpoint before view consolidation`). Consider squashing it with the final consolidation after review; do not rewrite history automatically. A bundle, the pre-existing working-tree patch and untracked archive are in the ignored main-checkout folder `data/project-lab/checkpoints/2026-11-18-before-consolidation/`. Environment files are excluded. Preserve unrelated dirty changes.

## Implementation

- Reduce public Research Lab navigation to Needs & use cases, Skill pairings, Over time and Similarity workbench. Retire the challenged seven views and fold Focused clusters into the Atlas/expert matrix. Internal evidence/owner lenses remain available to their existing callers.
- Reuse weighted fingerprints, ranking, exact matrix and source receipts. Remove the duplicate combined graph and overlap table from VectorViews.
- Share a compact recorded-field comparison between the Atlas and workbench. Show shared labels, project-specific differences and missing data. No overall similarity percentage for the raw tag comparison.
- Offer cross-lens leads only for known disjoint toolsets with two or more shared needs covering at least half their combined needs. Disclose this descriptive rule.
- Keep outcome provenance as compact coverage counts, rather than a delivery-path Sankey.
- Use scale.workingPattern in the delivery fingerprint. No database writes, embedding calls, deployment or main-branch edits.

## Validation

Behavior tests must cover unknown versus disjoint labels, duplicates/case/spacing, scoped candidate eligibility, retired navigation and current-schema working patterns. Run related regressions, types, scoped lint/format and a build. Review the scoped diff and verify visible interaction when the browser policy permits.

## Completion evidence

- Final full suite: 426 tests passed, zero failures/skips (`/tmp/verify-lab-consolidation-tests-complete.log`). Regression tests were observed failing before the implementation and before the duplicate-name correction.
- Workspace type checks, scoped ESLint/Prettier and the final production build passed (`/tmp/verify-lab-label-types-corrected.log`, `/tmp/verify-lab-labels-lint.log`, `/tmp/verify-lab-consolidation-build-corrected.log`). The final build followed a corrected input-type declaration caught by TypeScript.
- Read-only bug, code quality and UI reviews completed. Removed retired calculations/dispatch from the active parent and fixed comparison result focus/reveal; re-review found no open issues.
- In-app browser on port 6895: four-tab navigation, pair changes, cross-lens leads, focused/revealed result heading, optional 49x49 weighted matrix, Student scope, empty scope and reset verified. Atlas disclosure uses the same component and follows explicit project selection. Duplicate Public Searoutes labels show their descriptions. Application error log was empty.
- Mobile at 390px: document width 379px, comparison width 347px; no horizontal page overflow. Temporary viewport override reset.
- Screenshots: `/Users/Alex/.codex/visualizations/2026/11/17/01a1e9cf-fd06-74d2-8bab-a07ca973cdc2/lab-consolidation/workbench-desktop.png` and `workbench-mobile.png`.
- No DB writes, provider embedding calls, push or deployment. Unrelated working-tree changes remain outside the consolidation commit.
