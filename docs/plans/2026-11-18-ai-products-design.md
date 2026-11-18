# AI-enabled products landing page

Approved in chat on 2026-11-18. Build in the `codex/ai-products-landing` worktree.

## Offer and design

Add `/en/services/ai-products` and `/de/services/ai-products` alongside the existing interface and automation offers. Lead with “What could your product do with AI?” and discovery through prototype, integration and ongoing ownership. Address customer-facing products and internal tools. Reuse Layout, Button, service metadata, evidence selection, glass panels, typography, lime CTA and native disclosure interactions. Keep all editorial content server rendered.

RoadTrippin leads: mood, interests, dates and destinations become an editable trip, with AI location, stop, trip and day-trip recommendations. Follow with Konfig: design chat generates SVGs and edits designs through in-browser editor tools. Conversion Y covers survey evaluation, improvement and duration suggestions and remains labelled MVP. build-manager covers synthesized project data and the mem0.one-connected knowledge base and remains labelled an internal tool. These feature descriptions were supplied directly by Alex in this chat. Do not attribute general project metrics to AI or invent adoption or measured impact.

Use real publication-backed product screenshots. Present input, AI capability and editable/reviewable result; illustrative copy is labelled as an example, with no fake interactive model or simulated generation. Preserve the distinction between an actual screenshot and an illustrative explanation.

## Implementation plan

1. Add behavior tests for service routing/metadata, ordered public evidence, and enquiry context. Watch the new behavior fail before implementation.
2. Extend the service registry and add a dedicated AI-products page using shared styles/components. Keep existing paid starting offers separate; do not invent a third paid product.
3. Add navigation, hire-page discovery, sitemap/llms discovery and typed enquiry integration. Retain AI-products context throughout the brief and evidence selection.
4. Run scoped lint/format, workspace type checks, behavior regressions and production build. Check desktop/mobile, language switching, FAQs, images and the enquiry transition in the browser.
5. Review the scoped diff and resolve findings. Leave the completed worktree available for review; no merge or deployment is requested.

## Acceptance

Both locales serve the new page with self canonical and reciprocal language alternates, Service JSON-LD, four allowlisted public cases in the agreed order, direct email fallback and a contextual enquiry CTA. Existing service and starting-offer routes still work; unsupported AI-product subroutes return 404. The offer remains readable if publication evidence is unavailable. No changes to upstream Notion content or unrelated dirty files.

## Verification

- Worktree: `/Users/Alex/.codex/worktrees/ai-products/homepage`; branch: `codex/ai-products-landing`; base: `9acd103`.
- Behavior-first red/green: new service recognition, metadata, ordered public case projection, enquiry context round-trip and unsupported starting offers. The initial run failed before implementation; all now pass.
- All 312 regression tests passed against the local preview (`/tmp/ai-products-full-tests.log`). This includes 22 focused HTTP tests for the new and existing landing/starting-offer routes.
- Workspace type checks and scoped ESLint passed (`/tmp/ai-products-types.log`, `/tmp/ai-products-lint.log`).
- Final production build passed, generating 174 static pages (`/tmp/ai-products-build-release.log`). The pre-existing metadataBase warning is outside this page's change; the new page's canonical, language alternates and Service schema were checked directly.
- In-app browser: desktop 1440px; tablet 768px; mobile 390px and 320px; reciprocal language switching, real RoadTrippin screenshot, native FAQ keyboard toggle, and primary CTA to the enquiry flow. No horizontal overflow at the checked widths. The added third service link required two navigation rows on tablets and a two-row services layout on narrow phones to keep the German labels readable.
- Three independent read-only reviews (bugs, security, quality/accessibility) returned no actionable findings. The responsive navigation adjustment followed the browser check.
- Final production preview: `http://localhost:6898/en/services/ai-products` and `/de/services/ai-products`. All 22 focused production HTTP checks passed (`/tmp/ai-products-production-tests.log`). Browser verification confirmed all four product screenshots loaded and no console errors. The quality reviewer also checked the final responsive-navigation delta without findings.
- No merge, push, deployment or upstream Notion update performed. The original checkout's unrelated dirty work was left untouched.
