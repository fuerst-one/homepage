# AI & automation landing page v2

Build on main in codex/ai-automation-landing-v2. Preserve the original checkout and its unrelated work. No deployment or Notion writes.

## Direction

Keep the existing monochrome type, square borders and green enquiry CTA. Replace the repeated full-size screenshot layout on this service only with a compact proof index and three main stories: Test Flow (solo internal use), NuMobility (historical team contribution), Business Hub (internal workspace). Conversion Y, AI Scraper and build-manager remain supporting examples with explicit prototype/internal context. Show only records present in the public publication, with a useful fallback when unavailable.

Explain three client tasks: collect and keep data current; process variable inputs with bounded AI; automate repeatable browser work. Keep prototypes and production responsibilities distinct. Avoid savings claims, agent-count-as-outcome and inferred current deployment. Update EN/DE copy and the existing assessment naming without changing URLs or form behavior.

## Implementation

1. Add behavior tests for curated case selection, context, missing-record behavior and public projection.
2. Centralize bilingual service case stories; reuse the publication reader, layout, Button, enquiry URLs, metadata, starting offer and existing service CSS. Add a server-rendered automation-specific composition, without affecting product interfaces.
3. Update service/assessment copy, verify localized output and case links, run scoped tests/types/lint/build, and check desktop/mobile in the in-app browser. Review the diff before handoff.

## Evidence

Test Flow: project 35686514-f736-8019-921c-e5d8d77e7f23; owner-confirmed solo delivery and occasional internal use. Local ExecuteTestJob/TestRunnerService support queued runs, browser steps and results. Do not repeat the ambiguous halved metric.
NuMobility: owner-confirmed pipeline contribution within a team; source adapters, normalization, storage and background refresh. Historical implementation, no claim of current operation.
Conversion Y: implemented AI creation/translation/evaluation; MVP. No independently verified saving claim.
AI Scraper: prototype combining AI-assisted schemas with deterministic extraction. build-manager: personal internal orchestration.

## Verification notes

- Behavior selection tests failed before implementation, then passed. EN/DE service and assessment integration tests include actual Test Flow/NuMobility/Conversion Y links and exclude ambiguous savings/agent-count claims. Existing product-interface route regressions pass.
- Local preview reads the existing prepared publication; AI Scraper is configured but omitted while its record is absent from that publication. No source sync or shared database writes were run. Its card will appear after normal publication.
- Independent raw review covered bugs, code quality and UI. Resolved the default HTTP test port mismatch and closing-panel prompt contrast.
- Dependencies installed with the repository-pinned pnpm 10.13.1; the unrelated globally installed pnpm 11 could not complete the install under its different policy defaults.

## Completed

Production build, web TypeScript, scoped ESLint/Prettier and all 21 service/assessment tests pass. Checked EN/DE content, 390px mobile reflow, actual project links, proof-index anchors, FAQ opening and assessment enquiry context in the in-app browser. The preview now serves the production build on 127.0.0.1:6906, with no browser console errors on the final page.

Build from apps/web, as the existing OpenGraph route resolves public/fonts from process.cwd(). The initial root-directory Next invocation failed at that route; the package-directory build succeeded without source changes.

Validation output: /private/tmp/automation-tests-final.log, /private/tmp/automation-types.log, /private/tmp/automation-lint-final.log, /private/tmp/automation-format-check.log, /private/tmp/automation-build-final.log. Production preview log: /private/tmp/automation-production-preview.log.

Local screenshots are saved under /Users/Alex/.codex/visualizations/2026/11/18/01a1ed8b-9d4d-7c01-89bc-17ed9d115db0/ as automation-v2-desktop.jpg, automation-v2-mobile.jpg and automation-v2-test-flow.jpg.

No deployments, remote pushes, shared publication writes or additional Notion edits were performed.

## Approved trio revision

The owner endorsed Test Flow, NuMobility and Business Hub as the main trio. Conversion Y is now supporting work. Primary cards lead with localized task headlines, project/context labels and real screenshots; explanations and input/output details are closed by default under native How it works disclosures. Test Flow uses its published natural-language workflow image with a first-image fallback. Screenshot height is uncapped so full images remain legible and their provenance/demo labels remain visible. Assessment evidence uses the same primary trio.

The revised selection and screenshot fallback were tested red-to-green. All 22 scoped service tests pass against the production preview. TypeScript and scoped lint pass; independent bugs, quality and UI reviewers returned no findings. Desktop/mobile disclosure behavior and EN/DE output are checked in the in-app browser. No deployment or remote push.
