# Suggest bar and enquiry QA polish

- Keep the existing monochrome landing design and reuse the existing Radix dialog and Button patterns.
- Show a spinner and announced loading status inside/next to the suggest input while project suggestions load; keep direct navigation commands available. Show progress while a chosen destination opens.
- Move the conversation tagline from the rotating search caption to the homepage enquiry CTAs. The search caption should explain that the contact choice opens an enquiry form.
- Make project descriptions optional, including brief text under ten characters. Name/email and valid supplied URLs remain required/validated.
- Only clicking Send enquiry triggers a missing-details confirmation. Both guided and single-page modes offer Add details or Send without details. The latter sends the current normalized brief exactly once. No interruptions between question steps.
- Verify behavior with tests and browser checks in EN/DE, including cancel/edit, bypass/send, required contact fields, loading and mobile layout. Use a local test sink for browser submission QA to avoid creating unsolicited external alerts.

## Verification

- 172 tests pass (`/tmp/homepage-qa-polish-tests.log`), including optional/short descriptions, missing-detail identification and explicit-locale link preservation. Required name/email, URL validation, size limits and bot rejection remain covered.
- Production webpack build, TypeScript and scoped ESLint pass (`/tmp/homepage-qa-polish-build-final.log`, `/tmp/homepage-qa-polish-final-lint.log`). Focused review findings were fixed and re-reviewed.
- EN guided browser flow accepts blank descriptions without interruptions, shows the prompt only at Send, restores focus to Send on Escape, and focuses the first missing description via Add details.
- DE single-page browser flow accepts a three-character description, prompts for the remaining blank field, focuses that field via Add details, and sends directly once both descriptions contain text.
- A local-only proxy/sink on port 6889 recorded zero submissions before confirmation and exactly one submission per accepted flow. It stored blank descriptions as empty strings and preserved short text. These QA submissions did not reach Notion or trigger notifications.
- A deliberately delayed project request shows the spinner, `aria-busy` and localized loading status in the suggest bar. An explicit contact command remains available during loading and navigates to the correct localized contact page.
- Confirmation fits within a 320px viewport. Screenshots: `/tmp/homepage-send-details-confirmation-desktop.jpg` and `/tmp/homepage-suggest-loading.jpg`.
- The conversation tagline is now above the homepage enquiry CTAs; the rotating contact caption explicitly describes opening the form/contact details.
- Runtime QA used the optimized build. The dev server is restored on port 6888 with polling to avoid this machine's file-watcher limit. No deployment performed.

## Client search follow-up

Client names remain indexed for matching and combined constraints, but no longer appear as standalone suggestions. Client queries include every matching project in the suggestion rail, removing its previous six-project cap for these searches. Other keyword suggestions and non-client search limits are preserved.

Verified exact/partial client searches and client-plus-tool constraints in behavior tests. Browser checks show 16 project suggestions/results for Fuerst.one (EN) and five for partial Nauti (DE), with no Client/Kunde chips. All 174 tests, TypeScript, scoped lint and formatting pass. Screenshot: `/tmp/homepage-client-project-results.jpg`.
