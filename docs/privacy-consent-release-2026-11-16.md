# Privacy release and repository consolidation — 16 November 2026

The privacy and consent release is live at [fuerst.one](https://fuerst.one).

- Production web source: `3921efde5a6bce3d64b6778fa5fc357fd4eacdca` on `main`.
- Vercel deployment: `dpl_6Z72XDLNSe5SMr6gsFG1V9TfTtag`, independently verified
  READY and assigned as the production target.
- Both production AI flags remain `false`. AI controls, AI consent and the
  AI-specific notice sections are absent. Analytics and server conversation
  review are still future work, with no consent controls for them shipped.
- Playground settings are optional and stay in memory by default. The live
  checkbox was observed unchecked, enabled, then unchecked again.
- EN/DE enquiry notices describe the implemented PostgreSQL-to-Notion queue,
  including retention while either delivery or internal notification is pending.

## Validation

The release tree exactly matches the tested privacy candidate `c73db5b` (Git tree
`ce14f3df2eaa735cdc368dc9467bef3e9b3c04d6`). Consolidation added ancestry only.

- All 261 unit/HTTP tests passed, plus 28 focused integration-port checks.
- Workspace type checks, scoped lint/format and the 156-page production build passed.
- Local and public live browser checks passed: EN/DE, ordinary search navigation,
  no background AI status requests, absent AI UI, mobile overflow absent, no page errors.
- Candidate and live HTTP checks passed for 12 public pages, both privacy notices,
  disabled assistant status/POST, public profile fields and all 117 mirrored image
  routes (37,587,626 bytes; hashes checked). Next image optimization also passed.
- The optional playground control was separately verified in the public browser.
- Automatic approval review rejected the protected-candidate browser check because
  it used a deployment access credential. That extra check was omitted; public
  browser verification passed after deployment. Temporary test access was revoked.

Vercel retains `apps/web` as its root, its automatic-build hold, empty cron
configuration and no production Notion source credentials. The worker remains
healthy on pinned source `218922b4623c0b16ea24694d930f8f4606506a5c`; only its
configured Git branch changed to `main`. Automatic worker deployment is disabled.
No worker rollout, provider-account change or production schema migration was
performed for this AI-disabled web release. The existing AI activation review
and migration requirements still apply before enabling AI.

## Repository cleanup

The original privacy work was ported onto the deployed monorepo. An ancestry-only
merge accounts for that original branch and the plasma branch previously
squash-merged as `62ae231`. All other removed feature branches were already
ancestors of the consolidated release.

Only `main` remains locally and remotely, with one worktree at the original
checkout. The unfinished 2024 Preline experiment is preserved as annotated tag
`archive/preline-migration-2024` (target `3409f17`). Main, the archive tag and the
seven remote branch deletions were pushed atomically with expected-SHA guards.
The checkout was clean after consolidation.

The unrelated pending Next.js comment expressed the same build-memory intent
already present in `apps/web/next.config.mjs`; its original patch is preserved
outside the checkout. Local worktree settings, verification evidence and the
untracked pnpm cache were also preserved under the restricted local directory
`/tmp/homepage-privacy-deploy/preserved` before removing the temporary worktrees.
Sanitized release evidence is in ignored `coverage/privacy-release-2026-11-16`.

Previous production web deployment for rollback:
`dpl_E3azjQdG4G7s3kXTSBZW9nw1BcL2`. Keep AI disabled when rolling back.
