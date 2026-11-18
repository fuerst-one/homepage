# Project cards and image gallery

User-approved refinement: keep the card name at its current size and put the project purpose below it in smaller text. Image clicks open the modal; the remaining card surface opens the existing full project page. Explicit Website, Case study and GitHub actions retain their destinations. Add a visible project-detail action beside the case-study action.

The modal becomes a image gallery within the previous modal width (64rem maximum) and 90dvh height, with a project-name and smaller purpose header and persistent detail/case-study actions. Remove description and dates. After the subsequent user correction, retain a compact context strip below images for role, stage, team size and complexity (including its assessment basis). Match the detail, case-study, live-site and GitHub button dimensions. Reuse ProjectScreenshots with a viewer mode that contains each image without cropping. Keep full project content on the dedicated page. Use the published composed title's first spaced dash as the presentation split; do not change source data, slugs or sync.

Scope: project card, existing dialog, screenshot component and removal of the obsolete dialog branch from ProjectDetails. Preserve concurrent Atlas integration work. Behavioral tests cover title splitting and native card destinations. Browser acceptance checks image vs card clicks, keyboard navigation, gallery controls and desktop/mobile image fit.

Further user correction: full-page Project facts & technologies is a static section with a heading, without the outer disclosure. Individual metadata rows retain their existing controls.

## Validation and outcome

- Full suite: 459 passing. Workspace types and scoped ESLint passed. Production build passed; the existing metadataBase warning remains unrelated. After the final short-height CSS fix, the 12 focused heading/card/case-study navigation checks passed again.
- In-app browser verified image click opens the gallery, image navigation changes the active screenshot, the main card surface opens the existing detail page, and the modal detail action preserves the locale. German full-page facts have no outer details ancestor.
- All four actions measure 176 × 44 on desktop and 156 × 44 at 390px width, with no horizontal overflow. At 568 × 320, scrolling preserves the image and keeps actions reachable; the header and close control stay visible.
- Bugs, quality and UI reviewers checked the scoped changes. Duplicate accessible names were corrected by retaining the full project identity. The short-height finding was reproduced and fixed.
- Reused the concurrent Explore integration's locale-aware screenshot controls; retained its changes and all unrelated edits. Only the project card/gallery files and these behavior tests belong to this commit.
- Evidence: `/Users/Alex/.codex/visualizations/2026/11/17/01a1e9cf-fd06-74d2-8bab-a07ca973cdc2/project-card-gallery/`.
