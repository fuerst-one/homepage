# Context-specific service imagery

Implement the approved image-selection review from this chat. Reuse ProjectScreenshots for short manual galleries; keep the interface hero and starting-offer evidence compact. Select only screenshots and explicitly linked, published, locale-specific case-study images. Preserve conceptual/synthetic labels and source captions. Missing selections fall back to an available product screenshot without inventing assets.

Selections: RoadTrippin hero #2 then #1; AI cases use their published AI illustrations with Konfig #6, Conversion Y #1 and build-manager #2. RoadTrippin's case uses its trip-generation illustration when available. Interface cases use Konfig #2/#3/#4 and Seabo #3/#4, retaining Konfig #1 in the hero. Automation uses Test Flow #3/#2, Business Hub #2/#1 and NuMobility #1. Starting offers use one image: Konfig #2, Seabo #3, Test Flow #3, Business Hub #2 and NuMobility #1.

Keep selection and the small public image projection on the server. Pass captions, provenance labels and selected URLs to the existing carousel. Preserve full images; expose localized manual navigation and meaningful image alternatives. Test selection, fallback, locale and publication boundaries as behavior; check crop, captions and mobile controls in the browser.

Coordinate with the active image-description work in codex/image-description-search: its cached detailed descriptions and concise alt text should be reused, not independently regenerated. Do not publish until that work and this change have been integrated and verified together. No deployment is authorized by this implementation request.

## Implementation and verification

Implemented the selections, scoped public case-study image resolution, full-image fitting, authored provenance captions, localized manual controls and keyboard cycling. Existing portfolio screenshots continue to use the same shared component; service pages add their selected image metadata through ServiceProjectVisuals. No model calls or new image-generation pipeline were introduced.

All 43 scoped service tests pass against both the development server and the isolated production build. Type checking, scoped ESLint and Prettier pass. Bugs, code-quality and UI reviewers returned no actionable findings. All 25 distinct image URLs on the ten localized service/offer pages returned valid image responses. In-app browser checks covered desktop, 390px and 320px layouts, EN/DE captions, manual/dot/keyboard navigation, gallery wrapping and single-image offer sections.

An initial build of the shared checkout encountered unfinished HomeWork files being added by another active session. A clean HEAD snapshot with only this task's files and local dependency copies passed the complete production build. Its preview runs at http://127.0.0.1:6937/en/services/ai-products. Logs: /tmp/verify-imagery-isolated-build.log and /tmp/verify-imagery-production-services.log.

The separate caption feature is ready in /Users/Alex/.codex/worktrees/image-description-search/homepage but remains unmerged. This task does not copy or merge that worktree. Before publishing, reconcile its ProjectScreenshots additions (projectId, initialDescriptions, useImageDescriptions and GeneratedImageDescription) with this task's imageDetails, fit, priority and localized controls. Preserve authored imageDetails.alt/caption and the explicit illustration label; generated text must supplement those labels. Pass only descriptions for selected URLs through the service gallery. Run the combined rendering and withdrawal tests after integration. The imagery-only commit is intended for integration by the image-description session. No remote push or deployment was performed here.
