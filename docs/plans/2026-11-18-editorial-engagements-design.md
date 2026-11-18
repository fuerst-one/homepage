# Service engagement paths and case-study briefs

Alex approved this bilingual editorial implementation in an isolated worktree. Keep the existing service landing pages as overviews. For product interfaces and automation, present the existing paid, bounded review/assessment alongside project delivery and embedded collaboration. AI products gets a collaboration path without inventing an audit package. The collaboration page for each service explains project delivery and team involvement together. Preserve direct enquiries from parent pages.

Reuse Layout, Button, service styles, curated public evidence, locale/metadata helpers and the existing enquiry flow. New URLs are `/{locale}/services/{service}/collaboration`. Project and team CTAs preserve the service. Team enquiries preselect the existing team intent; general project enquiries let visitors choose their actual stage. The review/assessment remains independently useful and optional. Give the lower pages detailed milestones, participation, access, effort drivers, handover and maintenance answers; retain brief orientation FAQs on parents. Publish reciprocal locale links, self canonicals, Service JSON-LD and sitemap/discovery entries.

Add concise problem/contribution/delivery/result briefs for Konfig and Test Flow, using existing published evidence. Keep Test Flow explicitly personal, solo and occasionally used internally. Describe Konfig's usage figures as owner-reported project results, without causal promises. Alex confirmed Konfig was three days/week on 2026-11-18. Apply that reviewed correction consistently in public project reads, without editing the shared Notion database or publishing content during worktree development.

Visual direction: preserve the existing restrained monochrome editorial layout and typography. Use two clearly differentiated, responsive engagement options and ordinary accessible links; no new design system, client bundle, dependencies, pricing, scheduling promises or mandatory enquiry steps. Leave articles and the blog for later.

## Implementation and acceptance

1. Create the isolated `codex/editorial-engagements` worktree from deployed main; preserve the dirty original checkout.
2. Write HTTP behavior tests for both engagement routes, service-specific project/team enquiry context, canonical/language/schema/discovery metadata, audit-to-collaboration navigation, case briefs, correction and invalid URLs. Confirm failures against the unmodified app.
3. Add typed bilingual collaboration content and a shared server renderer. Extend the existing starting-offer component into the engagement chooser. Add practical offer FAQs and shorten parent FAQs.
4. Add reviewed case briefs and apply the confirmed working-pattern correction through public project readers. Do not create or expose briefs for withdrawn/unpublished project records.
5. Run focused and broader relevant tests, TypeScript, scoped lint/format and a production build. Check desktop/mobile rendering, keyboard access, locale switching, enquiry selection and console errors in a browser.
6. Review the scoped changes independently, resolve actionable findings, and record evidence. Keep the worktree available for review; no merge or deployment is requested.

## Acceptance evidence

- Worktree: `/private/tmp/homepage-editorial-engagements`, branch `codex/editorial-engagements`, based on deployed revision `39804b4`. The original checkout's unrelated changes were not included.
- Six localized collaboration routes, existing review/assessment routes and parent enquiries are connected. General project enquiries preserve the service and allow stage selection; team enquiries preserve the service and preselect team involvement.
- Konfig and Test Flow have opening briefs on their standalone project pages and published case studies. The corrected Konfig working pattern is returned by the public project accessor and API without mutating the shared Notion publication.
- Initial HTTP tests failed on missing routes, links, briefs and the four-day working pattern. Two review-driven regressions were also demonstrated red before fixing: curated copy in the client bundle, and incorrect prototype-to-production preselection for general projects.
- Final production HTTP and unit suite: **411 passed, 0 failed**. Log: `/tmp/homepage-editorial-production-suite.log`.
- Production Webpack build passed. Web TypeScript, scoped ESLint and Prettier checks passed. Logs: `/tmp/homepage-editorial-build.log`, `/tmp/homepage-editorial-types-final.log`, `/tmp/homepage-editorial-lint-final.log`, `/tmp/homepage-editorial-format-check.log`.
- Independent bug, code-quality and UI reviews have no remaining findings after fixes. `ProjectBrief` is server-only and is passed into the standalone project detail renderer as a slot; the client-side project dialog does not import the curated registry.
- Browser verification covered all six collaboration routes at 320px, German parent pages and flagship case briefs against the production build, the two-option desktop chooser at 1440px, keyboard-operated FAQ disclosure, audit-to-collaboration navigation, team intent selection and locale preservation. Observed mobile document width was 309px within the 320px viewport. Production browser error log was empty.
- Local production preview: `http://localhost:6898/en/services/product-interfaces`. No merge, deployment, live content edit, enquiry submission or blog implementation was performed.
