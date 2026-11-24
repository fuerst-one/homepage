# Portfolio Lab preview

The preview branch `codex/portfolio-lab-preview` integrates two portfolio explorers:

- `/en/lab/experience`: semantic 3D and 2D spaces, a spring network and a shared project detail section. Selecting a project updates its detail and the URL. Bubble area uses the published Wow Factor rating; perspective affects apparent 3D size. The earlier theme switch and grouped context maps have been removed.
- `/en/lab/projects`: four complementary analyses: needs/use-case coverage, skill pairings, timelines and a weighted similarity workbench. The Atlas handles maps, networks and clusters. Both surfaces offer compact project comparisons, with recorded shared tags, differences and unknown inputs. The workbench retains the exact weighted matrix and source receipts as optional expert tools. The local research components remain in source, but internal audit and effort/team-estimate views are not exposed by this route.

Both use the site's `Layout`, navigation, background, typography, footer and enquiry button. Projects links into both explorers. Lab content is currently English; German Lab URLs redirect to English. The pages remain `noindex` during preview evaluation.

## Data boundary and refresh

`apps/web/src/content/lab-preview.json` is the deployment artifact. It contains an explicit public projection of the portfolio snapshot, the Atlas view models, reduced coordinates and pairwise similarities. It contains no dense embedding vectors, raw Notion records, repository audit paths, private evidence gaps, team estimates or effort estimates. Only IDs present in the supplied public publication export can enter it.

The projection retains the reviewed contribution/delivery/outcome descriptions used in the original client Atlas. Owner-reported outcomes remain labelled as such. Cluster membership, semantic ranking and coordinates are computed; three selected project introductions use editorial excerpts.

The 2D and 3D views draw faint convex envelopes around those same clusters, with small marker-sized padding. Padding also keeps flat and singleton clusters valid. The envelopes do not intercept point selection and can be hidden with **Clusters**. Overlap is expected in a reduced projection; an envelope is not a confidence interval.

Axis descriptions are computed from recorded terms for the active lens. For each displayed coordinate, signed point-biserial correlation selects the strongest repeated term at each end (at least two projects with and without the term; absolute correlation at least 0.3). These are post-hoc reading aids, not names for learned dimensions or proficiency measures. Weak or degenerate directions fall back to **Mixed patterns**. The full labels remain visible below the plot when canvas labels are abbreviated. No model calls or embedding-cache refresh are needed for these descriptions.

The preview is a fixed snapshot, not a live DB-to-embedding refresh. Using the existing local research snapshot, the current public portfolio export and the prepared embedding cache:

```sh
node --import tsx scripts/project-lab/prepare-preview.ts \
  data/project-lab/snapshot.json \
  /tmp/public-portfolio-export.json \
  data/project-lab/semantic-embeddings.json
```

This command makes no network calls. It refuses an empty population and reports missing or stale embeddings per lens. Review that report and the generated data before committing a refresh. Changes to embedded fields require explicitly regenerating the affected local cache entries first; metadata-only updates do not require new embeddings. The script writes the brand as FUERST.ONE, because one artifact serves both locales; person names stay as recorded.

The prepared artifact contains 49 projects from the 2026-11-20 publication: 49 product profiles, 49 engineering embeddings and 49 contribution profiles. In product profiles, API and MCP Server count half as much as other formats, because many projects record them next to a more telling format. The Research Lab no longer depends on the empty legacy mixed-text comparison corpus. Cross-lens leads require disjoint known tools and at least two shared client needs covering half the combined need labels; this is an exploratory rule, not a suitability score. See `docs/plans/2026-11-18-lab-consolidation.md` for the temporary checkpoint and history-cleanup reminder.

## Vercel preview

The existing Vercel project is `fuerst-one-homepage`, with `apps/web` as the root directory. Push this branch without merging to `main` to create a preview. The surrounding website and image proxy require the existing `KNOWLEDGE_DATABASE_URL` and `KNOWLEDGE_DATABASE_CA_CERT`, scoped to this preview branch. The Lab artifact requires no local filesystem exports or embedding API key at runtime. The paid assistant is not enabled for this preview.

## Validation

The initial clean branch suite passed (340 tests) against its own production server. After the hull and axis-label refinements, the shared development checkout passed all 366 tests, a production webpack build, type checking and scoped lint. Tests include the public data boundary, semantic recipes and projections, score sizing, clustering, degenerate hull geometry, descriptive-axis direction and actual ECharts spring dragging. Browser checks cover desktop/mobile layout, project selection through the hulls, cluster visibility, lens-dependent labels, Research Lab analysis switching and the shared site links. Dependency-level `THREE.Clock` deprecation warnings are present in development; no application console errors were observed.

Unrelated enrichment changes and private local exports are not part of this branch's commit.
