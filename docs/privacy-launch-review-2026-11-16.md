# Privacy and release review — 16 November 2026

**Release status: hold.** Alex requested the legal review before the next
deployment. The preceding production release remains live with both AI flags
false. This document and the consent changes are local preparation, not evidence
of public launch clearance. No agreement, billing upgrade, account privacy
setting or new production deployment was accepted or changed in this review.

## Implemented locally

| Activity                      | Data and recipients                                                                                                                   | Control / proposed basis                                                                                                                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Website delivery and security | IP, URL and technical request data at Vercel; necessary server processing                                                             | Art. 6(1)(f) GDPR; disclose hosting, logs and transfers. No blanket consent wall for serving the site.                                                                                                                   |
| Ordinary search               | Public project index on the same website                                                                                              | Exact project/facet navigation never invokes AI. No analytics, ad pixel or replay SDK found.                                                                                                                             |
| Decorative logos              | Published project images through the site                                                                                             | Clearbit fallback removed, eliminating its automatic browser disclosure.                                                                                                                                                 |
| AI questions                  | Current question and language through OpenRouter to OpenAI; public RAG excerpts; no earlier chat or raw visitor IP in provider bodies | Explicit affirmative consent, Art. 6(1)(a). API rejects missing, refused, expired or old-version receipts before question processing. No automatic routing to other providers.                                           |
| AI preference                 | Version, decision time, allow/refuse and separate history choice in localStorage                                                      | Up to 180 days, never renewed by visits; both answers remembered. Change/withdraw under the landing input. Minimal privacy preference storage: §25(2)(2) TDDDG assessment.                                               |
| Chat history                  | Last five exchanges in tab sessionStorage only if its initially unchecked option is selected                                          | Separate optional storage consent, §25(1) TDDDG. Expires two hours after the latest answer. Otherwise page memory only.                                                                                                  |
| Availability                  | Same-site status; backend probes contain fixed synthetic text, no visitor question/history/IP                                         | No AI opt-in while disabled or unverified/unavailable. Fallback chat shows projects. Technical outage state is stored only with an active AI permission.                                                                 |
| Abuse and consent evidence    | Keyed IP hash, time, status, cost and declared consent receipt in PostgreSQL                                                          | Security: Art. 6(1)(f); consent evidence: Art. 6(1)(c) with Art. 7(1). No database chat bodies.                                                                                                                          |
| Playground preferences        | Source, size, contrast and permission flag in localStorage only after “remember” is selected                                          | Optional §25(1) TDDDG choice. Unchecking deletes them. Camera/files stay in the browser; camera uses browser permission.                                                                                                 |
| Enquiries                     | Submitted contact brief; current live route to Notion; concurrent next-release work queues it in German PostgreSQL first              | Contract/pre-contract requests: Art. 6(1)(b); other correspondence: Art. 6(1)(f). Review before sending and privacy link; no forced marketing consent. Preserve separate queued-enquiry legal text when that code ships. |

Withdrawal aborts the browser request and, when cancellation reaches the server,
the combined backend signal prevents subsequent provider dispatches. Already
transmitted data cannot be recalled. Withdrawal remembers a refusal, clears local
chat/status, and leaves search/contact working. Expiry and cross-tab preference
changes also invalidate permission. A model/recipient-policy change must bump
`KNOWLEDGE_CONSENT_VERSION`, update notices and trigger renewed permission.

Provider routing always requests `data_collection: deny`, `zdr: true`,
`only: ["openai"]`, `allow_fallbacks: false` for embeddings and chat. These are
request restrictions, not a promise of no records or EU-only processing. OpenRouter
documents safety/legal exceptions and says per-request ZDR follows account-level
Safety Retention settings. Confirm **ZDR only** and actual selected endpoint
policies before sending visitor content. Test failures retain the local fallback.

## Provider/account review — action needed

| Provider            | Evidence reviewed                                                                                                                                                                                                          | Still requires verification                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel              | Team API reports `hobby`. Public terms incorporate its DPA. Hobby terms limit use to personal/non-commercial use; this site solicits freelance work. Terms also describe model-training settings for Hobby/trial accounts. | Resolve plan eligibility with Vercel or choose the authorized Coolify migration later; no automatic upgrade. Verify the actual team training opt-out, applicable agreement/version, subprocessors/transfer safeguards and hosting log retention. Public terms are not a saved account agreement.                                                                                                               |
| Hetzner             | Existing production runbook records Nuremberg, verified TLS, restricted app/indexer roles, daily backups with max seven copies/seven days. Hetzner documents an account DPA process.                                       | Open [account DPA](https://accounts.hetzner.com/account/dpa), verify customer/controller details and accepted agreement, save evidence. Current review could not authenticate the read-only SSH logging check; Docker/app log rotation and retention remain unverified.                                                                                                                                        |
| Notion              | [Official GDPR guidance](https://www.notion.com/help/gdpr-at-notion) incorporates a DPA and describes SCCs/subprocessors.                                                                                                  | Verify applicable workspace terms/version, access rights to the enquiry database, notifications, actual data location, deletion/retention and Notion AI access. Do not assume EU-only storage or that deleting a local queue deletes its Notion copy.                                                                                                                                                          |
| OpenRouter / OpenAI | OpenRouter terms §10.2 incorporate a DPA for commercial use; actual DPA and provider-routing/retention documentation reviewed. Application is pinned to OpenAI.                                                            | Save applicable account/organization agreement, subprocessors and transfer mechanism; assess transfers. Disable input/output/private logging, prompt sharing, training and any broadcast/export integrations. Select ZDR only for both provider groups and verify embedding and chat endpoints under the homepage key. Confirm actual processor identity and retention/safety exceptions against final notice. |
| Email / phone       | Contact paths use ordinary mailto/telephone links; application sends no enquiry email automatically.                                                                                                                       | Confirm the operator's actual email provider/agreements and retention before declaring the whole contact operation reviewed.                                                                                                                                                                                                                                                                                   |

No login, MFA, contract acceptance or purchase was performed. Account acceptance
and contractual facts must come from the account owner; a visitor checkbox does
not replace Art. 28 agreements or Chapter V transfer safeguards.

## Retention and operations before release

- Run the updated `001-initial.sql` as **database administrator** before deploying
  the new web/indexer code. It idempotently adds `knowledge_usage.consent`. The
  restricted app/indexer roles cannot run ALTER. This column was added to the
  local test DB only; production was not migrated by this review.
- Usage/consent records have a **35-day cleanup threshold** in request admission.
  This is not automatic hard expiry while the service is inactive. Confirm a
  periodic cleanup/deletion process and its evidence as part of launch retention
  approval. Backup copies can survive until their seven-day rotation.
- Confirm hosting and Docker log retention and that observability never captures
  assistant/enquiry bodies. Independent health probes contain synthetic text.
- Define an erasure runbook covering usage hashes/receipts, Notion enquiries,
  transient queues and backup restoration. Restored backups must not resurrect
  previously erased records; do not claim this operational procedure is already
  exercised merely because a backup was successfully restored.
- Confirm controller address/contact and any applicable mandatory business
  identifiers. Existing EN legal notice / DE Impressum use §5 DDG and contain
  no obsolete EU online-dispute-platform link. Personal/business facts were not
  independently re-certified.
- Compare EN/DE notices with the **exact release**, especially concurrent Notion
  queue changes. Keep both AI flags false until account, retention, transfer and
  notice review is complete. Do not deploy this work automatically.

## Primary references

- [GDPR, including Arts. 5–7, 13, 28 and 44–49](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng)
- [§25 TDDDG](https://www.gesetze-im-internet.de/ttdsg/__25.html)
- [DSK guidance on digital services](https://www.bfdi.bund.de/SharedDocs/Downloads/DE/DSK/Orientierungshilfen/OH_Digitale-Dienste.pdf?__blob=publicationFile&v=1)
- [Vercel terms](https://vercel.com/legal/terms) and [DPA](https://vercel.com/legal/dpa)
- [Hetzner data protection / account DPA guidance](https://docs.hetzner.com/general/company-and-policy/data-protection-at-hetzner/)
- [Notion GDPR / DPA guidance](https://www.notion.com/help/gdpr-at-notion)
- [OpenRouter terms](https://openrouter.ai/terms), [DPA](https://openrouter.ai/data-processing-agreement), [privacy](https://openrouter.ai/privacy)
- [OpenRouter routing](https://openrouter.ai/docs/guides/routing/provider-selection), [embedding request routing field](https://openrouter.ai/docs/api/api-reference/embeddings/submit-an-embedding-request), [ZDR and Safety Retention](https://openrouter.ai/docs/guides/features/zdr)

## Validation

Behavioral tests cover absent/refused/expired consent, request cancellation before
the next provider stage, strict provider restrictions, no external logo fallback,
optional visual preferences, cancel/grant/withdraw, persistent refusal without
renewal, optional history, expiry, DE/mobile, and unavailable-AI fallback without
an opt-in. Existing chat/history/outage browser regressions are checked separately.
Final command results are recorded after verification below.
