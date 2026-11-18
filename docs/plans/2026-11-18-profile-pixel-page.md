# Pixel profile integration

Approved direction: the opted-in floating surface becomes only the 128-level pixel signature, linking to a dedicated profile page. Use a 12×12 grid with four interest-region hues, 17 black/white orientation pixels, corner-aligned spare capacity and no minimum coloured areas. Use the newly merged main layout (02cb0f2), existing Layout, PageEyebrow, Button and localized links.

1. Bring the verified region codec into the content package. Encode every catalog term in deterministic order at 128 levels. Include version, term count, catalog fingerprint and checksum. Default to 12×12; grow only if a future catalog exceeds its capacity. Hue area follows needs/capabilities/methods; 12-bit shades preserve all fields. Keep the full precision profile and manual overrides authoritative.
2. Keep capture/restore/sharing maintenance mounted globally, without the former panel. Load the catalog on the profile page or for a remembered/active profile; deduplicate loading and expose retry state.
3. Show a 60px signature link after opt-in, with an accessible name. Before opt-in show a compact page link. Route privacy settings to the new page.
4. Create localized /profile using the shared content-page layout. Show consent onboarding (including automatic local persistence), current signature and readable interests, evidence, manual choices, suggestions, recent signals, signal weights/decay/repeat caps, storage/sharing/erasure controls. Keep the page noindex and browser-local.
5. Verify codec and store behavior, EN/DE HTTP rendering, opt-in/navigation/manual update/stop/remember flows in the browser, mobile and keyboard behavior. Run typecheck, scoped lint, full test suite and production build. Review the final diff and fix actionable findings.

No deployment or push requested. Keep main and unrelated changes untouched.

## Region signature update

- Accepted 128 levels, restored the 17 B/W corner markers, and removed minimum coloured corner cells. Colour families may disappear entirely. Zero-signal needs/capabilities/methods start with equal regions.
- Current 168 fields leave 276 bits (23 cells) unused, with room for 39 additional fields before the grid grows. Unused payload cells sit near corners; original full-precision scores remain authoritative.
- The shared grid renders at 60px in the launcher and 192px on the page. EN/DE explanations use codec constants and live catalog capacity.
- Behaviour tests cover all levels, clamping, marker validation, checksum/padding corruption, catalog identity/order, future-catalog boundaries, shade-only decoding and single-family regions without minimum areas.
- Browser acceptance checked live region changes, restore after reload, launcher navigation, footer clearance with no added document space, EN/DE mobile width and desktop rendering. Source review findings resolved.

## Completed validation

- Merged main's layout commit 02cb0f2 as df63312 before adding the page.
- Full suite: 691 passing tests; 29 focused pixel/signal tests also pass after the ES2022 compatibility adjustment. Production build, typecheck, scoped ESLint and diff checks pass.
- Browser: EN/DE page, explicit start, manual-interest add and priority change, project-open evidence, pixel-link navigation, automatic local persistence across reloads, remembering off and stop/clear verified.
- Desktop and 390px mobile layouts checked without horizontal overflow. Removed the 80px after-footer spacer; launcher docks 12px above the visible footer. Page sections use one spacing rule, and summary actions have a distinct gap when inline or wrapped.
- Raw review: bugs, security, quality and UI findings resolved, including stale-tab profile adoption, quota fallback cleanup, search/stop focus and background recommendation exposure.
- Preview remains on port 6895 in the isolated feature worktree. No push or deployment.
- Parallel signal work was preserved; resolved duplicate localized labels, client-directive ordering after new imports, and ES2022 newest-match compatibility while validating the integration.
