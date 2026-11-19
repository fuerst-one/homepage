# Visitor intent model — design

Discussed with the owner on 19 November 2026. This is a design, not an
implementation: nothing described under "Model" exists yet unless stated.
Section 4 (confidence gate and latch) and section 5 (the benchmark, without
ground truth from real visitors) are implemented, and so are from sections 1
and 2 the needs on cards, visible-at-click attribution, the page-in-view
credit, considered clicks, the stay rule, signal strength and the view tracker
(Rules v3); see "Suggested order". It
extends the live visitor profile ([docs/visitor-profile.md](../visitor-profile.md),
Rules v2).

## Why

A personalised "For you" page is planned: selected projects, dedicated copy and
calls to action. Its concept comes later. Before that, the profile has to answer
two questions reliably:

1. **What is the visitor interested in?** Target agreed with the owner: the
   visitor's real buyer need is among the profile's **top two buyer needs** at
   least **75%** of the time when the profile is declared ready.
2. **How serious are they?** Agreed use: the stage drives which call to action
   and copy the visitor is offered.

Already built ahead of this design and merged into `codex/live-visitor-profile`
(`054f1ee`): a one-time hint on the profile entry and a "For you" header link.
Both link to `/profile#suggestions` until the page exists and depend on one
replaceable condition in `packages/content/src/forYouReadiness.ts`. That
condition is provisional (three projects viewed or one explicit choice).

## What simulation showed

Simulated journeys ran through the real scoring code against the live catalog
(49 projects, 168 terms, 17 buyer needs). A simulated visitor has one real buyer
need and picks a matching project 65% of the time ("focused") or 40% ("loose").
These behaviours are assumptions, not traffic data, and the scripts were
throwaway; the benchmark below replaces them.

- **A raw interaction count is a poor trigger.** Five to six counted
  interactions covered anything from one to six projects viewed, because the
  count includes zero-weight events.
- **Rules v2 guesses the single leading need right 44–65% of the time after
  three projects**, depending on how many cards the visitor saw per pick and on
  whether reading depth tracks interest.
- **Reweighting existing tags did not help.** Weighting by rarity, by lift over
  the catalog average or with steeper depth weights scored the same or worse.
- **The evidence is the limit.** A best-possible estimator on today's evidence
  reached 51–74% at three projects. With skipped cards and need-level sections
  added it reached 65–74%.
- **The top-two target is reachable today.** See "Confidence gate".

## Published evidence

Mostly from web search, news and shopping; some studies are small. Treat it as
direction, not calibration.

| Finding                                                                                                                                 | Source                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Time on page and how the visitor left were the best passive predictors of satisfaction; more than 58 s without return: 88% satisfied    | Fox et al. 2005, 146 participants ([PDF](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/08/TOIS-p147-fox.pdf)) |
| Under about 10 s and back to the list: 73% dissatisfied against a 23% base rate                                                         | Fox et al. 2005                                                                                                                  |
| Bounce cut-offs from 5 to 60 s behave alike                                                                                             | Sculley et al. 2009 ([PDF](https://faculty.cc.gatech.edu/~zha/CSE8801/ad/p1325-sculley.pdf))                                     |
| A fixed 30 s dwell rule scored 57% against human labels; conditioning on length and topic raised it to about 81%                        | Kim et al. 2014 ([PDF](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/KimWSDM2014.pdf))                     |
| An article portion counts as read after 5 s in the viewport; scroll depth overstates attention                                          | Lagun & Lalmas 2016 ([PDF](https://mounia-lalmas.blog/wp-content/uploads/2018/01/wsdm2016.pdf))                                  |
| No validated scroll-speed threshold for reading against skimming was found                                                              | Research pass, 19 November 2026                                                                                                  |
| Visitors judge a link by the cues visible before the click; clicks agreed better with snippet judgments (83%) than page judgments (78%) | Chi et al. 2001; Joachims et al. 2005 ([PDF](https://www.cs.cornell.edu/people/tj/publications/joachims_etal_05a.pdf))           |
| "Clicked this over the ones above it" matched human judgment 81%; humans agree with each other 82–90%                                   | Joachims et al. 2005                                                                                                             |
| Items a user never saw are no evidence; seen-but-skipped items are weak negatives                                                       | Hu, Koren & Volinsky 2008 ([PDF](http://yifanhu.net/PUB/cf.pdf)); Covington et al. 2016                                          |
| Rare deliberate actions (printing, bookmarking) were near-certain positives; mouse clicks were not informative                          | Fox et al. 2005; Claypool et al. 2001                                                                                            |
| Filters are soft: 43% of chosen price filters excluded what the shopper finally bought                                                  | Zhang et al. 2020, preprint ([arXiv](https://arxiv.org/abs/2002.08577))                                                          |
| Enquiry forms complete at 18% from view and 43% from first input                                                                        | Zuko benchmark, vendor data                                                                                                      |
| With too little data, equal weights beat expert-set weights: fix the direction of each signal, not its size                             | Dawes 1979                                                                                                                       |

Not found: any study of main-navigation clicks as topic signals, and any source
quantifying how much stronger queries and filters are than clicks.

## Principles

1. **Credit only what was visible.** A click is evidence for the cues shown at
   the click, not for what the target reveals afterwards. It earns that credit
   whether or not the visitor stays on the target.
2. **Separate three questions.** What the visitor is interested in, how much one
   observation counts, and how serious the visitor is.
3. **Deliberate actions outrank passive ones.** Search, filters, saving and form
   input are the strongest evidence.
4. **Directions, not tuned weights.** Use few weight levels and do not tune
   them without ground truth.
5. **Every inference stays inspectable and correctable** on the profile page.
6. **Each change is measured** by the benchmark before it is kept.
7. **No negative inference.** Behaviour never lowers a score. Only the
   visitor's own choices and the seven-day decay do.

## Model

### 1. Topic interest

- **Visible-at-click attribution.** Today opening a project credits all seven
  facets. A project card shows name, subtitle, industry, project type, dates, a
  description excerpt and KPIs. Of the seven profile facets only the industry
  is on the card: the card's project type is a separate field from the
  catalog's product types (web app, mobile app, …), and tools, capabilities,
  methods, buyer needs and stages are not shown. A card click credits only what
  the card shows. The same rule applies to every other link: credit what the
  link says in its context.
- **Needs and product type on the card** (owner decision, 19 November, from a
  sketch of three variants). The product type joins the existing meta line
  ("Web app · Client project · dates"). Up to two buyer needs appear under the
  description as quiet dotted links that filter the project list. A card click
  then credits the industry, the product type and the needs shown. A click on
  a need link is a filter choice, the strongest topic signal; the existing
  category-link handling (`profileLinkSignals`) already records those. This is
  a visible change to the cards.
- **Leading needs are designated per project** (owner decision, 19 November).
  The current order of a project's needs is not meaningful, and projects carry
  2.5 needs on average, so the two shown on a card must be chosen editorially.
  Cheapest route: order the "Buyer Needs" selection in the source so the first
  two lead, and treat that order as meaningful from then on. The taxonomy
  parsing keeps the source order; whether every sync step does is not yet
  verified. A dedicated "leading needs" field is the explicit alternative.
- **A page credits what was in view** (owner decision, 19 November). A stayed
  project page credits only what its header shows, the industry. Everything
  else is credited when the part of the page that displays it has come into
  view: the needs block for buyer needs, the details table for industries,
  product types, capabilities, methods and tools. Section reading keeps
  crediting a section's facets on top (outcomes → buyer needs, architecture →
  capabilities and tools, process → methods, delivery → stages). The preview
  dialog follows the same rules.
- **Buyer needs on the project page and in the preview dialog** (owner
  decisions, 19 November). Both show all of a project's buyer needs directly
  below the screenshots, as the same quiet filter links as on the cards.
  Before this, buyer needs were displayed nowhere on the project page, the
  case study or the preview dialog.
- **Need-level sections (on hold).** Tagging a case-study section with the one
  need it evidences helped in simulation only if visitors read selectively.
  Decide after real data.
- **Explicit choices** stay the strongest topic evidence: filters, topic chips
  and explorer terms. Saved projects keep feeding the suggestions, not the topic
  scores.
- **Typed search.** With the profile consent and the search consent both given,
  a query becomes a profile signal and is listed under recent signals. Queries
  that the server parses into an allowlisted public topic get full credit, like
  a filter. Free-form queries that match only by vector similarity get weak
  credit; similarity alone is unreliable (the cache calibration found "React"
  and "React Native" at 0.894, above a valid paraphrase at 0.823).
- **Search results.** Only the query is a signal. Results that are merely
  listed earn nothing. A result the visitor clicks is a strong signal under the
  visible-at-click rule: it credits what the result showed, in the context of
  the query it answered.
- **More dimensions from existing filters.** The filter console offers delivery
  model, use case, AI capability, AI use, contribution, engagement, workplace
  and languages. None are in the profile catalog, so those selections are
  dropped today. Contribution, engagement and delivery model describe the kind
  of engagement a visitor wants and should join the catalog.
- **FAQ questions.** Opening a question on a service page is a deliberate
  action on a visible cue, so it counts as a strong signal. The question's
  intent decides what it signals: the page's topic, and for questions about
  cost, process or collaboration also seriousness (below). The questions are
  plain `<details>` items from the service copy today, without identifiers, so
  each needs an intent tag in the data.
- **Sorting** does not exist on the project list. If added (by complexity, team
  size, duration), the chosen order is an explicit signal for engagement shape.
  This is a hypothesis without published support.

### 2. Observation quality

- **Source and target credit.** Every navigation has two parts. The click
  earns credit at once for what the link showed in its context, and keeps it
  even if the visitor leaves the target immediately. The target earns its own
  credit (details, case study, service page, preview, reading) only once the
  visitor has stayed about 10 seconds or has interacted with something on it
  (owner decision, 19 November). Scrolling alone is not an interaction.
- **Considered clicks** (owner decision, 19 November). Click credit is scaled
  by how long the clicked element was visible before the click, so scrolling a
  page and clicking everything earns close to nothing. Visible means at least
  half inside the viewport with the tab visible. The time is held in memory
  only and never stored. Three levels: none below half a second, half from
  half a second to 3 seconds, full from 3 seconds. The marks are the owner's:
  most click targets have short labels, so a visitor who knows where to go
  needs little more than the time to reach the target, and a 1-second floor
  would cut those clicks off. The research pass found nothing on pre-click
  visibility, so the marks stay open to change. Clicks on search results and
  on filter links, including the need links on cards, are exempt and always
  earn full credit: the deliberate act there is the query or the filter.
- **A hasty click only half-discounts the page it leads to** (owner decision,
  19 November). A visitor can land somewhere by accident and still find it
  interesting; the stay rule measures that. The target's credit is reduced by
  half of the click's discount: full after a fully credited click, three
  quarters after a half-credited one, half after an uncredited one. A target
  left before the stay threshold still earns nothing. An arrival without a
  click the profile saw (a pasted or shared URL, the back button, a link from
  another site) counts like a hasty click: the page earns half when the visitor
  stays.
- **Signal strength.** Signals carry no per-signal strength today. Considered
  clicks and the target discount need one, which touches the model, the
  saved-profile format, the sharing API and its table.
- **One view tracker** (owner's proposal, 19 November). Elements are tagged
  with data attributes and a single listener records, in memory only, which
  tagged parts were in view and for how long. It replaces the two separate
  viewport timers that exist today (section reading and "project read") and
  serves the considered clicks and the page rule above. A tag names a region;
  a pure function says which terms that region displays, so shared events stay
  checkable against the public catalog.
- **Reading.** Keep the active-time guard (visible, focused, recent input).
  Count seconds per section in view, relative to the section's length, and
  treat a portion as read after about 5 seconds. Do not measure scroll speed.
- **No negative evidence** (owner decision, 19 November). Skipped cards are not
  recorded or scored, and nothing a visitor does passively reduces a score.
- **Weight levels.** Three levels (weak, normal, strong) replace the finer
  point values over time.

### 3. Seriousness

Stages, not a number. Each has entry conditions and its own call to action.

| Stage               | Entered when                                                                                                                                                                                                                                                      | Call to action and copy                                        |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Exploring (default) | Nothing below applies                                                                                                                                                                                                                                             | Low commitment: more projects like these, the explorer         |
| Evaluating          | Any one of: a case study or service offer read, an FAQ question about cost, process or collaboration opened, a return visit on another day, an outbound link opened (GitHub, LinkedIn, a project's live site or repository), a project saved, a legal page viewed | How working together looks: the hire page, the starting offers |
| Ready to talk       | First input in the enquiry form, reaching the form and staying on it while already evaluating, or using a direct contact route (email link, availability link)                                                                                                    | Direct: continue the enquiry, ask about availability           |
| In contact          | Enquiry submitted                                                                                                                                                                                                                                                 | Stop pushing contact; show what happens next and related work  |

- Opening the form and leaving at once changes nothing.
- Staying on the form without typing moves the visitor to evaluating.
- Starting and abandoning the form keeps "ready to talk" and offers a lighter
  route (direct email, availability question).
- Completed form steps keep the stage; the call to action names where the
  visitor left off. Form content never enters the profile.
- The stage only rises within a visit and falls back one stage after seven days
  without activity.
- The profile page shows the stage with a manual choice ("just browsing",
  "looking for someone now"). That choice overrides the inference.
- The stage changes which next step is offered first. No urgency wording.

### 4. Confidence gate

Replaces the provisional body of the readiness function in
`packages/content/src/forYouReadiness.ts`; the signature stays.

- **Rule:** ready when the leading buyer need scores at least 6 and leads the
  third-ranked need by at least 1. Manual choices count, so one explicit filter
  or topic choice (+6) or a manual "interested" (6) passes at once.
- **Re-fitted to Rules v3** (owner decision, 19 November) from a five-seed
  sweep: the Rules v2 thresholds (4, 1) left the six-card focused visitor right
  73.5% of the time (firing for 94%); (6, 1) is right 82.7% and 92.4% for the
  six- and twelve-card focused visitors, firing for 81% and 90%. 6 rather than
  7 keeps one explicit choice sufficient.
- **Thresholds** are named constants next to the signal weights.
- **Latch:** once ready, a profile stays ready until reset, stop or expiry.

Rule and latch confirmed by the owner on 19 November. Implemented on
19 November; see "For you: readiness, hint and nav entry" in
[docs/visitor-profile.md](../visitor-profile.md).

Simulated on Rules v2 evidence; "right" means the real need is among the top
two when the gate fires:

| Visitor type                            | Gate fires for | Right when it fires | Projects viewed when it fires |
| --------------------------------------- | -------------- | ------------------- | ----------------------------- |
| Focused, six cards seen per pick        | 88%            | 80%                 | 4                             |
| Focused, twelve cards seen per pick     | 94%            | 89%                 | 4                             |
| Loose                                   | 88%            | 77%                 | 5                             |
| For comparison: "three projects viewed" | 100%           | 56–76%              | 3                             |

Gates on the ratio or share of scores did worse, because they fire on a single
project that carries one need.

**Known limit:** the gate also fires for about 39% of visitors who browse with
no real need (Rules v3, thresholds (6, 1); 73% under Rules v2 with (4, 1)),
because common needs accumulate by chance. Skipped-card
evidence would have reduced this but is ruled out as negative evidence. The
confirmation prompts are the remaining check.

### 5. Benchmark and ground truth

- A seeded simulation in `tests/`, running the real scoring code against a
  catalog snapshot with project names and links removed.
- Reports per visitor type: how often the gate is right when it fires, the
  share of visitors it fires for, the projects viewed at that point, and the
  rate for visitors with no real need.
- One test fails if "right when it fires" drops below 75% for focused visitors.
- **Ground truth from real visitors:** answers to confirmation prompts (below),
  explicit topic choices and the manual stage choice. Record whether the passive
  inference agreed just before the choice, and report that agreement in the
  owner insights. Human judges agree 82–90% in comparable studies, so 75% is
  near the realistic top.

### 6. Confirmation prompts

Added on the owner's suggestion. A small popover asks the visitor to confirm an
inferred interest. One answer is a strong explicit signal and a direct check of
the model.

- **When to ask.** The visitor has engaged with at least two distinct projects
  that share a term, the term has no manual choice yet, and it has not been
  asked before. This generalises the existing `shared_need` pattern from buyer
  needs to other dimensions. Buyer needs come first because the gate depends on
  them; industry, tools and engagement type follow.
- **Ask where the answer matters most.** Prefer a term that is just short of
  the gate or nearly tied with another need. Some prompts still go to terms the
  model is already sure of, so the check covers confident inferences too.
- **Where.** On a page related to the term (a project that carries it, or the
  project list), at a pause. Not during reading, not over a dialog, and not on
  the enquiry form or the profile page.
- **Wording.** Names the evidence, for example: "You looked at two projects
  about automating repetitive work. Is that what you are after?"
- **Answers.** Yes and no, without a separate cancel button. Escape or ignoring
  the prompt records no answer and counts the term as asked.
- **Effect.** Yes sets the term to "interested" (score 6), the existing manual
  choice. No sets the term's score to zero and stops further inference for it,
  but does not hide projects that carry it. The existing "not relevant" choice
  does hide them; filters are soft evidence, so a no should be gentler.
- **Limits** (owner decision, 19 November). Each term is asked once. At most
  one prompt every three minutes. An unanswered prompt hides after 30 seconds,
  and after two unanswered prompts no more are shown. The 30 seconds pause
  while the prompt has focus or the pointer is on it. A prompt never shares a
  pause with the "profile ready" hint; a yes that makes the profile ready lets
  that hint follow at the next pause.
- **As a check.** Each answer is stored with the term's inferred score and rank
  at the moment of asking. The yes rate is how often the inference was right.
  Two caveats: it only covers terms the model already believed, not interests
  it missed; and people tend to agree with a suggestion, so the yes rate
  overstates accuracy. That tendency is a known survey effect and was not part
  of the research pass.
- **Reuse.** The profile-ready hint (`ForYouHint.tsx`)
  already provides the placement above the profile entry, the polite live
  region, Escape handling and the guard against open dialogs. It has fixed text
  and one link, so it needs generalising to a question with two answers. Asked
  terms need store state that follows Remember, reset, stop and expiry, like
  `forYouHintSeen`.

## Signals considered and left out

| Signal                                      | Reason                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------- |
| Hovering, erratic scrolling, scroll speed   | Desktop-only or without a validated threshold; mouse activity was uninformative |
| Highlighting and copying text               | One small study found copying unrelated to interest                             |
| Clicking empty space                        | Says something about the page, not about interest                               |
| Page zoom, viewport changes                 | Device or eyesight, not interest                                                |
| Opening developer tools, taking screenshots | Not reliably detectable in a browser                                            |
| Accepting or declining opt-ins              | A refusal leaves no profile to record into                                      |
| Skipped cards (seen, not opened)            | Negative evidence, ruled out by the owner                                       |
| Tab away and back, idle open tab            | Used only to decide whether seconds count as reading, which already happens     |

Used for seriousness only, as hypotheses without published support: legal pages,
using the AI search, opening projects in new tabs.

## Consent and privacy changes

The owner's position: consents can be changed, so current wording is not a hard
limit.

- The profile text and docs currently say "no typed queries". That changes to
  cover queries under the combined consents.
- The search consent says the cache stores no visitor identifier. That stays
  true for the cache. Shared profile events carry the query text and what it
  matched (owner decision, 19 November), which links them to a hashed browser
  key. The sharing consent and the search consent wording both need to say so.
  Free text can contain names or contact details.
- Source and target credit, considered clicks, FAQ and outbound-link signals,
  the stage, the confirmation prompts and the
  additional filter dimensions need a line each in the EN/DE privacy descriptions and on the profile page.

## Changes to earlier decisions

The plan approved on 18 November
([2026-11-18-profile-signals.md](2026-11-18-profile-signals.md)) ruled out typed
text and inferred dislikes.

- **Typed text:** now allowed under consent (owner decision, 19 November).
- **Inferred dislikes:** still ruled out (owner decision, 19 November). An
  earlier draft of this design let bounces and skipped cards reduce scores;
  that was dropped.

## Open decisions

- The "For you" page concept.

## Suggested order

1. Benchmark and confidence gate. Plan:
   [2026-11-19-profile-confidence-gate.md](2026-11-19-profile-confidence-gate.md).
   Implemented 19 November 2026, not pushed or deployed.
2. Confirmation prompts, with their answers reported in the owner insights.
   They reuse the hint and give real ground truth early.
3. Needs and product type on the cards, then visible-at-click attribution
   with source and target credit, considered clicks and signal strength. Plan:
   [2026-11-19-profile-click-credit.md](2026-11-19-profile-click-credit.md).
   Implemented 19 November 2026 as Rules v3 with the gate re-fitted to (6, 1),
   not pushed or deployed.
4. Seriousness stages with the enquiry-form, FAQ and outbound-link signals.
5. Typed search and the additional catalog dimensions, with the consent texts.
