# Capabilities, methods and project scale — approved cutover

User approved the full field audit recommendation, then specified: implement the latest schema directly, no backward compatibility; put production changes on main and merge main into codex/portfolio-lab-preview.

## Delivery

1. Isolated `/private/tmp/homepage-main-dimensions` checkout of main, fast-forwarded to origin/main d274a4a. Preserve the dirty lab checkout.
2. Main: replace Experiences with Capabilities + Methods across ingestion, publication, CV filters/presets, search/API, PDF and SEO. Add explicit public numeric scale projection with basis labels, no raw research paths. Update database via a tested preview/apply migration; preserve uncertain source notes and effort class disagreements rather than rewriting estimates. No legacy fallback. Missing values remain unknown.
3. Refresh publication from the new schema, verify production pages/build before completing the main commit and integration.
4. Merge main into lab branch without losing existing edits. Update lab models and picker for new fields. Add a numeric Scale & delivery lens and project detail facts; experiments recompute from active subset. Numeric distances keep range endpoints grouped; missing does not mean zero. No new paid embedding calls without applicable approval.
5. Browser verification, meaningful behavior tests/types/lint/build; review; report actual branch/deployment status.

## Taxonomy

Capabilities answers what work/competencies; Methods answers how. Explicit tag-level migration, never hardcoded project groups. Methods include testing/research/prototyping/CI/CD and conceptual frameworks formerly in Tools. WebGL moves to Tools. Knowledge tags need retained, visible context rather than silent deletion. All unknown tags are reported. Retain original Notion source data in the migration backup; no permanent schema deletion required.

## Completed state — 2026-11-18

- Main cutover committed and pushed as `314ff0381887574f33283982ee8ee21f671d53d1`. Vercel and the content worker were verified at that revision. See `docs/project-dimensions-cutover-2026-11-18.md` for migration, publication and production checks.
- Main merged into `codex/portfolio-lab-preview` as `a29805e`. The original checkout is on main. All further lab work is isolated in `/Users/Alex/.codex/worktrees/portfolio-lab/homepage`; local lab dev port is 6895, separate from main's 6894.
- Capabilities and Methods are used directly throughout the lab and its source exports. No runtime fallback to Experiences. Methods participate in search, transferable-work embeddings and cross-sector related-project explanations.
- The local embedding playground exposes 37 public fields. Numeric text inputs retain units, bounds and public provenance labels. Raw research notes, paths and revisions remain excluded. Its provider endpoint is disabled in production and restricted to same-origin loopback development requests.
- Scale & delivery is a fourth, locally calculated lens. Selectable complexity, team range, rebuild-effort range and code size are fitted on complete comparable projects within the active sector filter. Constant fields add no distance. Zero code is valid; missing values are never imputed as zero.
- Complexity uses its fixed 1–5 range; other numeric fields use `log1p` and the current complete subset's bounds. Each varying field has equal squared-distance weight; two range endpoints share that weight. Neighbour proximity is `1 - Euclidean distance` in this normalized space, not cosine. The same deterministic adaptive PAM clustering selects the group count. Classical MDS yields principal-component projections. Numeric axis descriptions follow the strongest measurement correlation, while median ties receive no directional descriptor.
- Numeric fits run in a dedicated Web Worker. Field and filter changes cancel superseded jobs, show a pending state and cannot apply stale results. Current default: 35/49 comparable projects; removing effort and code permits 42/49. Full browser calculations were around 0.5–0.9 seconds; the seven-project maritime subset took about 4 ms. Timings depend on device and selection.
- The approved initial refresh generated 117 vectors and reused 33. After the user's requested rerun, the local export matched the other agent's completed publication timestamp exactly (`2026-11-18T08:59:12.303Z`). There are now 49 public projects; all 147 recipe hashes match cached vectors, so the second run made no new provider calls. All three semantic maps include all 49 projects.
- The research page's document-comparison pairs use a separately dated read-only production export containing existing knowledge chunks, because the refreshed local publication has no local knowledge chunks. This provenance is retained in the snapshot; no knowledge-index provider run was performed.

## Verification

390 application tests, TypeScript, ESLint and the production build pass. Read-only bug, quality, UI and security reviews completed; actionable findings were fixed. Browser checks covered numeric 2D/3D rendering, worker completion, rapid field changes, sector refits, missing counts, method search/relations and the field picker. The production-built worker was also exercised; the production embedding endpoint returns 404. No console errors were observed. A mobile viewport override did not change the actual in-app viewport, so this pass does not claim a new mobile runtime verification.

## Refreshing from the local publication

Run commands from the lab worktree after the content sync completes. Keep the publication export and snapshot inputs explicit. The comparison export is optional and must retain its date if reused.

```sh
node --env-file=.env.local --import tsx scripts/export-project-lab-db.ts data/project-lab/db-local-current.json
node --env-file=.env.local --import tsx scripts/project-lab/export-notion.ts data/project-lab/notion-current.json
node --import tsx scripts/project-lab/build-snapshot.ts --database data/project-lab/db-local-current.json --comparison-database data/project-lab/db-current.json --notion data/project-lab/notion-current.json --commercial data/project-lab/commercial-tag-audit.json --private data/project-lab/private-tag-audit.json --output data/project-lab/snapshot.json
node --env-file=.env.local --import tsx scripts/project-lab/embed-atlas.ts
```

The final command is a dry run reporting exact pending vector and character counts. Only add `--embed` when paid calls are authorized. Then regenerate the public projection, which contains no raw dense vectors or private audit data:

```sh
node --import tsx scripts/project-lab/prepare-preview.ts data/project-lab/snapshot.json data/project-lab/db-local-current.json data/project-lab/semantic-embeddings.json
```
