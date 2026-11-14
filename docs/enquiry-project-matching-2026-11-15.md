# Shared project matching for enquiries and landing search

The enquiry flow and landing suggestion box now use the curated case dimensions
from the existing Notion Projects database. The 422-value backfill was read back
against all 41 public projects before integration; all values matched. The three
hidden records stay excluded.

## Behavior

- Enquiries rank up to three examples using buyer needs, specific AI capabilities,
  project domain, selected service, delivery stage and documented team contribution.
  Specific capability requests require a matching capability, rather than just an
  AI tag. A selected source project remains visible as context even when unrelated.
- English/German phrases are matched locally in the browser. There is no model
  provider, external interpretation request, extra enquiry write or query logging.
  This is a finite phrase vocabulary, not general language understanding. Unknown
  requests can yield no example; the form remains usable.
- Cards explain shared topics, label partial matches, and show documented stage,
  ownership model, engagement status and AI-use classification. Missing values are
  undocumented. Internal use, MVP, production, ended engagements and team/solo work
  remain distinct. No outcome percentages or whole-case verification claims are
  generated from the editorial evidence fields.
- Landing search adds buyer-need, delivery-stage, domain, AI-capability, AI-use,
  ownership and engagement-status chips to the existing search component. Selecting
  a chip filters its exact canonical field and keeps its advertised project count.
  Existing names, technical tags, icons, keyboard interaction and localized links
  remain usable.
- Longer landing queries reuse enquiry matching alongside ordinary lexical search.
  Recognized technology/client terms and explicit stage, workplace, project-type,
  AI-use classification, ownership, engagement-status and featured phrases constrain the results. This
  interpretation is deliberately limited to indexed vocabulary; it does not promise
  arbitrary semantic or negation understanding.
- Landing results explain matched topics and show stage/ownership. English case
  contexts carry an English language attribute on German pages, including previews.

## Data boundary and freshness

`readPublicProjectCase` rejects hidden/archived records and allowlists controlled
classification values plus the public Case Context summary. Evidence Gaps,
Personal Contribution, outcome prose, review metadata and contact fields never
enter the matching projection. The existing public project-list API adds an
optional documented `matching` object; its existing filters retain their scope.
The projection is joined only to projects already visible in the public portfolio.

Case data uses the existing Notion fetch layer, one-hour revalidation and the
`cv-projects` cache tag. Optional evidence failure leaves the contact flow usable
without suggestions; an empty failure is not cached as a successful source.
The source backfill and existing Notion editorial values are not modified.

## Validation

The full suite passes 155 tests. Behavior tests cover bilingual requests, MVP/internal-use limits, no-match cases,
source-only context, AI-feature versus AI-assisted classifications, current versus
desired AI, shipping ambiguity, team versus solo contribution, exact chip counts,
combined facets, caption language and public projection boundaries. HTTP and
browser acceptance verify the production build and live public case data.
Production build, TypeScript, scoped ESLint, Prettier and whitespace checks pass.
Browser acceptance observed English/German natural-language requests, keyboard
selection of the Survey analysis chip with its exact one-project count, and the
production-intent enquiry's partial matches. Both surfaces fit a 320px viewport
without document overflow. Temporary screenshots are saved at
`/tmp/homepage-project-matching-landing.jpg`,
`/tmp/homepage-project-matching-landing-mobile.jpg` and
`/tmp/homepage-project-matching-enquiry-mobile.jpg`. These are session evidence,
not committed assets.

This is a functional change. The broader offering, homepage and external-profile
copy alignment remains a separate pass. No deployment is included.
