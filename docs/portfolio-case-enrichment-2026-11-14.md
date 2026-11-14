# Portfolio case dimensions

This backfill extends the existing Notion Projects database rather than creating
a second portfolio. Its purpose is to support buyer-oriented case selection with
clear limits on what each case demonstrates.

The versioned [manifest](../ops/notion/project-case-dimensions.json) contains the
curated values, source snapshots, controlled vocabulary and field-level owner
confirmations. The original descriptions, KPI text, technical tags and relations
remain in place. All 41 public projects are covered; the three hidden records
are excluded from row updates.

## Dimensions

| Property              | Purpose                                                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Buyer Needs           | Problems a visitor can recognize, such as improving a complex interface or integrating systems.                                           |
| Delivery Stages       | Distinguish discovery, prototype, MVP, production, improvement, internal use and ongoing maintenance.                                     |
| Project Domains       | Project-specific context, independent of client-level industry rollups.                                                                   |
| AI Usage              | Distinguish delivered AI features, AI-powered developer tools, AI-assisted implementation and computer vision. Blank means unestablished. |
| AI Capabilities       | Specific implemented features such as design generation, survey analysis, translation or browser automation.                              |
| Personal Contribution | What Alexander actually did, including team boundaries.                                                                                   |
| Ownership Model       | Solo delivery, product engineering ownership or team contribution when established.                                                       |
| Contribution Basis    | Existing portfolio account versus direct owner confirmation.                                                                              |
| Maintenance Mode      | Active work, occasional maintenance or an ended engagement.                                                                               |
| Case Context          | Concise factual description of the product or workflow.                                                                                   |
| Delivery Evidence     | Basis and limits for the delivery/use-stage classification.                                                                               |
| Outcome Evidence      | Existing result text with its measurement context and limitations.                                                                        |
| Outcome Basis         | Separate capabilities, self-reported results, owner estimates, owner-reported measurements and source-verified measurements.              |
| Evidence Gaps         | Specific unanswered questions and missing substantiation.                                                                                 |
| Case Review           | Whole-case review state; partial owner confirmation does not confirm every claim.                                                         |

## Owner confirmations

- Konfig: product engineering across frontend/backend, UX/UI, client communication
  and organization, with a business partner focused on industry details and
  marketing. Production use in one shop. A main ongoing project. Its listed
  outcome figures were measured according to the owner; underlying reports have
  not been reviewed. Implemented AI features include design-generation chat,
  support, API-based product-data creation/maintenance, analytics evaluation and
  translation.
- Seabo: UX/UI, frontend and some backend within a team of five to ten developers.
  Several enterprise customers. Alexander's engagement ended in July 2026.
- Conversion Y: product, frontend/backend and design. Still in the MVP phase and
  a main ongoing project. The time-saving figure is an estimate.
  AI translation, automated survey evaluation and survey creation are built.
- build-manager: solo delivery, used in the owner's daily internal workflow,
  with occasional maintenance.
- Test Flow: solo delivery, used internally occasionally, with occasional
  maintenance. Its improvement figure is an estimate, and the exact measure
  being halved remains unclear.
- Business Hub: used daily by the owner, with occasional maintenance. Daily use
  alone does not establish sole original authorship or measured time savings.

One legacy source correction was explicitly supported by the owner's answer:
Seabo's End Date changed from 2024-05-01 to 2026-07-01. The latter represents the
confirmed **month**, not a confirmed day; the site's timeline displays months.
The manifest retains the correction and precision. Product status is separate
from the end of Alexander's engagement and was not changed.

## Safe application

Reuse the site's existing Notion integration:

```sh
node --env-file=.env.local scripts/seed-notion-case-dimensions.mjs
node --env-file=.env.local scripts/seed-notion-case-dimensions.mjs --apply
```

The first command previews the work. The second creates missing independent
properties and fills blank values only. It checks the target database, public
record scope, source freshness, types and controlled options before writing.
It preserves existing editorial values and keeps confirmation metadata coupled
to the corresponding claims. A conflicting claim withholds the associated
evidence metadata rather than confirming different text. Source records are
checked again immediately before each write.

Private temporary snapshots and incremental receipts are written outside the
repository with restricted permissions. If interrupted, inspect the receipt
and rerun the preview; do not overwrite preserved edits or blindly repeat an
ambiguous write. An editor's later changes are not refreshed from this seed.
Confirmations that arrive after application need deliberate, reviewed updates
to the affected fields and manifest.

## Website integration boundary

The source backfill is now connected to the enquiry flow and landing suggestion
box in the [shared matching integration](enquiry-project-matching-2026-11-15.md).
It uses an allowlisted public view model, buyer needs, capabilities, ownership and
delivery stage, and explains each match. Internal use, MVP, production, ended
engagements and partial matches remain distinct. Editorial evidence notes and
outcome claims are not copied into the public matching projection.

## Validation

The dedicated behavioral tests cover preservation, idempotency, source drift,
hidden records, invalid fields/options, schema conflicts and confirmation
provenance. Independent bug, security and code-quality review completed; the
provenance-coupling finding, missing date/status freshness checks and an
unsupported clothing-project matching tag were corrected before application.

Applied and read back on 2026-11-14:

- Fifteen dimensions added to the existing database.
- All 41 public projects enriched; all three hidden projects unchanged.
- All 422 non-empty seeded values matched the saved records.
- Five personal-contribution accounts, six delivery/use stages, six maintenance
  classifications, three outcome bases and two AI-feature lists carry direct
  owner confirmations.
- Original properties matched the pre-backfill snapshot, except the explicit
  Seabo end-month correction and its dependent Duration formula.
- A repeat preview proposed zero property additions, zero row updates and no
  conflicting evidence groups.

Local operational evidence:

- Snapshot and incremental receipt:
  `/var/folders/m_/9rqysmm16pv2sxdmyb3m3zx80000gn/T/homepage-case-backfill-9SLZ06/`
- Original Seabo date snapshot and correction receipt:
  `/tmp/homepage-seabo-date-before.json` and
  `/tmp/homepage-seabo-date-receipt.json`.
- Read-back verification: `/tmp/homepage-case-verification.json`.
- Behavioral test output: `/tmp/homepage-case-tests.log`; full-suite output:
  `/tmp/homepage-case-full-tests.log`.
- Scoped formatting check: `/tmp/homepage-case-format-check.log`.

Temporary snapshots are recovery aids and are not durable backups. The public
source manifest and this record remain versioned in the repository; no client
contacts or hidden-project source data were copied into it.
