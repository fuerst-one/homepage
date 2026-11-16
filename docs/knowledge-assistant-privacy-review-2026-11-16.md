# Assistant privacy review — 16 November 2026

Historical snapshot of the earlier implementation. Superseded by the
[current consent and provider review](privacy-launch-review-2026-11-16.md), which
documents the new opt-in, provider restrictions and remaining account checks.
The observations below describe the earlier release, not the current working
tree. **Public AI launch remains on hold.**

## Verified against code

- Ordinary search fetches the public project index. Exact commands, project names
  and selected facet labels navigate without an assistant call; unmatched text
  explicitly submitted by the visitor calls the assistant. If the project index
  is unavailable, the assistant remains available as a fallback.
- `chat.ts` sends the current question for an embedding, then the question,
  locale/system instructions and up to six public excerpts for answer generation.
  Both calls pass through OpenRouter. Earlier conversation messages are not sent.
- `openRouter.ts` uses the server-side key. The application does not put the
  visitor's raw IP in provider request bodies. Host access logs are separate.
- The application database contains public content/vectors and usage metadata,
  not question/answer bodies. `usage.ts` stores keyed IP hashes, times, cost and
  status; rows older than 35 days are pruned on the next admitted request.
  A keyed IP hash remains pseudonymous data, not anonymous data.
- The last five completed exchanges, citations and actions are in same-tab
  `sessionStorage`, expiring two hours after the latest completed answer.
  Reading/reopening does not renew expiry. Clear chat deletes them; Close chat
  hides them. Expiry clears on the landing page or next restoration. A browser's
  session recovery may restore tab storage. Blocked storage falls back to the
  current component's memory. There is no cross-device account or chat database.
- The English/German privacy pages now disclose these flows, deletion controls,
  recipients, transfer/retention uncertainty and the proposed legitimate-interest
  basis. Inline copy names OpenRouter, the two-hour history and links to the notice.
  These local copy changes are not a legal compliance certification.

- Silent failover keeps a separate tab-scoped availability/retry latch until
  verified recovery or tab closure. It contains no question text or user ID.
  Fallback suggestions are computed locally from the public search index.
  Recovery checks send fixed synthetic text to embeddings/chat, never prior
  visitor questions. Paid probes share the existing usage accounting limits.

## Before public enablement

1. Verify the actual OpenRouter workspace/key settings: private input/output
   logging off, prompt sharing off, training disallowed, and the desired retention
   policy enforced for **both embeddings and answer generation**. Current request
   bodies do not enforce `data_collection: deny` or `zdr: true`. A model name alone
   does not identify the actual provider endpoint or its retention policy.
2. If requesting ZDR, verify **ZDR only** account/guardrail settings as well as
   per-request routing. OpenRouter documents that `zdr: true` can still admit
   Safety Retention endpoints depending on account settings, and legal safety
   exceptions remain. Do not describe this as an unconditional no-logging promise.
3. Confirm the applicable OpenRouter DPA, controller/processor roles, subprocessors,
   actual model endpoints, international-transfer mechanism and any transfer
   assessment. Its public policy describes safeguards; that does not prove an
   agreement is in place for this account. Recheck this when swapping models.
4. Once the production database host is chosen, document its operator, region,
   access controls, DPA, backup retention and deletion process. Coolify is the
   management layer, not a complete statement of hosting recipients.
5. Confirm the Art. 6(1)(f) interest-balancing assessment for optional public AI
   and the requested resumable chat. Assess §25 TDDDG for tab storage: this
   implementation is functional session storage, not tracking, but the exception
   depends on necessity for the service the visitor expressly requests. Otherwise
   obtain the appropriate consent or use navigation-only in-memory state.
6. Check production host/observability logs and disable request/response-body
   capture. Verify actual log/backup retention, then make final notice wording
   specific to the chosen production configuration. Account settings and contract
   status were not available from the local repository.

## Primary sources checked

- [OpenRouter privacy policy](https://openrouter.ai/privacy): recipients,
  provider-dependent processing, international transfers and retention.
- [OpenRouter data collection](https://openrouter.ai/docs/guides/privacy/data-collection):
  opt-in logging/sharing and safety/legal exceptions.
- [OpenRouter provider logging](https://openrouter.ai/docs/guides/privacy/provider-logging)
  and [ZDR documentation](https://openrouter.ai/docs/guides/features/zdr):
  endpoint policies and Safety Retention settings.
- [OpenRouter routing controls](https://openrouter.ai/docs/guides/routing/provider-selection):
  `data_collection` and `zdr` do not establish the contractual arrangements.
- [GDPR](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng): lawful basis,
  transparency, processors, retention and international transfers.
- [§25 TDDDG](https://www.gesetze-im-internet.de/ttdsg/__25.html): terminal
  storage/access and the expressly requested service exception.
