# Service landing page presentation

Improve the existing code-authored service pages in the editorial worktree. Preserve the EN/DE copy, service schema, published project evidence, image descriptions and contextual enquiry paths. Notion continues to supply project evidence; it does not control these layouts.

Use the existing monochrome typography and glyph renderer with the site's pale green accent. Give service overview pages an opt-in wide layout, leaving the default reading layout unchanged. Build a split hero with an oversized headline, the existing engagement choices and a service-specific glyph sculpture: interface panels, a gear and an abstract connected form. Reuse LandingShape and its renderer rather than add another graphics stack.

Alternate generous section spacing, three-column capabilities and process steps, large project imagery and contrasting engagement / fit sections. Keep paragraphs at a readable measure even when sections span the available width. Retain the branch links in the hero and the detailed chooser later in the page.

Load the sculpture separately from the server-rendered text. Provide an immediate static illustration, a named pause control, reduced-motion support, and stop the scene while outside the viewport or while the document is hidden. Use restrained CSS entrance and scroll animations with a visible static fallback and reduced-motion override.

Start with Product Interfaces, then apply the same shared presentation to the other service overviews. Branch offer and collaboration pages keep their current focused layout during this pass. Verify the new motion control and existing routes, project evidence and enquiry behavior. Check all three overviews in English and German, desktop and mobile, and check reduced motion and pause behavior in the browser.

## Implemented and verified

All three EN/DE overview pages now use the wider layout and glyph hero. The Product Interfaces case studies use a narrative/image split; the AI-products preview pairs a brief with its gallery; automation uses a wide first case with subsequent cases in columns. Capability and process sections use columns, with pale green engagement sections and light fit statements as visual breaks. Branch pages keep the existing reading layout.

The owner requested orbit dragging after reviewing the first visual pass. The artwork now reuses the existing OrbitControls path, with a visible drag hint, keyboard focus and Shift + arrow rotation. Manual rotation works while paused. Ordinary arrows retain native scrolling, and touch-action preserves vertical scrolling and pinch zoom. Keyboard tests verify direction, constant viewing distance, pole safety and non-interception of ordinary keys.

Validation: production Webpack build; web TypeScript; scoped ESLint and Prettier; 416 passing tests against the production preview. Browser checks covered English/German at 320px and desktop widths, actual mouse orbit, keyboard pause/resume and rotation, ordinary arrow scrolling, gallery navigation and offscreen scene cleanup. No console errors in the fresh production preview. Independent bugs, code-quality and UI reviewers reported no remaining findings after fixes. Logs are in /tmp/homepage-presentation-*.log. No deployment in this pass.

## Model refinement preview

The Product Interfaces model now uses a solid hand cursor touching a raised button. The owner preferred a software-interaction symbol after reviewing the interface panels and a Bézier-curve trial. The custom geometry stays inside the deferred service renderer and reuses the existing glyph, pause and orbit controls. Automation keeps its gear, displayed at 80% of its previous size to leave more space around it; AI Products keeps its existing model.

This refinement is available on the development preview at port 6899. Validation: web TypeScript, scoped ESLint and Prettier, 41 passing geometry/orbit/service regression tests, desktop and mobile visual checks, and actual orbit dragging while paused. The geometry tests cover finite shader attributes and lazy-cache disposal. Independent bugs, code-quality and UI reviewers reported no findings on the hand-model changes. Logs are in /tmp/homepage-hand-*.log.
