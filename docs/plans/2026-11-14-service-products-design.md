# Scoped starting offers for the service landing pages

Alex approved a product-interface review and an AI workflow assessment, based on the existing bilingual landing pages. Deploy and verify the current bilingual site first; then build the offers.

Use dedicated nested pages plus concise integrated starting-offer sections on the parent landing pages. Dedicated pages provide shareable, self-canonical search destinations; the parent sections make the next step visible in the existing sales journey. An inline-only treatment would be less useful for sharing, while separate unconnected product pages would hide the relationship to the full services.

## Offers and boundaries

- Product-interface review: one important flow in a configurator, visual editor or data-heavy application. Deliver an annotated review, prioritized findings, an interaction direction and an implementation brief. Agree the flow and evidence before work starts. User research, a complete redesign and implementation are separate scopes; no unsupported conversion claims.
- AI workflow assessment: one recurring workflow. Deliver its current-state map, a comparison of conventional automation and AI options, access/data constraints, validation criteria and a proposed first implementation slice. Estimates name their assumptions. No production integration, model training or promised savings is included.
- Both are paid, scoped engagements with fee and schedule agreed before starting. No invented price, delivery window, guaranteed outcome or automatic booking/payment. The initial enquiry is a direct email with a short localized brief. Show the address for people without an email client.

## Implementation

English and German share a typed product registry and server renderer. Routes are `/{locale}/services/product-interfaces/review` and `/{locale}/services/ai-automation/assessment`. Validate the service/product pairing; wrong pairs, unknown products and unsupported locales return 404. Reuse `Layout`, `Button`, service styles, the curated public-project evidence selector and existing locale/SEO helpers. Add a restrained paper-like deliverable summary and numbered output list to match the monochrome editorial service design.

Each page explains the buying situation, exact outputs, inputs needed, scope boundaries, process, fee/scheduling approach, relevant public project evidence and next step. Each parent landing page links to its matching product with a concise deliverables summary. Product pages link back to the broader service and actual case studies. Language links preserve the nested product path.

Use Service structured data, self canonicals, reciprocal language alternatives and the English x-default. Add all four products to the existing sitemap and llms discovery document. Do not create duplicate product copies at multiple paths or use ecommerce pricing markup without prices.

## Acceptance

Write behavior tests before implementation: typed URL/contact helpers, published localized content and Service metadata, correct parent/product/project links, sitemap and llms discovery, and invalid route combinations. Verify the complete production build and suite, types, scoped lint/format, mobile/desktop rendering, language switching and the enquiry destination. Record the initial bilingual release and any later product release separately with exact revisions and rollback checkpoints. Preserve unrelated work and all DNS/hosting services.
