# Senior product engineering, AI capabilities, and enquiry funnel change plan

Date: 2026-11-14
Status: functional pass implemented; real inbox-write verification awaits approval; positioning and copy pass follows separately

## Objective and agreed direction

Position Alexander as an independent senior product engineer who turns visions into prototypes, brings products into production, and stays to maintain and evolve them as their complexity and organizational requirements grow. AI supports his engineering work and is an explicit capability in the applications and workflows he delivers where useful. Support both direct client projects and longer embedded collaborations. Use the owner's stated 9+ years of software engineering experience; substantiate individual claims with project evidence and distinguish AI-assisted development from AI capabilities delivered in a product.

Lead with engineering judgment, UX, architecture, implementation quality, and long-term ownership. Keep AI visible in the offering without implying that every product uses AI, that every implementation is AI-generated, or that Alexander merely orchestrates generation. Describe AI-supported work accurately; avoid "AI-driven development" as the umbrella promise. Case studies should show personal decisions, technical depth, testing, and sustained responsibility, with AI use described specifically when relevant.

Replace the generic public PDF download and email gate with an enquiry journey that understands intent, supplies relevant public evidence, and carries the brief through to a human conversation and proposal. Public experience and project information remain readable without submitting contact information. Permanent employment remains an optional enquiry rather than the main offer.

Candidate positioning, to refine with the copy:

> From ambitious idea to working product—and beyond.
>
> I bring 9+ years of software engineering experience to turning your vision into a useful product—from the first prototype to production and long-term evolution. My work connects UX, robust engineering, and practical AI capabilities.

Do not use "traditional programming is dead" in the site copy or present enterprise readiness as a property that every prototype already has. Show the decisions, operation, integrations, reliability, and ownership that support the lifecycle promise.

## Page-by-page changes

All paths below have English and German variants. Retain existing URLs unless retirement is explicitly specified.

| Page / surface                                                                                   | Responsibility                                   | Changes                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Primary next action                                               |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `/en`, `/de`                                                                                     | Establish relevance and start the journey        | Put the senior product-engineering promise, 9+ years of experience, and practical AI capability in readable HTML near the opening. Explain AI-supported methods without implying universal AI use. Keep the plasma character. Add intent suggestions, three lifecycle stages, selected commercial and AI evidence, and source-aware rate/availability when verified. Replace the CV download suggestion.                                                 | Describe what you want to build or improve; browse selected work. |
| `/{locale}/hire`                                                                                 | Explain how to commission the work               | Replace the external-profile directory emphasis with project and embedded collaboration modes. Explain prototype, production, and ongoing ownership engagements, working process, scope and pricing approach, and what happens after an enquiry. Keep Malt, LinkedIn, and freelancermap as secondary contracting/contact alternatives.                                                                                                                   | Start a project brief or discuss ongoing collaboration.           |
| `/{locale}/contact`                                                                              | Gather a useful brief and hand over to Alexander | Replace `PresetPicker` and the email-for-PDF form with the shared conversational enquiry component. Accept entry context from home, service, or case study. Allow a conventional form and direct email. Add review, edit, submit, saved confirmation, and recovery states.                                                                                                                                                                               | Submit a contextual enquiry.                                      |
| `/{locale}/projects`                                                                             | Provide concise, relevant proof                  | Lead with selected cases grouped by buyer need and lifecycle stage. Provide a full archive and existing filters as secondary exploration. Explain project results and personal contribution briefly; connect each case to a relevant engagement.                                                                                                                                                                                                         | Read a matching case or discuss a similar need.                   |
| `/{locale}/projects/[id]`                                                                        | Establish trust through a specific case          | Add structured problem, role, decisions, delivery stage, outcome, and ongoing ownership where supported. Include applicable AI use and its limits, screenshots/demo, and result provenance. Add a contextual enquiry CTA carrying a project identifier. Keep existing slugs and indexable HTML.                                                                                                                                                          | Discuss a similar product or challenge.                           |
| `/{locale}/cv`                                                                                   | Explain professional depth and continuity        | Present as Experience in navigation and page copy. Keep the URL. Emphasize 9+ years, engagement chronology, responsibilities, collaboration, and long-term engineering ownership. Reuse relevant profile facts and evidence. Make project discovery secondary and link to `/projects`; avoid duplicating its full catalogue.                                                                                                                             | Discuss an engagement or view relevant work.                      |
| `/{locale}/services/ai-automation`                                                               | Explain the AI offering across the lifecycle     | Broaden the page to engineering AI-assisted applications and workflows: prototypes, integrations, workflow automation, production hardening, evaluation, and ongoing operation. Distinguish AI features delivered to users from AI tools used during development. Keep the established URL in this release. Explain when Alexander joins and the outputs of each engagement. Curate evidence of actual AI work and shipped product ownership separately. | Discuss an AI product or workflow.                                |
| `/{locale}/services/product-interfaces`                                                          | Preserve the proven interface specialization     | Connect configurators, visual editors, and complex business interfaces to the broader senior product-engineering offer. Keep UX, usability and implementation evidence concrete. Explain when AI is relevant without implying it is required for every interface.                                                                                                                                                                                        | Describe an interface problem.                                    |
| `/{locale}/services/product-interfaces/review` and `/{locale}/services/ai-automation/assessment` | Offer manageable first engagements               | Retain current scope and deliverables. Route CTAs into the enquiry with the selected offer prefilled; keep email available. Show the path into implementation or continued collaboration without requiring every buyer to begin with an assessment.                                                                                                                                                                                                      | Discuss that specific engagement.                                 |
| `/{locale}/plasma`                                                                               | Demonstrate curiosity and technical craft        | Keep the playground. Update shared identity/navigation and add a restrained link to relevant product work or collaboration.                                                                                                                                                                                                                                                                                                                              | Explore work or get in touch.                                     |
| Privacy pages                                                                                    | Describe actual enquiry and AI data handling     | Replace obsolete CV collection wording. Describe submitted fields, actual processors, any AI handling, measurement, and retention chosen for the implementation. Do not claim analytics, notifications, or deletion behavior before implemented.                                                                                                                                                                                                         | Read data-handling details or contact Alexander.                  |
| Legal notice pages                                                                               | Keep business identity accurate                  | Update only genuinely affected shared identity/navigation; no unrelated business-detail changes.                                                                                                                                                                                                                                                                                                                                                         | Standard legal/contact links.                                     |

No new public page is needed for the first release. Confirmation can be an inline state on `/contact`, with no enquiry details in a public URL.

## Shared navigation and calls to action

Recommended top-level navigation: Work with me, Selected work, Experience, Contact. Make AI capabilities visible alongside senior product engineering in the homepage promise, Work with me page, and service links. Keep both specialist service pages reachable from the header/menu and related content. Apply this positioning consistently to metadata, social previews, structured data, and external-profile drafts as well as visible copy.

Use one coherent enquiry flow with different contextual entry points. Project, service, and engagement CTAs supply allowlisted identifiers; they must not construct competing forms or put private brief text into URL parameters.

Update the shared header, homepage suggestions, project dialogs, sidebar introduction, footer references, and English/German labels. Remove all promises of downloading or automatically receiving a CV.

## Conversational journey

### Step 1: Intent

Opening: "What are you trying to bring to life—or move forward?"

Suggested intents:

- Turn an idea into a prototype.
- Bring a prototype into production.
- Improve an existing product or automate a workflow.
- Add senior ownership to our team.
- Help me figure out the right starting point.

Accept free text and allow visitors to change the interpretation. Provide a direct route for recruiters with a clear assignment and an optional other enquiry path.

### Step 2: Minimum context

Ask what exists today and what should change. Product links are optional. For embedded work, ask the responsibilities the team needs covered. Ask one question at a time with back/edit controls; offer a compact conventional form for people who prefer it.

### Step 3: Relevant evidence

Show one or two matching public cases and a short explanation of relevance, plus an appropriate engagement option. Do this before requiring email. Match against curated, approved evidence and engagement tags, not just technologies or a project's wow-factor score. Never invent matching client results when no suitable case exists.

### Step 4: Practical fit

Ask timing and optional budget for projects. For embedded collaboration, ask expected capacity, duration, and remote/on-site needs. Include "not sure" answers. Display a verified indicative rate and availability only when the source supports it; do not generate binding quotes or infer a minimum project budget from the daily rate.

### Step 5: Review and submit

Collect name, reply email, and optional company. Show an editable summary and explicit submit action. Submission creates an enquiry; chatting, previewing cases, or entering an email alone does not. Preserve unsent answers through navigation within the flow without placing them in URLs or general analytics. Decide any browser-storage retention explicitly.

### Step 6: Confirmation and follow-through

Confirm only after the brief is durably saved. Show the submitted summary and the real next step. Do not promise an unconfigured response time or an email receipt that was not sent. Booking can be offered later if a maintained scheduling source is configured; it is not required for launch.

Alexander reviews the brief, discusses fit, shares a tailored profile if useful, and prepares a scoped proposal. The site does not automatically accept work, quote binding terms, or send proposals.

### AI behavior

Deliver guided conversational behavior and evidence selection as the reliable foundation. An optional server-side model can interpret free text and summarize the brief; a chosen provider and its data handling must be configured before that capability ships. Without a model, expose the guided path honestly rather than calling it AI chat.

If model interpretation is included, constrain its outputs to supported intents, published project IDs, approved copy, and draft summaries. Visitors can correct the result. Rate and availability come from verified structured data, never model inference. Use server-held credentials, request/turn limits, a hard spend limit, and the normal form fallback when unavailable or over budget. Restrict retrieval to approved public professional content. An enquiry is saved only after explicit submission.

## CV download retirement

- Remove homepage commands/suggestions, buttons, contact-page presets, and download promises in both languages.
- Retire public `/cv.pdf`, `/en/cv.pdf`, `/de/cv.pdf`, `/pdf-content`, `/en/pdf-content`, and `/de/pdf-content`. Return a deliberate 410 for retired supported paths, with a plain explanation and contact link where appropriate, rather than leaving a callable renderer behind a removed button. Unsupported locale paths retain 404 behavior.
- Review old redirects in `next.config.mjs` so cached/unlocalized aliases cannot expose a remaining PDF or print route. Include query variants such as `?preset=all` in verification.
- Update `llms.txt`, discovery copy, related metadata, privacy notices, and tests. Ensure sitemap and structured data no longer advertise retired downloads.
- Retain useful PDF rendering code only if it has a real private/manual use. Do not add an unauthenticated replacement generator or assume an unlisted URL is private.
- Experience and case studies remain public. Treat removal from public access as a change to downloadable/print outputs, not deletion of professional evidence.
- Check import consumers before removing the `src/app/cv.pdf` directory: its rich-text helper is reused by service and SEO code. Keep or relocate shared formatting functionality deliberately.

## Content and data ownership

| Data                             | Proposed authority                                                                                  | Publication rule                                                                                                     |
| -------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Profile facts and experience     | Existing Notion records                                                                             | Reviewed factual fields; dates and roles consistent across profiles.                                                 |
| Site copy and translations       | Existing Notion site-copy workflow                                                                  | Versioned English/German changes deployed with the matching UI.                                                      |
| Project stories and outcomes     | Notion editorial records backed by approved source evidence                                         | Record personal contribution, measurement timeframe, source, and permission; distinguish prototypes from production. |
| Technical examples               | Approved GitHub repositories, releases, demos, and architecture notes                               | Public approved material; forks and team work attributed accurately.                                                 |
| Rate and availability            | Malt, if reliable access can be established                                                         | Dated mirror with provenance and freshness; unknown is distinct from unavailable.                                    |
| Enquiries and opportunity status | A dedicated private leads database in the existing Notion workspace, subject to schema/access setup | Never expose through the existing public profile/project API.                                                        |
| Cross-profile positioning        | Approved messaging and facts derived from the above                                                 | Tailor wording to LinkedIn, Malt, freelancermap, and GitHub without contradictory facts.                             |

Potential supporting evidence sources include design files, research, experiment reports, support examples, issue trackers, client feedback, proposals, delivery records, and approved testimonials. These feed editorial review; the website must not ingest unrestricted private workspaces into its public assistant.

### Malt feasibility gate

Prior investigation in this conversation verified that the live public profile displayed a daily rate, but did not verify public availability or a documented supported API. Do not bake the observed numeric rate into this plan as permanent configuration.

Before automatic mirroring, establish a usable, permitted retrieval method for each field, its meaning, and a repeatable update check. Public extraction is an option to evaluate, not a completed integration. Keep currency, day-rate unit, source URL, fetched time, and source-confirmation time when available. Retrieval freshness does not establish when Alexander last confirmed availability on Malt.

Refresh outside page requests. Define an explicit freshness policy, validate payloads, and distinguish fetch failures from actual changes. Hide stale availability claims behind "Ask about availability" and show the provenance of any retained rate. Never silently fall back to a contradictory Notion value while describing Malt as authoritative. A manually verified mirror is an interim option if automation cannot be made dependable.

## Lead handling and measurement

Suggested record fields: enquiry ID, created time, language, source page, selected service/case, intent, existing situation, desired outcome, timing, budget or capacity/duration, working arrangement, name, email, company, reviewed brief, status, and next action. Store only information actually provided or confirmed by the visitor. Record published rate/source context if shown, without treating it as an accepted quote.

Lifecycle: new → reviewing → conversation → proposal → won/lost → active → extension/completed. Keep a reason when an opportunity is lost or unsuitable. This can start with human status updates; automated contract handling is outside the first release.

Use server-side validation, spam/rate controls, idempotent submission, and recoverable errors. A failed save must not produce a success state. Coalesce same-instance retries and look up stored references before writing; document the cross-instance uniqueness limitation of the Notion store. An owner notification channel is a follow-on integration; keep saved leads visible independently of it. Historical CV signup records remain separate; do not relabel them as qualified enquiries or delete them as part of this change.

Define funnel events: entry, intent selected, evidence shown, brief submitted, conversation, proposal, won/lost, and extension. Send no free-text briefs, emails, or chat transcripts to generic analytics. Introduce visitor measurement only with the corresponding implemented privacy handling. A click on a mailto link is not proof of a received enquiry.

Assess qualified enquiries, proposal rate, win rate, contract value, collaboration duration, and loss reasons. Use descriptive counts and actual buyer feedback while traffic is too small for meaningful experiments. A higher raw submission count alone is not acceptance of commercial improvement.

## Reuse and implementation surface

- Retain the current Next.js application, route structure, bilingual helpers, and Notion integration for this scope. A hosting/framework migration is a separate project.
- Reuse `PlasmaLanding`, `commands.ts`, project-search indexing, and `ProjectSearchResults` for entry and discovery where they fit. Separate navigation/search behavior from the new multi-step enquiry state.
- Build one shared enquiry component and state model for the homepage entry and `/contact`; do not implement two independently evolving conversations.
- Reuse `Layout`, `Button`, locale-aware links, public project selectors, project cards/details, service page renderers, and existing SEO helpers.
- Adapt the current Notion page-creation utilities for a dedicated lead schema rather than extending the email-only CV-signup action into an ambiguous catch-all.
- Keep public APIs limited to approved published profile/project content. Lead records and contact briefs require a separate private path.
- Preserve existing project URLs, English/German canonical and alternate links, source-language fallback behavior, and unrelated DNS/subdomains/mail services.

## Implementation sequence and checkpoints

The owner requested separate commits: functional changes first, then a dedicated copy and positioning pass. Do not mix the broader branding rewrite into the first functional commit.

### Commit 1: functional enquiry funnel and public CV retirement

- Reuse the existing monochrome components and preserve substantive marketing copy.
- Add guided intent, context, relevant public evidence, practical fit, contact details, review, submission, confirmation, and a conventional-form alternative.
- Connect homepage, hiring, project, and service entry points using safe selection identifiers. Preserve drafts across steps and language changes.
- Store full reviewed enquiries in the existing private Notion inbox, with separate enquiry-reference titles and body content. Historical CV signup rows remain distinguishable and unchanged. Support a dedicated inbox with the same schema via `NEXT_NOTION_ENQUIRIES_DB_ID` when configured.
- Remove the email-for-CV form and its callable signup action. Retire public PDF/print routes and aliases, including direct requests. Preserve useful shared rendering/text helpers.
- Update functional labels and factual privacy/discovery statements required by the new behavior. Defer headline, service-positioning, case-story and external-profile rewrites.
- Keep matching guided and deterministic in this commit; no model provider, inference cost, or unverified Malt sync is introduced.
- Verify behavior tests, build, types, lint/format, mobile/desktop browser transitions, retired endpoints, and (after explicit test-write approval) a real synthetic Notion submission. Archive the identifiable synthetic test record after verification. Make one scoped Conventional Commit.

### Pass 2: positioning, evidence and copy alignment

Refine English/German copy across the homepage, shared identity, Work with me, Experience, services, and case studies. Lead with senior product engineering and 9+ years of experience; make AI-supported methods and AI-assisted applications visible without implying every product is AI-generated. Curate the lifecycle evidence and prepare aligned LinkedIn, Malt, freelancermap, and GitHub wording. This is a separate reviewable change and commit.

### Follow-on integrations and measurement

Enable Malt mirroring only after reliable access and semantics are verified. Add bounded free-text AI interpretation only after selecting its provider and data-handling configuration. Configure owner email/other notification delivery and scheduling if desired; the first functional pass stores enquiries in the private Notion inbox and does not claim to send automatic receipts, notifications, or bookings. Use actual enquiry and proposal outcomes to guide later improvements.

Notion does not provide a transactional uniqueness constraint for a caller-supplied enquiry reference. The first pass checks existing receipts and coalesces same-instance retries; simultaneous requests on different instances can still create duplicate inbox rows. Treat the reference as the deduplication key and do not claim exactly-once delivery. An atomic reservation store is needed if strict cross-instance uniqueness becomes a requirement.

Build and test locally/with a preview before production. No production deployment or external-profile publication is included in the functional commit request. Preserve unrelated dirty work.

## Acceptance criteria

- English and German pages consistently explain senior product engineering, AI-supported methods and AI-assisted application capabilities, the prototype-to-production-to-ownership lifecycle, and both engagement modes. They do not imply that all work is AI-generated or that all products require AI.
- Core positioning, project evidence, and ordinary navigation work without the assistant or model being available.
- Intent entry from home, a service, and a project reaches the same flow with the right context; back/edit and language switching do not silently discard the brief. Submitted content is excluded from URLs and public caches.
- Relevant work is shown before contact details are required. Unknown intent, no matching case, model failure, source failure, and budget exhaustion have honest usable fallbacks.
- Project and embedded enquiries create a complete private record, reuse receipts for ordinary retries, and serialize same-instance submissions by reference. Invalid submissions, write failures, notification failures, and retries produce appropriate states.
- CV download/print endpoints and their aliases no longer deliver public CV content, including direct requests and preset query variants; no broken shared-helper imports remain.
- Case claims identify responsibility and distinguish independently measured results, team results, working prototypes, and production operation.
- Rate/availability displays identify their source and handle stale, missing, unavailable, and failed-fetch cases separately; no model supplies either fact.
- Public profile/project APIs, schema, sitemap, canonicals, alternates, legacy project links, and image handling continue to work. Private lead data is never in those outputs.
- Run behavior-focused tests for flow transitions, context handoff, persistence outcomes, PDF retirement, source freshness, and optional model fallback. Do not add tests for visual styling.
- Complete the repository test suite, production build, types, scoped lint/format, and mobile/desktop browser checks including keyboard use, reduced motion, validation, back navigation, and real preview submission. Test with identifiable synthetic leads and clean them up deliberately.
- Verify a production release by exact deployed revision, representative live pages, direct retired-route requests, and an end-to-end synthetic enquiry. Report delivery and notification separately; do not infer business conversion improvement from technical success.

## Decisions still needed during implementation setup

These do not prevent approving the page map:

- Supported Malt access and exact rate/availability semantics; until verified, no promise of automatic sync.
- Whether free-text model interpretation belongs in the first release, and which existing provider/configuration will support it. Guided conversation is the mandatory fallback either way.
- Actual leads-database destination, retention policy, owner notification channel, and truthful follow-up expectation.
- Which cases have publishable evidence for production AI work and sustained ownership; do not fill gaps with invented enterprise claims.

## Scope of this planning deliverable

The first implementation pass covers functional enquiry behavior and public CV retirement only. The remaining positioning/copy changes and follow-on integrations are tracked separately above. A commit does not imply production deployment, external-profile alignment, model integration, Malt synchronization, or demonstrated commercial conversion improvement.
