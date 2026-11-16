# Legal, privacy and consent audit — 16 November 2026

Follow-up implementation: the [enabled-feature change](plans/2026-11-16-enabled-privacy-design.md)
now ties local AI disclosures, UI and API admission to both existing release
flags and fixes finding 1's stale-tab restoration behavior. This is a local
implementation update; deployment/account checks and the other findings below
retain their original status. Analytics and server transcript collection remain
future proposals, with no visitor-facing consent for them added.

## Assessment and scope

The current local EN/DE privacy texts broadly describe the implemented data flows.
Two concrete implementation gaps remain: restoring a refusal can leave chat data
in another tab, and a failed notification can retain an already-delivered enquiry
brief indefinitely. Provider/account verification and enforceable retention also
remain open. This is a technical consistency review, not clearance to enable AI
or start collecting interaction data.

Reviewed the working tree based on `78f0ce0ab0bfa873394cc4be5261efab95db6bfe`,
including pre-existing uncommitted privacy changes, all four legal/privacy pages,
assistant and enquiry flows, browser storage, providers, database writes, relevant
logging, camera/files, public assets, service offers and Malt terms. Existing
implementation files were not changed by this audit.

Live HTTP checks retrieved EN/DE privacy and legal notices. A browser check
confirmed the homepage footer's Privacy link reaches the public English notice.
The public notice still describes the earlier implementation: automatic playground
preferences, a potential Clearbit logo request, direct Notion enquiry storage and
AI on a legitimate-interest basis. The local texts instead describe opt-ins,
removed logo fallback, and the PostgreSQL enquiry queue. This difference is not
proof of a deployed defect: publish notices with the corresponding implementation.
The public assistant status returned `available: false, verified: false`; that
response does not independently prove the production feature-flag values.

## Functionality and disclosure map

| Function                    | Implemented local behavior                                                                                                                    | Assessment                                                                                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Website delivery            | Vercel handles technical requests; public API rate counters temporarily hold IPs in memory                                                    | Disclosed separately from analytics. Actual log periods and account terms still need confirmation.                                                               |
| Public content and search   | Published portfolio data comes through the site; ordinary matching is local and does not call an AI provider                                  | Consistent. No visitor analytics collector or dedicated chat transcript table found.                                                                             |
| Images, fonts, social links | Site-served assets/font; automatic Clearbit fallback removed; social/platform links are ordinary links                                        | Consistent with local notice. Do not describe the removal as already deployed.                                                                                   |
| AI questions                | Permission before dispatch; current question to OpenRouter/OpenAI for embedding and answer; relevant public excerpts; previous turns excluded | Consent UI, API validation and notice agree. Request restrictions cannot establish account contracts or endpoint policies.                                       |
| AI permission               | Allow/refuse and version/time/history choice in localStorage, with 180-day validity not renewed by visits                                     | Disclosed; cross-tab refusal restoration needs correction below. Remembering the privacy setting uses the asserted §25(2)(2) necessity exception.                |
| Local chat history          | Page memory by default; separate unchecked option permits five exchanges in tab sessionStorage for two hours after the last answer            | This authorizes local convenience storage only. It does not authorize an operator-readable server archive.                                                       |
| AI usage/security           | PostgreSQL stores cost, status, timestamps, keyed IP hash and declared consent, not question/answer bodies                                    | Accurately described as pseudonymous. Cleanup is admission-triggered, not hard expiry.                                                                           |
| Enquiry drafts              | Drafts automatically saved in tab sessionStorage; expire on restoration after two hours; removed on success/discard                           | Disclosed. Record a §25 necessity assessment for restoring the requested form; use an explicit optional draft-saving choice if necessity cannot be supported.    |
| Submitted enquiries         | Private PostgreSQL outbox, then Notion page and notification; no automatic email receipt, booking or newsletter                               | Main flow disclosed. Notification failure and retention details need the changes below. Contract-related processing is distinct from optional analytics consent. |
| Playground settings         | Memory by default; optional remember control writes localStorage; unchecking removes preferences                                              | Consistent with local notice and storage tests.                                                                                                                  |
| Camera/files/recordings     | Browser camera permission, no microphone request; local processing and downloadable output                                                    | Consistent with notice; this review did not grant camera access or upload private media.                                                                         |
| Paid services and Malt      | Enquiry rather than checkout; scope/fee agreed before work; Malt profile rate identified as such                                              | No concrete purchase/booking ambiguity found. No blanket privacy-acceptance checkbox should be added to the enquiry form.                                        |

The legal basis for processing personal data and the terminal-storage rules are
separate questions. §25 applies to browser storage/access, not only cookies;
an exemption must fit the actual requested service. See [§25 TDDDG](https://www.gesetze-im-internet.de/ttdsg/__25.html).

## Findings and required decisions

### 1. P2 — Withdrawal can leave another tab's saved chat behind

Evidence: `src/components/PlasmaLanding/useKnowledgeConsent.ts:40` restores a
valid declined receipt without clearing chat/status. Its storage-event handler
does clear them, but that listener exists only while the landing component is
mounted. `useKnowledgeAssistant.ts:46` clears memory when permission is absent
without deleting saved sessionStorage.

Reproduction: tab A saves chat, navigates to a different site page, then tab B
withdraws AI permission. Returning A restores the shared refusal but leaves A's
tab-scoped history. Allowing AI again with history selected can restore those old
messages within their lifetime. This contradicts the local withdrawal promise
in EN privacy lines 187–190 and DE lines 201–203.

Clear chat/status on initial restoration of a refusal as well as invalid/missing
permission. Add a behavioral regression covering withdrawal while another tab is
away from the homepage, return, and renewed permission. This finding concerns
existing browser storage, independently of future server transcripts.

### 2. P2 — Enquiry payload erasure depends on notification success

Evidence: `src/server/enquiries/durableEnquiryStore.ts:50` awaits the Notion
notification before line 52 clears the full brief. If page creation succeeds but
the mention fails permanently, PostgreSQL continues retaining the duplicate brief
and retrying. There is no age limit for pending records. The privacy text says
the queued brief is deleted after delivery (EN lines 247–249; DE lines 265–268).

Separate confirmed enquiry delivery from notification delivery. Erase the brief
once the Notion page is confirmed; retry the notification using its page identifier.
Define an operational review/expiry and escalation policy for genuinely undelivered
briefs. Notification failure should not require indefinite retention of contact
details and project text.

### 3. P2 — Retention needs an independent operational mechanism

`src/server/knowledge/usage.ts:50` purges records older than 35 days only inside
successful request admission. The notice accurately explains this trigger; it
does not establish a maximum 35-day lifetime. Outbox receipts are pruned after
30 days only when `drainEnquiryOutbox` reaches its cleanup query at line 69.

Use scheduled cleanup with monitoring, and define treatment of pending jobs,
Notion copies, exports and restored backups. Confirm actual hosting/container
log retention and state a duration or meaningful determination criteria in both
notices; referring only to unspecified provider settings is not useful enough
for a visitor to understand the period. Article 13(2)(a) requires a period or,
where that cannot be given, its determination criteria. [GDPR](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng).

### 4. Before AI enablement — Verify account and transfer facts

The existing [launch review](privacy-launch-review-2026-11-16.md) lists unresolved
Vercel, Hetzner, Notion and OpenRouter account checks. Those are still open in this
audit; public provider documents and source code cannot verify an account's DPA,
selected endpoint retention, access permissions, training/logging settings,
transfer mechanism or backup configuration. Confirm the actual email provider as
part of the contact-processing inventory too.

Current code requests OpenAI-only routing, no fallback, `data_collection: deny`
and `zdr: true` for both embedding and answer requests. Keep the notice's caution
about account/endpoint policies and exceptions; do not promise EU-only processing
or unconditional absence of provider records. OpenRouter documents account-level
Safety Retention choices in its [ZDR guidance](https://openrouter.ai/docs/guides/features/zdr)
and sets out processor/subprocessor arrangements in its [DPA](https://openrouter.ai/data-processing-agreement).

The earlier launch review also flags Vercel plan eligibility. This audit did not
re-query the team's subscription or resolve that contractual issue.

### 5. Legal notice — Confirm business facts; no broad rewrite indicated

Both languages provide the individual operator, postal address, email, telephone,
§5 DDG reference and a consumer-dispute statement. Legal links and language
mapping are present. No obsolete EU online-dispute-platform link was found.
The English notice intentionally refers to the German liability/copyright text.

Verify the address and whether a VAT identification number or business
identification number has been issued; neither appears in the notices. Their
publication is conditional on possession under [§5(1)(6) DDG](https://www.gesetze-im-internet.de/ddg/__5.html),
so this is an owner-fact check, not a confirmed missing-number violation.
Reconfirm that the dispute-resolution statement is factually applicable;
[§36 VSBG](https://www.gesetze-im-internet.de/vsbg/__36.html) distinguishes
participation obligations and business-size exceptions.

For AI, retain the visible identification as an AI assistant before interaction.
The local dialog already does this. Chatbot transparency is a separate requirement
from GDPR permission; see the Commission's [Article 50 guidance](https://digital-strategy.ec.europa.eu/en/policies/guidelines-ai-transparency-obligations).

## Future analytics and conversation review

Alex confirmed the intended server-history purpose: **review conversations to
improve the site and understand enquiries**, rather than visitor conversation
resumption. No tracker, archive table, processor or new data collection was added
by this audit.

Use distinct purposes and choices:

| Purpose                                                          | Recommended control                                                               |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Technical delivery, abuse protection, submitted enquiry handling | Explain the applicable basis; do not turn these into a general consent wall.      |
| Answer a question using AI                                       | Existing AI-processing permission.                                                |
| Remember chat in this browser tab                                | Existing separate optional tab-history choice.                                    |
| Measure site interactions                                        | Independent analytics opt-in, off by default in the proposed design.              |
| Store conversations for Alexander's review and site improvement  | Independent archive/review opt-in, off by default; AI remains usable if declined. |

Separate purposes and genuine choice follow the [EDPB consent guidance](https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf).
This is the recommended consent-based design for the proposed collection, not a
claim that every possible anonymous/cookieless metric requires consent. A different
design needs its own assessment; first-party hosting and absence of cookies alone
do not settle GDPR or §25 applicability.

**Analytics:** start with page views, service/project selections, contact CTA
clicks, enquiry starts and confirmed submissions. Use allowlisted event names,
route/locale and semantic target IDs. Exclude form values, chat/search text, email,
phone, full URLs/query strings, raw IP and persistent fingerprinting. Do not reuse
the security IP hash as an analytics identifier. Record nothing before permission,
including queued events later replayed after permission. Keep transcript and lead
linking out of the initial design. Reports must reflect that opt-in data cover
only consenting visitors.

**Dedicated chatbox history table:** use the existing private German database
if appropriate, with a separate table and restricted access. A minimal design is
one exchange per row: random ID, optional conversation ID, question, answer,
locale, timestamp, expiry and a reference to the archive-purpose consent receipt.
Keep it separate from `knowledge_usage`; do not add the visitor's IP or abuse hash.
Human-readable text can contain personal or confidential data even without a name
field. Minimise/redact before persistence and do not call transcripts anonymous.

Proposed initial raw retention: 30 days, subject to an explicit decision and
automated deletion. This is a product recommendation, not a statutory period or
current behavior. Retain longer-lived insights only after effective anonymisation.
Do not silently forward transcripts to another AI analysis service or train models
on them; either would require its own disclosed purpose/recipient assessment.

Provide a persistent Privacy settings entry across the site, independent controls,
and a server-recognised withdrawal/deletion mechanism that does not require a
visitor account. A browser-only boolean cannot revoke durable server records.
Do not collect older turns retroactively under a newly granted archive choice.
Delete consent-based review records on withdrawal where no other lawful retention
basis applies, and cover backup rotation/restoration in the erasure procedure.
Keep only justified minimal evidence of consent for its appropriate period;
ephemeral security usage rows should not be the sole archive-consent record.

Draft purpose wording, to refine with the final retention and controls:

> Optionally allow Alexander to store and review this conversation for up to
> 30 days to improve this website and understand project interests. You can use
> the assistant without agreeing to this and withdraw through Privacy settings.

Treat a chat question as a chat question. It must not silently become a submitted
enquiry or permission for marketing follow-up. If visitors later choose to attach
a conversation to an enquiry, make that an explicit action.

Update EN/DE notices, inline text and consent-purpose versions before enabling
collection. In particular, the current truthful statements “no visitor analytics”
(EN privacy line 104; DE line 108) and “database does not store questions or
answers” (EN line 208; DE line 221) must change with the feature release, not
in anticipation of functionality that does not yet exist.

## Verification and limits

- Ran the existing knowledge privacy, history, request-cancellation and playground
  privacy tests: **11 passed, 0 failed**. Output:
  `/tmp/homepage-privacy-audit-tests-20261116.log`.
- Tests exercise request parsing, separate/expiring choices, provider request
  restrictions, safe history restoration, no automatic external logo fallback,
  cancellation and optional visual preferences. They do not prove provider-side
  settings, actual production retention, or the missing cross-tab scenario.
- A separate mocked-hook diagnostic, `/tmp/homepage-consent-restore-audit.mjs`,
  executed against current source and reproduced the restoration gap: a declined
  decision left both chat and availability session keys intact. This is not a
  full browser reproduction.
- Read current API, database, client and disclosure code; independent focused
  reviewers checked consent behavior, server storage and legal/copy consistency.
- Retrieved live legal/privacy pages and assistant status; verified the live
  homepage's Privacy link in a browser. The full local consent browser suite was
  not rerun because no local dev server was running. No real visitor transcript
  or enquiry was sent, and no provider agreements/settings were changed.
- No production deployment, database migration, application fix, tracking
  activation or memory update was performed. Existing dirty work was preserved.
