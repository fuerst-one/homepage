# Project taxonomy cleanup

User authorization: clean Notion through the in-app browser, avoid duplicate fields, restore and extend all dependent app behavior. Preserve unrelated dirty work. The user separately authorized committing and deploying this change on 17 November 2026.

## Field decisions

- Add only three missing concepts: `Sector` (select, project-owned primary market), `Usage context` (multi-select), and `Delivery model` (select). They do not duplicate engagement, workplace, lifecycle, audience, or capabilities.
- Reuse `Project Domains` for use cases, `Product type` for product formats, `Target market` for B2B/B2C/B2G/B2B2C, `Experiences` for work delivered, and the existing AI and lifecycle fields.
- Keep existing Notion property names/IDs for reused fields so existing integrations continue reading them. Correct labels and semantics in the app. Keep the client `Industries` rollup as source metadata; it must no longer classify projects.
- Use one project sector rather than adding overlapping sector and primary-sector properties. Additional use-case overlap remains represented by the existing multi-select.
- Move SaaS to Delivery model; Personal to Usage context; Experimental to Usage context as an explicitly retained experimentation context (do not infer prototype/production status). Move commerce/configuration/developer tooling from product formats to use cases. Academic commissioning is not an Education sector unless the product teaches.
- Unknown sector remains empty. Do not infer delivered AI features or change ownership, metrics, lifecycle, dates, or hidden records.

## Progress

- [x] Read-only audit: live 45 records / 42 public / 3 hidden; 27 referenced clients. Project industry rollup duplicates verified. Existing field inventory checked.
- [x] Opened Notion Projects in authorized in-app browser; no login needed.
- [x] Created Sector, Usage context, and Delivery model through browser UI; all public rows backfilled.
- [x] Build versioned per-project before/after manifest from read-only source audit.
- [x] Apply public-project taxonomy edits via browser UI and verify all manifest fields for 42 public rows; hidden rows excluded by view filter.
- [x] Add behavioral regression tests, observe failures, implement shared normalization and publication projection.
- [x] Update cards, detail views, scatter/legend, analysis charts, search/filter/API, Lab snapshot, and Experience Atlas to consume the same sector/use-case/product-format data.
- [x] Refresh the normal local database and Lab snapshot from the edited Notion source. 42 projects, 30 localized case-study variants, 117 assets, 0 deferred assets; local Postgres 127.0.0.1:55438. Reuse the normal app on port 6894. Extra preview stopped and removed at the user's direction.
- [x] Diagnose repeated stale publications: the existing background Notion watcher retained modules loaded before the taxonomy change. Restart the existing watcher with current source, then force a normal publication refresh. Final local publication at 2026-11-17T20:21:32Z matches every manifest taxonomy field for all 42 projects, with 12 sectors.
- [x] Run tests, type checks, lint/format/build, browser acceptance, and scoped review. Resolve all review findings.
- [x] Extend the user's chart request: remove the 120px/215px chart constraints and centered inner wrapper. Treemaps, pie chart, and tools list use the panel's available height with an 8px inset. Tooltips stay inside the chart; tools retain internal scrolling.
- [x] Record final evidence, screenshots, and release limitations below.

## Evidence

- Original read-only audit source: `/tmp/homepage-taxonomy-source.json` (fetched 2026-11-17T19:24:02Z), script `/tmp/homepage-taxonomy-read.mjs`.
- Browser `notionTab` in `mcp__cua_repl`, tab ID 1, project Konfig, DB f53d61ec13a049b79f25c5c98e0994cb.
- All Notion mutations must remain browser UI actions. SDK/API is allowed only for read-only verification and normal application publication refresh.

## Final verification

- `ops/notion/taxonomy/browser-edit-verification-2026-11-17.json`: every per-project manifest field matches read-only live Notion verification; 42 public rows, 3 hidden excluded, zero differences. Mobile.de's existing A/B-testing service was preserved in Experiences when removed from Product type.
- Full suite: 352/352 passed with `SEO_TEST_BASE_URL=http://localhost:6894 pnpm test`; `/tmp/verify-taxonomy-full-tests-final.log`.
- Workspace type checks, scoped ESLint and Prettier, and production build passed. Build log: `/tmp/verify-taxonomy-chart-build.log`. The build retains the existing development-only Lab filesystem-tracing warnings; Lab routes reject production access. A one-word ECharts `initialLayout` to `initLayout` correction in the concurrently added semantic chart unblocked the build.
- Independent bug, code-quality, UI, and security reviews: no remaining findings. Fixed saved Healthcare/maritime filters, sector-aware enquiry evidence and landing matching, OpenAPI response metadata, and German industry option/chip/search labels.
- Browser on normal port 6894: cards and details show sectors; combined sector/format/context filters and URL reload work; German sector search works; chart click filters work; scatter rendering/legend/labels work; Atlas retains all 42 projects in the 12 sector groups and search/selection work. Mobile width 390 has no horizontal page overflow.
- Chart DOM measurements: panel 360x216, chart canvas 342x198 (borders plus 8px inset). Types and Fields use the same height; tools scroll in a 198px viewport instead of being cropped by a fixed 215px box.
- Screenshots: `/Users/Alex/.codex/visualizations/2026/11/17/01a1eaed-f00f-7110-8207-2505e6323c6c/project-sector-desktop.jpg`, `project-sector-mobile.jpg`, and `project-industries-full-panel.jpg` in that directory.
- At implementation handoff, no paid embedding refresh, commit, or deployment had occurred. Lab comparison embeddings remain explicitly historical; the local knowledge database has no current embedding corpus. Unrelated dirty work preserved.

## Release preparation

- Scope the commit to the taxonomy, dependent public UI/API/enquiry behavior, chart sizing, migration manifest, and their tests. Keep the separate unfinished Lab/Atlas and lifecycle/AI enrichment work uncommitted. Move the Atlas-specific taxonomy regression into its existing uncommitted test file so the release tests have no dependency on those unreleased components.
- Validate a clean release tree built from HEAD plus only the 31 intended files, with its own frozen-lockfile install. The exact scoped tree passes 286 tests, workspace type checks, and its production build. This excludes all unrelated uncommitted dependencies and source files.
- Current release mechanism verified before push: Vercel and the Coolify sync worker both automatically follow main. Both currently run `49f84ac761ba86388c49e613fa13fd48114a7236`; the worker is healthy. Push the scoped commit, then verify each deployment's exact source SHA, worker health, the refreshed production publication, and the public UI/API.
