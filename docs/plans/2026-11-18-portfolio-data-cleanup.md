# Portfolio source and publication cleanup

Scope: main checkout only; preserve parallel search/privacy/visual work. Do not
write to the Experience Lab worktree or request embeddings. Refresh local
website-v3 with the existing standalone Notion workflow, then notify the lab chat.

## Decisions

- Extend reviewed taxonomy and German labels for developer tools, data parsing,
  code refactoring, geo suggestions, trip planning, routing, selling products,
  restricted-access production and retired products. Preserve lifecycle distinctions.
- Personal/experimental belong in usage context. Physical product belongs in
  product format. Open Source describes distribution (delivery model), not a
  customer market; remove its duplicate usage-context label.
- Keep publication allowlists. Report rejected values and missing core fields in
  worker diagnostics, without publishing editorial values or private evidence.
- Reuse the lab's existing cloc helper read-only. Measure verified repository scopes
  and record revision, dirty state, exclusions, tool version and timestamp. Size is
  current code footprint, not authorship or quality. Prototype references are excluded.
- Owner confirmation in this chat: "Full solo on all of them. They are all basically
  completed apps." Applies to Pokémon Arena, Home Pi, Traidy, Daily Briefing, SERP API,
  Housing Hunter and AI Scraper. Record solo contribution/team bounds and completed
  app status evidence; do not infer maintenance, hours, production or measured impact.
- Owner clarified six ranges as historical personal effort. Record that provenance
  and distinguish it in both public reader and UI from rebuild estimates. Keep
  numeric ranges and entered classes intact, with class disagreements in the audit.
- Traidy is an experiment that reached basic viability and was deprioritized;
  preserve Prototype / On Hold and Experimental, with an owner-reported outcome.
  The seven-project completion shorthand does not override this specific context.
  Keep remaining owner-entered effort ranges/classes intact until clarified.
  Preserve missing, explicit none and not applicable; add no filler to embeddings.

## Work and acceptance

1. Re-read source/schema and publication before planning writes. Snapshot field values.
2. Add failing behavior tests for accepted vocabulary, diagnostics and privacy;
   implement minimal readers and diagnostic hook.
3. Measure seven mapped projects; review missing Methods against concrete evidence.
4. Apply only scoped, expected-value-checked source properties; read back every write.
5. Run scoped tests, types/lint, appropriate publication integration checks.
6. Run standalone Notion sync against the verified local database; audit source/public
   parity in both languages, accepted exclusions, private-field omission and coverage.
7. Save receipts and owner questions. Notify the originating lab chat with timestamps,
   counts, field coverage, remaining gaps, commit status and artifact paths.

Progress and exact artifacts are recorded in the final cleanup receipt.
