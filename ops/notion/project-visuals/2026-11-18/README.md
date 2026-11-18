# Project content and visual backfill — 18 November 2026

Six portfolio records were updated through the signed-in in-app Notion browser.
Maybach was excluded at the owner's request. No website application code,
visibility settings, release, or deployment was changed by this work.

## Saved visuals

Each of the five new diagrams is 1600 × 1000 px and explicitly identifies itself
as a source-based conceptual diagram rather than a product screenshot. Its SVG
and Python generator remain editable. No image-generation model was used.

| Notion record                                                            | Asset                                                                                                 | Basis                                                                                                                                                              |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [AI Scraper](https://www.notion.so/41c86514f736801e8825cbf28db44596)     | `ai-scraper-conceptual-workflow.png`                                                                  | CLI source: page structure, schema reuse/regeneration, deterministic parsing and output                                                                            |
| [SERP API](https://www.notion.so/41c86514f73680a2b397fc1398edaf6e)       | `serp-api-conceptual-workflow.png`                                                                    | Source-specific organic/news/image/video parsers and a shared API                                                                                                  |
| [ts-shove](https://www.notion.so/41b86514f73681f3b839e338b6c1bf0a)       | `ts-shove-conceptual-refactor.png`                                                                    | Illustrative before/after file move and import rewriting; local/public version distinction retained                                                                |
| [Housing Hunter](https://www.notion.so/41c86514f73680bf8395e263d6532bd9) | `housing-hunter-conceptual-workflow.png`                                                              | Source-observed polling, extraction, deduplication and scoring; owner-confirmed 10/10 notification threshold                                                       |
| [Daily Briefing](https://www.notion.so/41c86514f736808a8e7bffbc4b0c44c0) | `daily-briefing-conceptual-pipeline.png`                                                              | Independent source fetching, validation, persistence and a daily view; distinct from Business Hub                                                                  |
| [Traidy](https://www.notion.so/41c86514f73680b18858ea72e7502d18)         | `traidy-historical-backtest-not-live-performance.png`, `traidy-historical-strategy-configuration.png` | Unmodified originals from the repository's `docs/dashboard-screenshot.png` and `docs/dashboard-strategies.png`; historical backtests, not live trading performance |

The PNGs are attached to the existing **Screenshots** property. Diagrams contain
no real apartment listings, calendar entries, personal messages or fabricated
performance figures. The original Traidy images were visually checked before
upload and contain an example backtest and strategy configuration.

## Content changes

Owner clarification is dated and distinguished from inspected source:

- **ts-shove:** probably the most-used among the recent additions, according to
  the owner. This remains qualitative; no invocation counts were inferred.
- **Housing Hunter:** runs continuously in the background and notifies only
  about apartments rated 10/10. This is a notification threshold, not measured
  matching accuracy or uptime. Added **Internal use** alongside **Prototype**.
- **AI Scraper and SERP API:** occasional helpers for quickly testing prototypes
  that require scraped data from different sources.
- **Traidy:** unfinished and essentially never used beyond development.
- **Daily Briefing:** visual/provenance update only; current use remains unknown.

English and German descriptions were updated together for Housing Hunter,
AI Scraper, SERP API and Traidy. Outcome, delivery and research evidence and
evidence-gap notes were reconciled where relevant. AI Scraper, SERP API and
Housing Hunter now use **Self-reported result** as their outcome basis.
Research dates were set to 18 November 2026 for these six updates.

Unconfirmed ownership, team size, maintenance, actual effort, code measurements
and measured business outcomes were not invented. Existing ts-shove research
and owner selections were retained, including its local/public version caveat.

## Verification and regeneration

All six pages were reloaded. Changed text matched the saved input, and all seven
image thumbnails loaded from their saved Notion attachments. The Housing Hunter
stage and the three changed outcome-basis selections were read back as well.
SVG XML and all five PNG dimensions were checked; the two copied Traidy images
were verified byte-for-byte against their originals. All seven assets were
visually inspected. No application behavior changed, so no application test
suite was run for this content-only task.

`manifest.json` records asset types, captions and SHA-256 checksums. Private UI
receipts and the saved Notion screenshot are under
`/private/tmp/homepage-project-backfill-2026-11-18/`. They are verification
artifacts, not portfolio assets. No production website publication was checked.

Regenerate SVGs with `python ops/notion/project-visuals/2026-11-18/generate.py`.
The PNGs were rendered using the repository's already installed Sharp 0.34.5.
Regeneration does not upload or replace any Notion attachment.

## Follow-up: 3D icons and local sync

The subsequent icon pass audited the 49 public projects against the 35 shapes
already supported by the renderer. Four blank assignments were filled:
Pigeon Turret → `robot`, Page Control → `code`, Business Hub → `tasks`, and
Glyphstone → `wave`. Housing Hunter changed from `globe` to `map`, and SERP API
from `code` to `globe`. The other 43 assignments were preserved. Hidden projects,
including Maybach, were excluded.

The [icon receipt](../../project-icons-review-2026-11-18.json) records the
before/after values and rationale. All 49 public projects now have supported icon
IDs. This pass uses existing geometry and required no renderer or deployment
changes.

The local database was initially stale and had no ts-shove screenshot asset.
The existing content worker was run against the verified localhost database.
The final `website-v3` publication at `2026-11-18T09:06:00.282Z` contains all six
icon changes, 49 valid assignments, and all seven new images. Every mirrored
image's SHA-256 checksum matches its uploaded original. The worker reported 122
assets and zero deferred assets. Three scoped icon behavior checks passed.

The in-app browser also loaded the ts-shove project page on the local site:
its `/api/image/41b86514-f736-81f3-b839-e338b6c1bf0a/Screenshots` image rendered
successfully at its original 1600 px width. Screenshot:
`/private/tmp/homepage-project-backfill-2026-11-18/ts-shove-local-project.jpg`.
The final database receipt is `local-final-verification.json` in that directory.
