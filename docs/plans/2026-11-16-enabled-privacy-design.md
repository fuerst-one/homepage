# Privacy wording follows enabled features

Only describe and request permission for implemented processing enabled in the
current release. Do not add analytics, server chat-history collection, placeholder
purposes, a new consent banner, or new feature switches.

- Resolve the existing public and server AI flags together on the server. Both
  must explicitly be `true`. Share that result between homepage UI, EN/DE privacy
  pages and assistant endpoints. Pass only the resulting boolean to the client.
- Render the existing AI policy section only when AI is enabled. Keep hosting,
  enquiries, browser-local playground controls and the truthful no-analytics
  statement. Temporary provider outages do not change the legal notice.
- Preserve the existing explicit AI decision and separate optional tab-history
  choice. Clear stale chat/status on restoring refusal, invalid permission or a
  disabled feature, so disabled releases cannot restore old conversations.
- Existing privacy sections must continue explaining actual recipients, retention
  and withdrawal; future collection requires code, notices and new appropriate
  consent together.

Validation: first add failing behavioral tests for EN/DE rendered notices and
endpoint behavior under disabled, mixed and enabled flags. Then implement the
shared check and restore cleanup, run targeted tests, types/lint/format, and
browser checks against enabled and disabled local configurations. No deployment
or provider-account changes are part of this request.

## Implementation and checks

Implemented the shared release check in `src/server/siteFeatures.ts`; the
homepage passes its resulting boolean to the existing landing component. Both
assistant routes and both privacy pages use the same check. Disabled releases
remove former local AI permission/history/status; restoring a refusal also clears
old tab history after withdrawal elsewhere.

Both flags must be changed through a rebuild and redeploy. Legal pages are
prerendered and the homepage uses ISR, so this is a release configuration, not a
runtime remote flag service. Temporary outages retain their existing local
fallback behavior and do not rewrite the legal notice.

Verification:

- New tests failed before implementation for disabled/mixed legal disclosures,
  the mixed-flag API and both stale-storage scenarios.
- Full existing and new test suite: **255 passed, 0 failed**.
  `/tmp/homepage-enabled-privacy-suite.log`.
- TypeScript and scoped ESLint passed; touched files formatted with Prettier.
  `/tmp/homepage-enabled-privacy-types.log`,
  `/tmp/homepage-enabled-privacy-lint.log`.
- AI-enabled production build passed with 156 generated pages.
  `/tmp/homepage-enabled-privacy-build.log`.
- AI-disabled production build also passed with 156 generated pages; this is
  the final local build configuration. `/tmp/homepage-disabled-privacy-build.log`.
- Browser verified EN/DE disabled homepages and policies; enabled production
  preview showed the existing consent dialog and enabled German AI disclosure.
  AI status/answer endpoints were mocked in a local-only proxy; no question was
  sent to a provider. Screenshot: `/tmp/homepage-current-feature-consent.png`.
- Final disabled production preview contained zero AI controls and no AI policy
  section, even behind the proxy advertising synthetic AI availability. The
  actual status endpoint returned unavailable and POST returned 503.
  Screenshot: `/tmp/homepage-ai-disabled-preview.png`.
- An initial webpack development preview hit watcher limits and did not hydrate
  reliably in the in-app browser. The production preview hydrated and opened the
  dialog correctly; no application workaround was added for that tooling issue.

No analytics or server transcript collection, new consent category, provider
account change, production flag change, migration or deployment was performed.
The separately identified enquiry-outbox retention issue remains outside this
feature-gating change.
