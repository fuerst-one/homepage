# Rich visitor-profile signals

Approved 18 November 2026: implement all ten proposed signal families and the cross-action patterns in the existing live-visitor-profile worktree. Preserve existing pixel-page work. No deployment or push requested.

## Model and interpretation

- Keep opt-in, remembering, separate sharing, expiry, erasure and manual term overrides.
- Distinguish preview, details and case-study depth; take the strongest depth contribution per project within 30 minutes instead of adding the whole navigation chain.
- Read public, classified sections (outcomes, architecture, process, delivery) for 15 visible/focused/active seconds. Attribute only the section's matching facets. Unknown headings do not acquire a guessed category.
- Gallery exploration, GitHub/live proof, return visits, explicit explorer lenses/clusters, related-project links and fixed topic chips add allowlisted evidence. No typed text, pointer/scroll trails or inferred dislikes.
- Durable saved projects and positive similar-project feedback are independent. Manual term exclusions still win. The later UI refinement removes negative feedback.
- Derive and explain cross-project shared needs, proof preferences, sustained project consideration and ordered case-study/collaboration/enquiry journeys. Reinforce shared buyer needs with a single capped boost from distinct recently read projects; no industry or identity inference.
- The signature continues to encode term interests. Project feedback and journey evidence have their own readable sections.

## Implementation and acceptance

1. Behavior tests first for scoring caps, facet attribution, repetition/decay, durable project feedback, patterns and strict sharing validation.
2. Extend the pure model, state restoration/multi-tab reconciliation and database allowlist/migration/report tooling.
3. Reuse galleries, project/detail/case-study surfaces, service sections, explorer choices, related links and search components. Add compact localized project controls and fixed topic chips.
4. Show explanations, shortlist, proof/journey patterns and feedback in the profile page. Update EN/DE privacy descriptions and rules.
5. Run focused and full tests, types, scoped lint/format, database integration, build and browser acceptance at desktop/mobile with consent off/on, active section reading, feedback/reload/reset and keyboard navigation.

## UI refinement

Owner requested card-level Save removal, no Less like this, heart-only Save with an
explanatory tooltip, and More like this linking to the project detail related-work
section. Keep both controls in the overlay footer, right-aligned on desktop and
below the existing links on mobile. The profile collects saved projects and permits
removal. Implemented without implicit opt-in; retired negative history restores
without discarding saved projects.

## Validation and recovery

- Full suite: 698 passing, zero failures or skips against the feature preview.
- Isolated PostgreSQL integration: 4 passing, including the expanded schema,
  rerunnable migration, idempotent delivery, revocation and owner reports.
- Browser acceptance passed: consent off/on, actual section reading, gallery
  selection/enlargement, modal heart saving, More like this closing the overlay and
  scrolling to actual related projects, fixed topics, services, Explorer choices,
  related navigation, saved restoration, removal, reset and stopping. EN/DE and
  375px layouts were checked; the mobile tooltip stays inside the viewport.
- Production build and its TypeScript check passed; scoped lint and formatting pass.
  Independent bug, security and UI review findings were fixed and rechecked.
- The desktop app archived the original worktree during final validation. Snapshot
  `c1a3453` preserved all 46 changed files. Each recovered file was hash-verified
  against that snapshot before work resumed on the same `codex/live-visitor-profile`
  branch at `/private/tmp/homepage-profile-signals`.
- Preview remains on port 6895. No deployment or push requested or performed.
