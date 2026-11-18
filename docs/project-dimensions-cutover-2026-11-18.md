# Project dimensions cutover

The website now reads `Capabilities` and `Methods` directly from Notion. Search,
CV presets, project filters, the public API, PDF output and project metadata use
these fields. Runtime code does not read the old `Experiences` field.

The reviewed one-time migration populated 50 visible projects. Testing,
prototyping, research and process tags moved into Methods; technologies moved into
Tools. Conceptual frameworks previously stored under Tools moved into Methods.
The source Experiences column was left untouched. New tags require no code mapping
after this migration. Eighteen projects currently have no recorded Methods.

Project details also show recorded team ranges, complexity scores, effort ranges,
code size and working pattern. Effort is labelled as a rebuild estimate where its
source establishes that basis. Unknown bases stay explicit; missing numbers stay
unknown. Source effort classes and computed classes remain distinct. Measured code
is not a claim of authorship. Raw research notes, repository paths and revisions
are excluded from the public projection.

## Publication and release

`website-v3` / version 3 is the current contract. Migration
`008-project-dimensions.sql` allows it to be prepared while the deployed application
continues reading its own `website-v2` publication. The current code only reads v3.
Retaining the earlier publication avoids a web/worker deployment race; it is not a
legacy-field fallback. Asset access remains restricted to published asset keys.

Before deploying this code, apply migration 008 as database owner and prepare the
v3 publication and its referenced assets. The web app and sync worker then deploy
independently from main. Do not delete the previous publication while old readers
or a rollback still need it. No provider embedding requests are required for this
field migration or the existing local TF-IDF/UMAP project overview.

## Validation

- 293 application tests and 26 database integration checks passed.
- Type checks and the production web build passed against the refreshed local DB.
- Browser checks covered project details in both languages, the narrow mobile
  layout, Methods selection, and the missing-methods explanation.
- Migration, data handling, security and UI reviews were completed; actionable
  findings were resolved.

The lab changes remain on `codex/portfolio-lab-preview`. After this cutover, lab
development moves to its own worktree so the original checkout can stay on main.
