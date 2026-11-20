# Portfolio cleanup and local publication receipt — 18 November 2026

Notion writes completed and read back at 09:48:09 UTC (10:48:09 CET): **134
properties across 20 public projects**. Source reread at 09:48:56 UTC. The local
`website-v3` publication refreshed at **09:49:54.737 UTC (10:49:54.737 CET)**.

Source: 53 rows, 49 public and 4 hidden. Both EN and DE publication projections
contain the same 49 unique public IDs. The refresh prepared 32 case-study bodies
and 129 assets, with zero deferred assets. No production deployment or paid
embedding requests were performed. The lab worktree/server/snapshots/vectors
were untouched. Shared search, privacy and visual work was preserved.

## Verified changes

| Field                                   | Before / 49 | After / 49 |
| --------------------------------------- | ----------: | ---------: |
| Code measurements + date/revision/scope |          35 |         42 |
| Team bounds                             |          42 |         49 |
| Ownership                               |          42 |         49 |
| Personal contribution                   |          27 |         34 |
| Contribution basis                      |          28 |         35 |
| Methods                                 |          32 |         38 |
| Basis for populated effort ranges       |     36 / 42 |    42 / 42 |

The previous audit's 27 source/public field differences across 18 projects are
resolved. Final audit: **zero checked field differences in EN/DE, zero unknown
selected taxonomy values/core-field regressions, zero private-field leaks**.
New vocabulary retains restricted-access production and retired products as
distinct stages; data parsing, code refactoring, geo suggestion, trip planning,
routing, selling products and developer tools now survive public projection.
German labels are available through the existing label helper.

Personal/Experimental were removed from customer market and retained under usage
context. Physical Product moved from delivery model to Physical product format.
Open Source is a distribution model; its duplicate usage label and OSS customer
market were removed from ts-shove. This deliberately reduces populated customer
markets from 42 to 37; no customer segment was invented for personal experiments.
Unused older schema options were preserved rather than deleting editor history.

Owner confirmed full solo contribution on Pokémon Arena, Home Pi, Traidy, Daily
Briefing, SERP API, Housing Hunter and AI Scraper: contribution and team size one
are recorded independently of code footprint. Six are owner-described completed
apps. Traidy's more specific clarification takes precedence: an experiment that
reached basic viability and was deprioritized; Prototype / On Hold / Experimental
are retained, with a self-reported experimental result. No adoption or trading
performance is inferred.

World Vision, LockBot, Zooplus E-Food, Kleiner als Raute, Mobile.de Financing and
ROLLT! have owner-confirmed historical personal effort, not rebuild estimates.
Public scale adds `historical-personal-effort`; both language views label it
explicitly. The other 36 documented ranges remain rebuild scenarios. Do not
combine these two bases into one effort comparison. Stored numeric ranges and
classes were preserved; an hours-per-day conversion was not inferred.

Six Methods backfills are supported by configured test artifacts: Pokémon Arena,
Home Pi, Traidy, Daily Briefing, SERP API and ts-shove. ts-shove also has a CI/CD
workflow. This cleanup inspected those artifacts; it did not rerun all seven
external applications or establish their runtime quality. Eleven other missing
Methods remain unknown rather than deriving process from framework names.

## Measured repository scopes

Current working-tree SLOC from the reused cloc helper, with generated/vendor,
dependency/build output, data/captures, docs/static assets, generated Supabase
types and stock UI primitives excluded. Application file counts exclude tests.
Dirty state and each HEAD are recorded; modified trees are not exact HEAD builds.
Housing Hunter includes worker plus apartment-scout-ai; Home Pi covers only the
mapped frontend/server/deploy repository, not all device firmware. Code size is
not original authorship, quality or historical effort.

| Project        | Application SLOC | Test SLOC | Application files |
| -------------- | ---------------: | --------: | ----------------: |
| Pokémon Arena  |           17,314 |    10,672 |                41 |
| Home Pi        |           10,294 |     4,280 |               142 |
| Traidy         |           10,171 |     4,791 |               108 |
| Daily Briefing |           29,792 |     2,391 |               202 |
| SERP API       |            1,165 |        23 |                45 |
| Housing Hunter |           10,655 |       271 |                74 |
| AI Scraper     |            1,535 |         0 |                11 |

AI Scraper's zero Test SLOC is a measured absence in the inspected scope; unknown
measurements were not filled with zero. Bags’n Boxes Online-Shop remains
unmeasured because the recovered scope is only a prototype/reference, not the
delivered shop. Six other unmeasured projects have no mapped product source.

## Remaining gaps

- Seven projects lack complexity, effort bounds, maintenance and working pattern:
  Pokémon Arena, Home Pi, Traidy, Daily Briefing, SERP API, Housing Hunter, AI Scraper.
- Code measurements remain missing for World Vision, LockBot, Zooplus E-Food,
  Bags’n Boxes Online-Shop, Kleiner als Raute, Mobile.de Financing and ROLLT!.
- Personal-contribution detail remains missing on 15 projects; Methods on 11.
- Home Pi has no recorded delivery stage; app completion alone does not prove
  a deployment or ongoing use. Five personal/OSS cases now have no customer market
  by deliberate classification, in addition to the seven previously missing ones.
- Outcome basis: 18 unrecorded, 7 capability-only, 21 self-reported results,
  2 owner estimates, 1 owner-reported measurement. No measured impact was invented.
- Four source effort classes disagree with the existing upper-bound calculation:
  Bubble-UI XS vs S (upper 9), Mobile.de Financing L vs XL (250), ROLLT! M vs XS (3),
  Seabo XXL vs XL (360). Source and computed classes remain distinct; their intended
  meaning needs clarification before editing owner-entered class labels.

## Validation and artifacts

- Behavior tests covered accepted vocabulary, unknown-value/core-field review,
  hidden/withdrawn privacy, source-write stale guards, idempotence, actual Notion
  date response normalization, measurement exclusions and historical effort.
- Full application run: 323/325 passed against 127.0.0.1:6894. The two failures were
  enquiry origin checks: 403 because the server uses localhost as its origin.
  All 6 tests in that HTTP file passed with localhost:6894. All 325 checks therefore
  passed across the full run and origin-corrected rerun. The earlier default-port
  run failed only because its expected server at port 6888 was absent.
- 26 database integration tests passed. Types, scoped ESLint and production web
  build passed (173 static pages). EN/DE historical-effort wording was confirmed
  in the in-app browser on Mobile.de Financing; the German label fits its card.
- Bug/security/code-quality/UI review completed. The date-response comparison
  issue was fixed and verified before the first source write; no open findings.
- Logs: `/tmp/portfolio-cleanup-2026-11-18/`.
- Reproducible plan, checked source-write receipt, exact measurements, Methods
  review and apply/audit scripts: `ops/notion/cleanup/2026-11-18/`.
- Exported source/publication/audit JSON and full field coverage CSV are beside
  this report in the visualization artifact directory. Private evidence stays in
  source/operator artifacts; it is excluded from the publication.
- Scoped cleanup commit and exact final status are recorded in exported
  `receipt.json`, outside the commit so the recorded SHA is not self-referential.

## Update 2026-11-20: code vocabularies follow Notion

- Owner decision: **Direct Consumer** and **OSS** are accepted customer markets
  again (10 and 1 projects), reversing the OSS removal above. AI capabilities
  **Suggestion generation** and **Data analysis**, and the product formats
  **MCP Server**, **Concept** and **Clickdummy** were added to the code
  vocabularies, so none of them is dropped from the publication any more.
- Unused Notion options were deleted: the Tools Jobs To Be Done, Limbic Types,
  Personas and 7-Level-Model (they live in Methods); the product types SaaS,
  Configurator, Educational app, CRO Consulting, A/B-Testing and E-commerce (two
  hidden projects moved to Website first); usage context Open Source; ownership
  Not established; and the sector-like domains Logistics and maritime, Tourism
  and travel, Public sector, Nonprofit, Healthcare, Education, Automotive and
  Sustainability. The code keeps those domains as `RETIRED_DOMAINS`, so saved
  links and enquiry wording still resolve to their sectors, while selecting one
  in Notion is flagged again.
- The source review now also compares every option of a controlled Notion field
  with the code (`unknown-option`), stores the result after each sync, shows
  counts in `notion:status`, and `notion:review` prints details and exits
  non-zero while drift exists. The container health check deliberately ignores
  it. After this update the review reports no issues.
