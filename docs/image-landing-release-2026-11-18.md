# Image descriptions and service imagery release

The release integrates the automatic image-description feature with current main and the completed service imagery commit `795bd4a` (`feat(services): curate contextual project imagery`). Preparation used an isolated release worktree. The separate in-progress homepage work-data/GitHub changes remain outside this release.

The shared carousel preserves authored alt text, provenance labels, captions, contain/cover fitting, priority loading and localized keyboard/manual navigation. Generated concise alts fill missing authored alternatives; detailed observations supplement the editorial text in an expandable disclosure. Service pages receive cached descriptions only for their selected images. Project, case-study, service and starting-offer routes render current descriptions dynamically so a changed public asset manifest removes old observations without an ISR delay. Rendering never invokes a model.

Integration retains current main's multi-valued delivery-model projection and strict search/chat intent safeguards. The answer-cache version is now `portfolio-answer-v4-strict-intents-image-observations` to include both changes.

## Release preparation

- All 390 unit and HTTP tests passed against the integrated production build.
- Four image PostgreSQL integration tests and nine cache PostgreSQL regression tests passed in the isolated localhost test database.
- The production-HTTP withdrawal/restore test passed for project, case-study, service and starting-offer pages.
- Workspace types, ESLint and the production Next build passed.
- The worker Docker image built successfully; Sharp 0.35.5 decoded and encoded an image in its Linux runtime. Production architecture is checked again after deployment.
- Independent bug, code-quality/security and UI integration reviews returned no actionable findings.
- Browser checks covered desktop gallery cycling/caption reset and German mobile keyboard navigation/disclosure, with no observed overflow, broken images or console warnings/errors.

Before deployment, the production database was backed up in custom pg_dump format to `/root/homepage-release-backups/2026-11-18-image-descriptions-before.dump` on the database host. Migration `011-image-descriptions.sql` was applied transactionally. The application role can read the publication-scoped view, cannot read raw checkpoints, and the worker can insert checkpoints.

All 94 completed paired descriptions from the lab passed key/model/literal-prompt/version validation and matched actual bytes in the current production public-asset manifest. They were imported with conflict-safe insertion. Their original provider-reported generation cost was US$0.0684668; importing them incurs no provider call and does not add that historic cost to production usage. The ordinary worker will publish their image documents and reuse them for both locales. New images continue through the automatic worker path under the existing budget.

Production settings remain US$1/day, US$10/month and the existing 25% assistant rollout. No credentials, private editorial records or unrelated worktree changes are part of this release. Main pushes trigger both Vercel and Coolify; completion requires the exact released SHA to be READY on Vercel and finished/healthy on the worker, followed by live image, caption and index checks.
