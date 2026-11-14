# Notion enquiry mentions and Malt mirror

Owner requested Slack DMs if runtime keys already exist; otherwise Notion mentions.
No Slack runtime keys exist. Use a structured mention of the independently verified
Alexander Fürst Notion person, configured server-side, in each new enquiry.
A saved mention is distinct from proof of a delivered push/email notification.

Malt's current live public browser view shows EUR 750/day. Search-cached content
shows an older value and is excluded. Public profile JSON-LD agrees with the
visible daily rate. Its schema.org InStock offer is not a freelancer-availability
confirmation. No public availability badge or confirmation time was observed.
Direct server requests receive a Cloudflare 403 challenge; ordinary browser
navigation eventually opens the page. Do not circumvent the challenge or reuse
browser cookies in the application.

Implementation:

1. Behavior-first tests for structured mentions, identity checks, Malt parsing,
   freshness/unknown/unpublished states and refresh failures.
2. Persist a timestamped mirror in a new, separate rich-text property on the
   existing owner contact in Notion. Preserve legacy Daily Rate and Available.
3. Add protected daily refresh outside visitor requests. Keep last good data on
   transport/parse failures, without renewing its observation timestamp. Public
   fetching may remain blocked; support importing a freshly browser-verified
   observation through a local operator command.
4. Seed the live verified daily rate; keep availability unknown. Display rate,
   source and observation date on home/hire. Replace the old Notion availability
   badge with the Malt status or Ask about availability. Public API availability
   must be null when unknown, never a contradictory Notion fallback.
5. Verify local UI, full checks, the source round-trip and a clearly identified
   mention smoke test; retain the synthetic enquiry for the owner's notification check. Commit
   functionally. Deployment and copy alignment remain separate.

Status: implemented and locally verified; not deployed.

## Configuration and operation

- Existing server-only Notion token, owner contact and enquiry inbox IDs are reused.
  `NOTION_ENQUIRY_MENTION_USER_ID` must be a real, accessible Notion person ID,
  not `NEXT_NOTION_OWNER_CONTACT_ID` (a contact page). The local person was
  retrieved independently and matched to Alexander Fürst.
- New rich-text properties on the existing owner contact database:
  `Homepage Malt Mirror` and `Homepage Malt Refresh`. Both were created and
  verified. Legacy Daily Rate and Available properties remain untouched.
- `CRON_SECRET` protects both GET refresh and POST browser-observation import.
  Configure it and the mention user ID in the deployment environment before
  releasing. Never expose either value through client configuration.
- `vercel.json` schedules refresh daily at 05:23 UTC. This only becomes active
  after deployment on Vercel; a different host needs its own authenticated cron.
- While direct public fetching fails, capture the actual public profile's
  ProfilePage JSON-LD and visible `data-testid="profile-price"` tag into a JSON
  file with `sourceUrl`, ISO `observedAt` and `html`. Do not export browser
  cookies. With the local server on port 6888, import within one hour using:

  ```sh
  node --env-file=.env.local scripts/import-malt-observation.mjs /tmp/malt-observation.json
  ```

  The authenticated endpoint validates identity, visible price agreement and
  per-day units. It rejects sequential older observations. Same-instance writes
  are serialized; Notion offers no cross-instance compare-and-swap, so do not
  deliberately run overlapping successful operator imports.

- Failed refreshes update only the separate refresh property. They cannot
  overwrite a verified observation or extend its age. Rate hides after seven
  days. Public availability stays null without dated evidence, rather than
  reading schema.org InStock or falling back to the old Notion flag.
- Mentions append using Next.js `after` once a new enquiry is saved. Optional
  delivery cannot delay the durable receipt. Delivery failures are logged without
  personal data; there is no durable notification retry queue. Existing receipt
  retries do not create another mention.

## Verification

- 169 tests pass, including stalled optional mention, failed refresh preserving
  a newer observation, stale data, identity/unit checks and unauthenticated route
  rejection. Logs: `/tmp/homepage-malt-full-tests.log` and
  `/tmp/homepage-mention-background-green.log`.
- Production webpack build and scoped ESLint pass. Logs:
  `/tmp/homepage-malt-build-final.log`, `/tmp/homepage-malt-final-lint.log`.
- Fresh public browser observation at `2026-11-14T23:50:02.830Z` imported and
  independently read back from Notion: EUR 750/day, availability unknown.
  Local public API agrees. Real background fetch returned 502 / error; the
  observation timestamp and rate were preserved. An older import returned 409.
  Direct HTTP probing also encountered Malt's 403 browser challenge. Fully
  automatic refresh is therefore not established.
- Home and hire pages verified in English/German; 320px viewport has no
  horizontal overflow and the rate card wraps correctly.
- New synthetic enquiry submitted through the full six-step browser flow:
  `6af7a7a6-532e-44a2-a3ab-29537ceef9aa`. Confirmation rendered successfully.
  Independently read the stored brief and real `@Alexander Fürst` user mention.
  The record remains active, as requested:
  https://www.notion.so/41886514f73681359705dc4592e24b7c
  Screenshot: `/tmp/homepage-notification-test-saved.jpg`.
  Actual notification receipt still requires owner confirmation.
