# Cards, view tracker and click credit — plan

Written 19 November 2026. Not implemented. This is step 3 of the
[visitor intent model design](2026-11-19-visitor-intent-model-design.md). It
introduces Rules v3.

Base: `codex/live-visitor-profile`, which contains the confidence gate, its
latch and the benchmark.

## Goal

1. Cards and the project page show the buyer needs the profile may credit.
2. One tracker knows which tagged parts of a page were in view and for how
   long.
3. A click earns credit for what the card showed, scaled by its time in view.
4. A page earns credit only for what the visitor stayed on and actually had in
   view, discounted by half of the click's discount.
5. Scrolling a list and clicking everything earns close to nothing, and the
   benchmark proves it.

Three phases, one commit each, in this order. Phase 1 is the visible change.
Phase 2 changes no behaviour. Phase 3 changes the rules.

## Facts this plan rests on

Checked in the code on 19 November:

- `ProjectCard` already receives `project.matching?.buyerNeeds` and
  `project.productTypes`. So does `ProjectDetails`, through the same project.
- The sync keeps the source order of buyer needs at every step.
- `/projects?buyerNeeds=…` already filters the list, and a click on such a link
  is already recorded as `filter_selected` (`profileLinkSignals`).
  `projectFacetHref` builds these links but only accepts capabilities,
  industries and methods.
- Buyer needs are displayed nowhere on the project page, the case study or the
  preview dialog today. The page's details table shows industries, product
  formats, capabilities, methods and tools. The preview dialog shows
  screenshots, scale facts and the profile actions, and none of the profile's
  seven dimensions.
- `ProjectDetails` order: header with industry and title, screenshots, proof
  links, KPIs, description, text sections, details table.
- Two separate timers watch the viewport today: `useRichProfileSignals` scans
  `[data-profile-section]` and `[data-profile-service-section]` once a second,
  and `VisitorProfile.tsx` checks `[data-profile-project]` for the
  "project read" signal. Both require a visible, focused, recently active tab
  and treat content under a dialog as covered.
- Page signals (`project_opened`, `project_details_viewed`,
  `case_study_viewed`, the service kinds) are recorded the moment the page or
  dialog is reached, and credit every term the project carries.
- Signals have no per-signal strength. Shared events are validated in
  `parseProfileEventBatch` and stored in `visitor_profile_events`, whose
  `kind` and `rule_version` checks list allowed values.

## Phase 1: showing needs

### Cards (variant C from the design)

- **Meta line.** Product types join the existing line: "Web app · Client
  project · dates". Use the existing label helpers for German.
- **Need links.** Up to two buyer needs under the description, as quiet dotted
  links to the project list filtered by that need: the first two of
  `project.matching?.buyerNeeds`. A shared constant in the content package
  fixes the number, because phase 3 credits the same two.
- The links need `pointer-events-auto` and must not trigger the card's own
  link. Nothing new is recorded: the existing listener records the filter
  choice.

### Project page and preview dialog (owner decisions, 19 November)

- **All** of the project's buyer needs, directly below the screenshots, as the
  same quiet filter links. On the project page and in the preview dialog.
- Not in the details table and not on the case study.

### Shared

- Widen `projectFacetHref` to accept `buyerNeeds` and use it in both places.
- Projects without needs or product types render as today.
- Check print layouts; hide the links there if they add noise.

Editorial prerequisite, owner's task: order each project's "Buyer Needs" in
the source so the two leading ones come first. Until then the cards show the
first two in the current order.

## Phase 2: one view tracker

A refactor. No signal may change.

- **Tags.** Elements are tagged with data attributes, so server-rendered pages
  need no client code. New regions use `data-profile-region` with a region
  key: `card:<project id>`, `project:<project id>|needs`,
  `project:<project id>|details`. The needs block uses the same key on the
  page and in the preview dialog. The existing `data-profile-section`,
  `data-profile-service-section` and `data-profile-project` tags keep their
  names and meaning.
- **One listener**, mounted with the profile runtime that every page already
  has. For each tagged element it holds, in memory only:
  - how long it has been continuously in view (for click scaling);
  - how many seconds it has been in view in total, and how many of those were
    active (visible, focused, recently interacted), as the existing timers
    count them.
- **In view** keeps today's meaning for sections (the visible height rule and
  the check that nothing covers the element). For regions it means at least
  half the element, or half the viewport if the element is taller.
- **Consumers.** Section reading, service-section reading and "project read"
  move onto the tracker and fire exactly as before. Nothing reads the new
  region data yet.
- **Tags name where, the model says what.** A pure function in the content
  package validates a region key and returns the terms that region displays:
  a card shows the project's industries, product types and first two buyer
  needs; the needs block shows all buyer needs; the details table shows
  industries, product types, capabilities, methods and tools. Shared events
  stay checkable against the public catalog.
- **Proof of no change:** the existing reading unit tests and the profile
  browser suites pass untouched.

Phase 1 adds the `data-profile-region` tags to the card, both needs blocks and
the details table, so this phase only has to read them.

## Phase 3: credit rules (Rules v3)

### Strength

An optional `strength` on a signal: 0.5, 0.75 or 1; absent means 1. A signal's
points are its weight times its strength. Where only the strongest depth per
project counts within 30 minutes, compare weight times strength.

### The click

New signal `project_card_clicked`, subject the project id, weight 2.

- **Recorded for** a click on the card's own link, its thumbnail or its case
  study pill. Website and GitHub pills stay `proof_opened`; need links stay
  filter choices.
- **Credits** what the card region displays, nothing else.
- **Scaled by time in view** before the click, from the tracker: under 500 ms
  no signal at all, 500 ms to 3 s strength 0.5, from 3 s strength 1.
- **Exempt.** When the list shows results of a typed search, card clicks earn
  full strength whatever the time in view. So do landing-page search results.

### The page

- **Stay rule.** `project_opened`, `project_details_viewed`,
  `case_study_viewed`, `service_viewed`, `service_offer_viewed` and
  `service_collaboration_viewed` are recorded once the visitor has either
  spent 10 seconds on that page or dialog with the tab visible, or interacted
  with something on it (owner decision, 19 November). Leaving earlier without
  interacting records nothing. `project_returned` waits for the same moment.
- **What counts as interacting:** activating a link, button, gallery image,
  expandable item or form field inside the page's or dialog's own content.
  Scrolling does not count, and neither do the site header and footer, the
  profile's own controls, closing the dialog or going back: those are how a
  visitor leaves.
- **A stayed project page credits only its header:** the industry. It no
  longer credits every term the project carries.
- **Everything else is credited when it comes into view.** New signal
  `project_region_viewed`, subject `<project id>|<region>`, recorded once a
  region of the project page has been in view for 3 seconds in total. It
  credits what that region displays, with the page's weight. The needs block
  credits all buyer needs; the details table credits industries, product
  types, capabilities, methods and tools.
- **The preview dialog follows the same rules.** A stayed preview credits
  only what its header displays, which is none of the seven dimensions today.
  Its needs block credits all buyer needs once it has been in view for 3
  seconds in total. The preview still counts towards returns and the project
  affinity that suggestions use.
- **Case study and service pages** keep what they credit today, after the
  stay.
- **Strength from the click that led there**, applied to the page signal and
  to its `project_region_viewed` signals alike:

  | How the visitor arrived                                        | Strength |
  | -------------------------------------------------------------- | -------- |
  | Card click at full strength, or an exempt click                | 1        |
  | Card click at half strength                                    | 0.75     |
  | Card click that earned nothing (under 500 ms in view)          | 0.5      |
  | Another in-site link the profile handles (related work, nav…)  | 1        |
  | No click the profile saw (pasted URL, back button, other site) | 0.5      |

- **Carrying the click.** The last click and its level are held in memory and
  matched to the next page signal for the same target. A reload or a new tab
  loses it and counts as "no click seen".
- Section reading and `project_read` keep their rules and weights. Reading the
  details table for 15 active seconds still adds its own credit on top of
  having seen it.
- Measuring time in view for links other than cards is not part of this step.

### Persistence and sharing

- `PROFILE_RULE_VERSION` becomes 3. The stored-profile version stays 1:
  `strength` is optional, and saved profiles without it restore unchanged.
- Restore and `parseProfileEventBatch` accept `strength` only with the values
  above and only on the kinds that can carry it, and accept the two new kinds
  with valid subjects.
- A new migration adds a nullable `strength` column, allows
  `project_card_clicked`, `project_region_viewed` and rule version 3, and the
  insert writes the field. The owner applies it; local personalisation must
  keep working without it.

### Profile page, privacy text, docs

- EN/DE labels for the two new signals in the recent-signals list and the
  evidence.
- EN/DE privacy descriptions: card clicks, time in view held in memory only,
  the stay rule, and that a page credits what was in view.
- `docs/visitor-profile.md`: the tracker and a Rules v3 section; the design's
  status lines.

### Benchmark

The simulated visitor changes with the rules:

- Cards show two needs, so a visitor looking for a need only recognises it on
  cards that show it.
- Each pick is a card click with a time-in-view level, then a bounce or a
  stay, then whether the needs block and the details table came into view,
  then possibly a deep read.
- New visitor type "rapid clicker": hasty clicks, never stays.

Assertions: the two focused types keep "right when it fires" ≥ 0.75 and "fires
for" ≥ 0.6; the rapid clicker fires for under 0.05. Everything else is
reported. State every behavioural assumption as a named constant.

The gate thresholds were set on Rules v2, and these rules remove a lot of
credit. If a focused type falls below a bar under Rules v3, stop and report
the numbers; do not tune thresholds, weights or the simulation to pass.

## Steps

Test first throughout.

1. **Phase 1.** Tests for the card's meta line and need links and for the
   needs block on the project page and in the preview dialog, in the existing
   style for rendered pages;
   then the change, including the `data-profile-region` tags. Check both
   locales, mobile width and the filter round trip in a browser. Commit.
2. **Phase 2.** Unit tests for the region function. Build the tracker, move
   the three existing consumers onto it, remove the old timers. The existing
   reading tests and profile browser suites pass untouched. Commit.
3. **Model.** Unit tests, then: strength in scoring, the two new signals and
   their terms, the level and strength functions, the narrowed page credit,
   restore and batch validation.
4. **Runtime.** The click listener, the stay timer, the carried click and
   region signals from the tracker. Store and browser tests: a hasty click, a
   considered click, a bounce, an early interaction that ends the bounce
   window, a pasted URL, the preview dialog, scrolling to the needs block and
   to the details table.
5. **Sharing.** Migration, insert, database integration test.
6. **Benchmark.** Update the simulated visitor and assertions; record the
   numbers before and after.
7. **Profile page, privacy text, docs.**
8. **Verify.** Full suite, types, lint, format, the profile browser suites in
   both locales. Commit.

## Notes for whoever implements this

- Agreed names: `project_card_clicked`, `project_region_viewed`, `strength`,
  `data-profile-region`, this plan's file name. Any other new file, module or
  migration name: propose it to the owner first.
- The existing hint browser test makes a profile ready with a topic chip; that
  keeps working. Tests that rely on a page signal at arrival need the stay.
- The 500 ms and 3 s marks are the owner's; the 10 seconds come from the
  bounce evidence in the design. None is validated on this site.
- Nothing here is pushed or deployed.
