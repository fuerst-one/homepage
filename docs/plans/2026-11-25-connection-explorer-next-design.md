# Connection explorer comparison version

Keep `/explorer` and `/explorer/connections` available. Add `/explorer/connections-next` as an isolated comparison page; do not switch homepage embeds or existing project links yet.

Use a vertical sidebar tab list: Product purpose, Engineering, Contribution model, Scale & delivery, Manual weights. The first four reuse established full-space similarity scores as spring strengths, never projected coordinates. Manual weights retain the seven-field, shared-budget overlap model. Explain the comparison method per tab. Reuse scale controls and recorded project facts.

Carry over project selection and browser history, shareable settings, selected-neighbour / same-group / cross-group highlighting, selectable neighbours, persistent labels, camera reset, a flat 2D mode, reduced-motion behavior, project links and enquiry context. Preserve accent colors, live hulls, quadratic edge colors, node dragging, and full-width analysis. Geometry remains mounted as settings change. Focus affects visibility only; it never changes simulation forces. Missing lens data is distinguished from disconnected nodes.

The experimental renderer is forked so rendering changes do not affect the comparison baseline. Shared analysis receives optional trait metadata; default behavior is unchanged. Existing hover cards, labels, scale worker, and consent-gated profile helpers are reused.

Blend preset connection strengths over 500 ms with smooth easing, preserving positions and momentum. Interrupted transitions start from their current strengths. Manual sliders respond immediately; reduced motion skips the transition.

Validation: behavior tests for URL validation/round-trip, score mapping, excluded projects, focused neighbours, and optional analysis traits; scoped type/lint/build; browser checks for tab navigation, weights, history, rendering, 2D/reset, project selection, dragging, and narrow layouts. No deployment or homepage replacement in this iteration.

## Live scoring comparison

Add a URL-persisted `model=overlap|similarity` switch inside the preview sidebar. Manual remains the existing seven-field scorer in both modes. Switching a preset or model blends for 500 ms without replacing nodes or clearing their positions.

- Field overlap: reuse Manual's weighted set-Jaccard engine, with 100 points spread equally across the lens fields. Product compares use cases and formats; Engineering compares technologies and languages. Contribution adds ownership, setting, working pattern, and inclusive team-range intersection/union. Scale compares inclusive team/day-range overlap, exact complexity, and scalar weighted Jaccard (smaller/larger) for code size. Missing evidence scores zero; comparable project IDs are shared with the existing lenses so A/B has the same coverage. No population-derived buckets.
- Calibrated similarity: retain original positive edges and rankings. Square raw scores to soften background similarity, then apply a uniform factor so summed `score^2.75` is no greater than default Manual for the same comparable projects. Use all candidate edges for calibration before manual disables, avoiding compensating pull when links are disabled. A zero-evidence reference uses a low 15% pair-strength fallback. Keep original similarity on each edge and show it alongside calibrated strength; analysis and colors use calibrated strength.

Tests cover same-input parity with Manual, actual match membership, missing and historical measurements, numeric overlaps, comparable IDs, disabled edges, calibration ranking/budget/stability, and model URL round trips. Existing connection tests guard the original version while the generic scorer is reused.

## Adaptive layout for calibrated similarity

Global score calibration alone does not control local density. Keep the scores, analysis, colors and original rankings, but derive separate spring coefficients from the weighted graph. With `w = score^2.75` and `degree[i] = sum(w)` over all candidate neighbors, each spring uses `0.018 * w / max(degree[a], degree[b], meanDegree * 0.1)`. The larger endpoint degree bounds both projects' total spring budgets; the mean floor prevents very weak isolated pairs from receiving disproportionate pull. Exclusions happen after normalization, so disabling a connection never strengthens its neighbors. There are no per-lens constants.

A soft radial boundary adds inward acceleration only outside `15 * N^(1/3)` in 3D or `8 * sqrt(N)` in 2D world units, growing with project count in 2D/3D. Existing weak centering remains inside. Missing-data projects receive no invented connections. Dragging overrides the boundary until release. Spring coefficients and boundary activation blend over the existing 500 ms transition, including interrupted model switches. Position objects and momentum stay intact. Manual and Field overlap retain their existing physics.

The spacing budget and boundary density are shared aesthetic choices; the graph supplies their distribution and scale. Layout distance is not an exact measurement of similarity. This borrows the general ideas of degree-aware attraction from [D3 link forces](https://d3js.org/d3-force/link) and gravity preventing disconnected drift from [ForceAtlas2](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0098679), without replacing the current integrator or implementing ForceAtlas2.

Behavior tests cover per-node budgets as neighborhoods grow, disabled-edge stability, force interpolation, outlier containment, and dragging/release. A local simulation of the current 49 public projects at 420 steps increased Engineering's median nearest-neighbor spacing from 18.1 to 23.7 world units, reduced Product RMS radius from 84.5 to 60.4, and reduced Scale's maximum radius from 207.4 to 70.5. These metrics describe this dataset and initialization, not a guarantee for arbitrary data.

## Public integration rollout

Promote the accepted force graph to `/explorer`, with calibrated similarity as the public default. Retain `/explorer/connections-next` as the comparison preview, `/explorer/connections` as the initial manual baseline, and move the original explorer to `/explorer/classic`. Existing canonical links, localized routes, redirects, selected project IDs and perspectives keep working; old `view=network` links open the flat force graph.

Reuse the same component for the deferred homepage embed, omitting its standalone heading and enquiry section. Preserve ordinary page scrolling over embedded graphs (Shift + scroll zooms). Sharing an embedded view opens the canonical explorer with the same settings.

Replace the project-list sidebar's PCA renderer with a compact version of the same calibrated simulation and live cluster analysis. Retain four perspective buttons, result dimming, card-hover selection, visible-card rings, node-to-card reveal, and cluster filtering. Calculate clusters from the full published graph so list filters cannot silently change cluster membership. Keep graph positions when switching perspectives. Full manual controls remain available in the linked explorer. Existing editorial related-project cards keep their recorded reasons.

Verify shared scoring parity, defaults and legacy navigation through behavior tests; verify full-page, homepage, project-sidebar and project-detail handoffs in the browser, including localization and embedded scrolling. No deployment is included.

### Accepted preset model

All four presets now use calibrated similarity in every integration, including the next preview. Remove the comparison toggle and ignore obsolete `model` URL overrides; new shared URLs omit the parameter. Manual retains weighted overlap and its sliders. Switching perspectives still blends forces over 500 ms without replacing node positions. `/explorer/classic` remains available for comparison.

### Temporary route cleanup

Removed `/explorer/connections-next` and the `/lab`, `/lab/projects`, and `/lab/experience` redirects after promoting the calibrated graph. These URLs now return 404. Removed the unused preview-only component variant; `/explorer/classic` and `/explorer/connections` remain available.

Removed the initial `/explorer/connections` prototype as well, including its standalone workbench, renderer and Classic link. The shared scoring, simulation, analysis and styles remain in use by the main explorer. Only `/explorer` and `/explorer/classic` remain as explorer pages.

### Public copy and framing

Removed the visible Classic comparison link while preserving its route. Reused the original Explorer title, translated introduction, two-column header styling, Browse all projects link and enquiry copy. The header accurately describes four presets plus Manual. Desktop and 390px mobile checks confirmed the updated framing, no horizontal overflow, and English/German copy. Remaining polish candidates: collapse layout-method details, label compared fields more clearly, and put perspective selection before the graph on mobile.

Applied the approved sidebar polish: project selection follows the presets, compared fields have a visible localized label, and a native closed-by-default disclosure contains calculation details and connection statistics. Manual sliders and Scale measurement controls remain directly available. Browser checks covered disclosure opening/closing, selecting and clearing Konfig, all seven Manual sliders, and opening/closing Scale controls. Build and scoped lint pass.

Added a shared bottom-of-canvas loading overlay for pending cluster analysis in the full, embedded and compact graphs. It preserves the Scale measurement-loading message, ignores pointer input, announces status and honors reduced motion. Verified the overlay during a live perspective switch and its removal after completion; build and scoped lint pass.

## Smooth dimensional transition

Switching to 2D closes two depth limits toward the XY plane over 500 ms with smooth easing, while the simulation continues moving nodes within the plane. The camera eases around the graph toward the front view while preserving zoom distance. Switching back gradually restores saved depth; rapid reversals start from current coordinates. Reduced motion completes the depth change immediately. Behavior tests cover symmetric compression, preserved point identity and in-plane momentum, reopening, interrupted transitions, empty input and pinned nodes.
