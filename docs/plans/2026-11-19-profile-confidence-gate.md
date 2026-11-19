# Profile confidence gate and benchmark — plan

Written and implemented 19 November 2026, not pushed or deployed. This is step 1 of the
[visitor intent model design](2026-11-19-visitor-intent-model-design.md) and
only that step: no new signals, no confirmation prompts, no "For you" page.

Base: `codex/live-visitor-profile` at `c811227`, which already contains the
profile-ready hint and header link (`054f1ee`) with a provisional readiness
condition.

## Goal

1. `isForYouReady` fires on confidence in the visitor's leading buyer needs
   instead of on a count.
2. A benchmark in the test suite scores that decision, so later signal changes
   are held to the same bar.
3. Once ready, a profile stays ready until reset, stop or expiry.

Done means: the benchmark asserts that, for focused visitors, the real buyer
need is among the profile's top two at least 75% of the time when the gate
fires; the readiness unit tests describe the gate; the latch is covered by
store tests; the existing hint tests pass against the new condition; docs are
updated.

## Behaviour

### Gate

In `packages/content/src/forYouReadiness.ts`, same signature, new body:

```ts
export const FOR_YOU_MIN_LEADING_SCORE = 4;
export const FOR_YOU_MIN_LEAD_OVER_THIRD = 1;

export function isForYouReady(profile, catalog, now) {
  if (now < profile.startedAt || now >= profile.startedAt + PROFILE_LIFETIME_MS)
    return false;
  const needs = profileInterests(profile, catalog, now).filter(
    (interest) => interest.facet === "buyerNeeds",
  );
  const leading = needs[0]?.score ?? 0;
  const third = needs[2]?.score ?? 0;
  return (
    leading >= FOR_YOU_MIN_LEADING_SCORE &&
    leading - third >= FOR_YOU_MIN_LEAD_OVER_THIRD
  );
}
```

`profileInterests` already sorts by score, ignores signals after `now`, drops
terms that left the catalog and applies manual choices, so the gate inherits
all of that.

Changes against the provisional condition, all intended:

- Three viewed projects are no longer enough on their own.
- An explicit choice only makes a profile ready if it is a buyer need. A filter
  on a tool or an industry does not.
- A manual "interested" (6) or "priority" (12) on a buyer need still passes at
  once; so does one buyer-need filter or topic choice (+6).

### Latch

The pure function can turn false again when scores decay or a new view narrows
the lead. The store keeps the decision:

- New boolean `forYouUnlocked` in `profileStore.ts`, in
  `INITIAL_LOCAL_METADATA` next to `forYouHintSeen`.
- The store evaluates `isForYouReady` after every profile change and after a
  restore, and sets `forYouUnlocked` the first time it is true. It never sets
  it back.
- It follows the Remember setting, is cleared by reset, stop and expiry, and
  merges across tabs like `forYouHintSeen` (true wins for the same profile).
- `useForYouReady` reads `enabled && forYouUnlocked` instead of calling the
  function in its selector. The hint and the header link keep using the hook.

## Benchmark

`tests/profile-benchmark.test.mjs`, loading the real model through
`tests/helpers/load-ts.mjs` and the catalog from
`tests/fixtures/profile-catalog.json`.

### Fixture

A snapshot of `/api/profile/catalog` from the local preview with everything
project-specific removed: project ids become `p01`…, names `Project 01`…, hrefs
`/en/projects/p01`…; `sharingAvailable` is dropped; terms stay as they are
(public taxonomy values). At the time of writing: 49 projects, 168 terms, 17
buyer needs. Generate it with a one-off command and commit only the result; no
new script file. The test asserts the fixture still has at least six buyer
needs carried by six or more projects.

### Simulated visitor

Deterministic: one seeded generator, fixed start time, clock advances 30
seconds per signal.

- **Real need.** One buyer need carried by at least six projects (ten such
  needs at the time of writing). Each need gets the same number of journeys.
- **Pick.** Up to eight picks per journey. For each pick, `cards` unvisited
  projects are drawn as "seen". With probability `focus` the visitor opens a
  seen project that carries the real need, if there is one; otherwise any seen
  project.
- **Depth.** The visitor reads deeply with probability 0.6 if the project
  carries the real need, otherwise 0.2.
- **Signals.** `project_opened`; on a deep read also `project_details_viewed`
  and `project_read`.
- **Fire.** After each pick, evaluate `isForYouReady`. The first true result is
  the moment the gate fires. It is right if the real need is among the top two
  buyer needs from `profileInterests` at that moment.

| Visitor type | `focus` | `cards` | Real need                                               |
| ------------ | ------- | ------- | ------------------------------------------------------- |
| Focused, 6   | 0.65    | 6       | yes                                                     |
| Focused, 12  | 0.65    | 12      | yes                                                     |
| Loose        | 0.4     | 12      | yes                                                     |
| Aimless      | —       | 12      | none; opens any seen project, deep read 0.3 of the time |

Sixty journeys per need and type, unless the test then takes more than about
ten seconds; reduce the count rather than the picks.

### Reported and asserted

Per type, as test diagnostics: share of visitors the gate fires for, share
right when it fires, median projects viewed when it fires. For aimless
visitors only the share it fires for.

Asserted for both focused types: right when it fires ≥ 0.75, and fires for
≥ 0.6 of visitors. The second assertion stops a gate that almost never fires
from passing on a handful of easy cases. Loose and aimless are reported only.

Throwaway runs during design gave: right 80% / 89% / 77% (focused 6, focused
12, loose), fires for 88% / 94% / 88%, at 4 / 4 / 5 projects, and fires for
about 73% of aimless visitors. The rebuilt benchmark will differ somewhat. If
a focused type lands below 0.75, stop and report; do not tune the thresholds
or the simulation to pass.

## Steps

Test first throughout.

1. **Fixture.** Generate and add `tests/fixtures/profile-catalog.json`.
2. **Benchmark, red.** Write `tests/profile-benchmark.test.mjs`. Against the
   provisional condition the focused assertions are expected to fail (three
   viewed projects were right 56–76% in the throwaway runs). Record the numbers.
3. **Readiness tests, red.** Rewrite `tests/for-you-readiness.test.mjs` for the
   gate: fresh profile; one buyer-need filter passes; a tool filter does not;
   manual interested and priority on a buyer need pass, exclude and automatic do
   not; three projects with spread needs do not pass; leading need at 4 or more
   with the third within 1 does not pass; two needs tied at the top with the
   third far behind pass; later signals, expiry and terms missing from the
   catalog as today; a ready profile evaluated three weeks later is not ready
   (the latch is the store's job).
4. **Gate, green.** Replace the body of `isForYouReady`. Readiness tests and
   benchmark pass.
5. **Latch, red then green.** Extend `tests/for-you-hint.test.mjs` in its
   existing style: unlocks when the gate first passes; stays unlocked after
   decay; cleared by reset, stop and expiry; persisted only with Remember;
   merged across tabs; a restored profile that already passes is unlocked.
   Then add `forYouUnlocked` to the store and switch `useForYouReady`.
6. **Existing hint tests.** `tests/for-you-hint.test.mjs` and
   `tests/for-you-hint.browser.mjs` trigger readiness by opening three
   projects. Trigger it with a buyer-need filter choice instead, and drop the
   "two projects: not yet" step.
7. **Docs.** Update the "For you: readiness, hint and nav entry" section of
   `docs/visitor-profile.md` (rule, constants, latch, benchmark command) and the
   status lines of the design document.
8. **Verify.** Readiness, hint and benchmark tests; the full suite; types, lint
   and format; the hint browser suite against the local preview in both locales.

## Notes for whoever implements this

- Work in a fresh worktree cut from `codex/live-visitor-profile`. Another
  session has uncommitted edits in `/private/tmp/homepage-profile-signals`,
  including `docs/visitor-profile.md`, so expect to merge that file by hand.
- The benchmark world matches Rules v2, where opening a project credits all
  its needs. When visible-at-click attribution lands (design step 3), the
  simulated visitor has to change with it.
- The fixture is a snapshot. Refresh it when the public catalog changes
  materially; the reported numbers will move.
- Known limit, not addressed here: the gate fires for most aimless visitors.
- Nothing here is pushed or deployed.
