# For you page — design

Discussed with the owner on 20 November 2026. Step 1 of the suggested order
(section library, plan format and renderer) is implemented on
`feature/live-visitor-profile` and not pushed; everything else described here
does not exist yet. It fills the open decision
"The For you page concept" in
[2026-11-19-visitor-intent-model-design.md](2026-11-19-visitor-intent-model-design.md)
and builds on the live visitor profile
([docs/visitor-profile.md](../visitor-profile.md), Rules v3, readiness gate and
latch).

## Decisions

All owner decisions, 20 November 2026.

- **A personal landing page.** The page reads like one of the service landing
  pages, written around the visitor's leading buyer need. The inference stays in
  the background.
- **Designed by a model on demand.** Copy cannot be written ahead for every
  combination of needs and viewed projects, so a model stronger than the
  assistant's writes and arranges the page from what the visitor did.
- **Composed from the site's own sections.** The model returns a page plan; the
  site renders it with its own components. No free markup or styles.
- **Built on request.** The first visit shows a locally built preview and a
  "Design my page" button. Pressing it is the consent. The owner first chose an
  automatic build on first open and then preferred the button for trust.
- **Streamed.** The page appears one section at a time while it is built.
- **Stored and replayed.** A built page is replayed without a new model
  request.
- **The profile code is the request.** No free text is sent.
- **Tested against the landing pages.** Prompts and model are tuned in a
  harness until the generated page serves a visitor better than the general
  landing pages.

## Flow

- The header link "For you" and the ready hint lead to the new page instead of
  `/profile#suggestions`. The page is not indexed.
- **No profile, or a profile that is not ready:** the page says so and points to
  the projects or to starting a profile. Nothing is built.
- **Ready profile, first visit:** a preview built in the browser from the
  profile alone: the leading needs and a few matching projects the visitor has
  not opened, with the default call to action. Below it the button "Design my
  page" and one line that names what is sent: the profile code and the projects
  opened.
- **Button pressed:** the page is built and streamed, then stored.
- **Later visits:** the stored page is shown at once.
- Every visitor sees the button once, including visitors who use the AI
  assistant: a profile is a different kind of data than a question.
- The profile opt-in keeps its promise that the profile stays in the browser.
  It needs no new consent version; the button carries its own.

## Request

The build request carries no free text:

| Field        | Content                                                                            |
| ------------ | ---------------------------------------------------------------------------------- |
| Profile code | The text code the profile page lets the visitor copy (`encodeProfileText`)         |
| Projects     | Ids of projects the visitor engaged with, each with a level from a fixed list      |
| Stage        | One of the seriousness stages; "exploring" for everyone until the stages are built |
| Language     | `en` or `de`                                                                       |
| Ticket       | See "Controls"                                                                     |

- The code holds a format version, the interaction count, a fingerprint of the
  catalog, one 7-bit score per term and a checksum. The server decodes it with
  the shared code in `packages/content` and works out the leading needs itself.
- Engagement levels: opened, stayed, regions read, saved, "more like this".
- A wrong version, catalog or checksum, an unknown project id or an unknown
  level is rejected before any paid step.
- The code carries the scores of all terms, not only the leading ones. That is
  accepted because it is exactly what the visitor can see and copy.
- No timestamps and no typed text are sent.

The code is not a credential. It is computed in the browser by public code, so
anyone can produce a valid one; a signature added in the browser would use a key
every visitor receives. Its value is that it bounds the input and removes any
path for instructions to reach the model.

## Page plan

The model returns an ordered list of four to seven sections. Each has a type
from the library and its content.

| Section     | What the model fills in                                           |
| ----------- | ----------------------------------------------------------------- |
| Hero        | Headline and lead on the leading need, first call to action       |
| Bridge      | What the viewed projects have in common, named concretely         |
| Proof grid  | Two to four projects not yet opened, one sentence each on the fit |
| Spotlight   | One project in depth: problem, what was built, result, image      |
| Second need | The runner-up need with one or two projects                       |
| Approach    | Three steps fitted to the need                                    |
| Offer       | One existing offer, if one fits                                   |
| Questions   | Two or three entries picked from the existing FAQs                |
| Closing     | Call to action for the stage                                      |

- The second-need section exists because the gate promises the real need among
  the top two, not in first place.
- The proof grid shows only projects with a published screenshot (owner, 20
  November 2026); a card without one fails the section check.
- The model never writes a URL. It picks project ids, image references and
  calls to action from lists it was handed: an enquiry with service, offer and
  intent, the two starting offers, the hire page, email, the Explorer, a need's
  project filter.
- **Fixed footer,** written by the site: "why this page" with a link to the
  profile, a rebuild button, and "was this useful?" with yes and no.
- The library is the first thing built and is reviewed with hand-written plans
  before a model is involved; the list above may change then.

## Streaming

- The model emits one section at a time.
- The server checks each finished section and forwards it: shape, known ids,
  allowed calls to action, length.
- The browser renders each section with a short entrance; a placeholder marks
  the next one. The entrance is skipped under `prefers-reduced-motion`.
- A section that fails its check is dropped and the rest of the page still
  arrives.

## Evidence

- **Candidates.** The site picks about twelve projects with the existing
  ranking (`recommendProfileProjects`), not the model: unopened ones for the
  proof and the viewed ones for the bridge. Each comes with its published facts:
  summary, needs, tools, role, outcome, whether it has a case study, and its
  images with their descriptions.
- **Lists to pick from:** calls to action, the offers, the FAQ entries.
- **Rules for the model:** claims only from the supplied facts, no figures that
  are not in them, no urgency wording, the visitor's language.
- **Checks after generation:** ids exist, the proof holds enough unopened
  projects, every number in the copy appears in the source facts, lengths are
  within limits.

## Storage and rebuilds

- **Browser.** The finished page is stored next to the profile, with the
  profile's lifetime, and is removed by "stop & delete". This copy replays.
- **Server.** A copy with the request it was built from, the model and prompt
  version, the cost and the "was this useful?" answer, keyed by a random page
  id. Tuning and the owner insights need it. The button line names it, and it is
  deleted together with the profile.
- The same code, projects, stage and language return the stored page instead of
  a new build.
- A page is built in one language. Switching language offers a rebuild.
- Rebuilds are never automatic. If the top two needs or the stage have changed
  since the build, the footer offers one.
- Three builds per profile per day, adjustable.

## Controls

- **Own settings** next to the assistant's ([docs/ai-operations.md](../ai-operations.md)):
  on/off, model, daily and monthly budget, limits per visitor and overall,
  concurrency. The budget is separate, so the page and the assistant cannot
  starve each other. The assistant today shares $1 per day and $10 per month on
  a small model.
- **Model.** Chosen in the harness, not here. It has to be approved in the
  provider settings (no training, no retention) and named in the privacy text.
- **Ticket.** The page fetches a short-lived ticket signed by the server when it
  loads. A build request must carry one, and each ticket builds once. The key
  stays on the server. This forces every build through the page and makes the
  limits per visitor enforceable; it does not stop a determined script.
- **Plausibility.** The server refuses codes that could not have come from
  browsing, such as a high score with almost no interactions. The check is
  looser than the readiness gate, because a profile stays unlocked after its
  scores have decayed.
- **Bot blocking and rate limits** as for the assistant.
- **Budget as backstop.** Whatever passes the other controls, the cost ends at
  the day's budget.

## Fallback

The local preview is the page whenever building is paused, over budget, refused
or fails midway. For you never ends in an error.

## Test harness

- **Personas.** The profile benchmark simulates visitors with a known real
  need. It produces about 40 requests across the buyer needs, both languages and
  a few stages, plus the hard cases: needs carried by a single project, visitors
  with no real need, and profiles whose top two needs point in different
  directions.
- **One page per persona** for each model and prompt version, kept as fixtures.
- **Scoring in three layers:**
  1. Hard checks that must pass every time: valid plan, known ids, unopened
     projects in the proof, every number found in the source facts, right
     language, lengths, an allowed call to action that fits the stage.
  2. A rubric judged by a second model: the page addresses the persona's real
     need, is specific, the bridge uses what was viewed, every claim traces to a
     supplied fact, the next step is clear, the tone is free of hype.
  3. A pairwise comparison: the judge sees the generated page and the
     best-matching existing landing page for the persona and picks the one that
     serves this visitor better.
- **Proposed target:** the generated page wins at least 70% of the comparisons
  and never loses on traceability.
- **Owner review.** Each round the owner rates about ten pages next to the
  judge's notes. If owner and judge disagree on more than about a fifth, the
  rubric is fixed before its numbers count.
- **Promotion.** A prompt or model change goes live only if it beats the current
  version. Two or three candidate models are compared on quality, cost per page
  and time to the first section.

## Live measurement

The owner insights get: pages built, the "useful" rate, call-to-action clicks on
For you compared with the service landing pages, rebuilds, fallbacks and cost
per page. With the site's visitor numbers these stay indicative for a long time;
the harness is the main instrument.

## Signals from the page

- Suggestions shown or opened add no interest points, as today, so the page
  cannot confirm itself.
- A "no" on "was this useful?" offers the list of needs. The choice is an
  explicit signal and serves as the confirmation prompt of the intent model.

## Consent and privacy changes

- A consent text on the button, EN and DE, and a consent version for it.
- The privacy page names the page builder, its model and provider, what is
  sent, and the server copy with its retention.
- The profile opt-in text is unchanged.

## Open decisions

- The route name in both languages.
- The model.
- How long the server keeps page copies.
- The plausibility thresholds.
- Whether 70% is the right target once the first harness round has run.

## Suggested order

1. Section library, plan format and renderer, fed with hand-written plans.
   **Implemented, not pushed:** the plan format and its checks in
   `packages/content/src/forYouPlan.ts`, the sections in
   `apps/web/src/components/ForYou/`, the example plans in
   `packages/content/src/data/for-you-plans/` and the review route `/en/for-you` and
   `/de/for-you` (`?example=<name>`, not indexed, not linked). The examples
   together use all nine section types; a plan holds at most seven.
2. The route with the local preview and the button; header link and hint point
   to it.
3. The harness, the prompt rounds and the model choice.
4. The streaming endpoint with ticket, controls, budget, storage and the
   button's consent text.
5. The owner insights.
