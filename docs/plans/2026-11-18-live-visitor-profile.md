# Live visitor profile

Approved direction: transparent interest profiling, editable by the visitor, for
personalised suggestions and owner insights. The overlay stays open while people
browse and explains changes as they happen. This is an initial working version;
signal weights are hypotheses, not calibrated probabilities.

## Implementation

1. Add a pure, versioned signal model using public project dimensions. Normalise
   contributions within each dimension, cap repetition, decay inferred interests,
   and keep manual preferences separate and authoritative. Test behaviour first.
2. Reuse Zustand, the existing project metadata and Radix dialog primitives for a
   nonmodal live panel. Show interests, reasons, manual corrections, recent signals
   and explained project recommendations. Capture project opens, visible active
   reading, explicit filters, service visits and successful enquiry submissions.
3. Keep capture off until the visitor starts it. Offer independent remembering
   and sharing choices. Remembered profiles expire after 30 days. Sharing sends
   only allowlisted public terms, event types, correction scores and random event
   identifiers; never search text, form contents, URLs or identity information.
4. Add a bounded, same-origin first-party event endpoint and PostgreSQL storage.
   Provide an owner-only local report command for interest, correction and funnel
   counts. Store shared events for 30 days, with deletion using a random secret
   known only to that browser. Analytics are self-reported, consent-selected data.
5. Update both privacy pages and existing privacy controls. Verify scoring,
   restoration, API validation, database deduplication/deletion/retention, type
   checks and browser interaction at desktop and mobile widths. Review the scoped
   changes without modifying the concurrent GitHub/HomeWork work.

## Scoring contract v1

- Project open: 2 points per dimension; active reading: 1; explicit filter: 6;
  service visit: 3. Divide each dimension's contribution across its recorded terms.
- Each event kind/subject is counted at most once per 30-minute window. Reading
  requires a visible, focused page and a recent interaction; ordinary impressions
  and pointer movement are not interest signals.
- Inferred contributions have a seven-day half-life, with a 12-point ceiling per
  interest. Manual preferences are exclude / interested / priority; they override
  inferred scores until removed. Every correction preserves the prior inference
  and signal evidence for feedback analysis, when sharing is enabled.
- Recommendations average matches across active dimensions and respect excluded
  interests. They never silently reorder explicit searches or filters. Exposure
  to a personalised suggestion is recorded separately from opening it so the
  owner can inspect the recommendation feedback loop.

## Delivery

Local implementation and validation; deployment is outside this request. The
analytics migration must be applied before enabling collection in production.
No automatically generated memory updates or unrelated commits.

## Validation results

- Full suite: 456 passing tests; dedicated local database integration: 3 passing.
- After final polish: 15 targeted privacy and HTTP checks passing.
- Workspace type checks, scoped ESLint, formatting and production build pass.
- Browser acceptance covered opt-in, filter and project signals, active reading,
  manual corrections, explained recommendations, remembered reloads, separate
  sharing and erasure, mobile scrolling and keyboard focus. Withdrawing sharing
  removed the test browser's shared events from the local owner report.
- Targeted follow-up reviews confirmed resolution of delayed-upload consent
  withdrawal, independent erasure recovery and stale-tab manual preference cases.
