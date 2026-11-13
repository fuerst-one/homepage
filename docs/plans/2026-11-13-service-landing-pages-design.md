# Bilingual service landing pages

Build two conversion-focused offers, each in English and German: complex product interfaces, and AI automation/prototypes. Final routes: /en/services/product-interfaces, /de/services/product-interfaces, /en/services/ai-automation, /de/services/ai-automation. A single src/app/[locale]/(chrome)/services/[service] route validates both parameters. Route conventions and shared SEO/chrome integration are coordinated with the simultaneous site-wide i18n chat; it owns global i18n files. This task owns service-specific content, components, routes and tests.

## Design

Use the existing Layout, Button and monochrome Menlo/IBM Plex + Plasma identity. Prefer an editorial service narrative with a strong typographic hero, an actual product screenshot, numbered deliverables, curated case studies, process, honest FAQs, and a repeated direct email CTA. A generic agency card grid would lose the site's character; a standalone microsite would duplicate chrome and language conventions. Server-render content and evidence; no new dependency or enquiry backend.

Each page speaks to an actual job: making complex product decisions understandable, or removing repetitive tool handoffs/testing an idea. Explain deliverables and first step. No invented pricing, timelines, testimonials, scarcity or promises. Email requests only a short problem description; expose the address for visitors without a configured mail client. Use locale-aware route alternatives and localized contact subjects.

## Evidence

Public project API verified 2026-11-13: Konfig Product Design Configurator, Seabo, Conversion Y, build-manager. Use an ID allowlist over the existing cached public project source. Show name, client names, selected tools, screenshot, project type and case link. Label build-manager personal work. Live KPI text is case-specific owner-reported evidence, not independent attribution or a promise of future results. Use the shared locale-selected project source and translation-aware project link resolver. Where German data is not published, keep the English text explicitly labelled and link to the English case. Never serialize contacts, private metadata or the complete project object to the browser. If evidence retrieval fails, keep the offer/contact available and state that case data is temporarily unavailable.

## CRO research

- https://www.konversionskraft.de/conversion-rate-optimization/11-landingpage-elemente-im-bewertungsraster — relevant headline/subline, differentiating offer, reason why, clear CTA, functioning explanation, real trust and product imagery. Published 2010, heuristic rather than statistical evidence.
- https://unbounce.com/landing-pages/checklist/ — message match, specific benefit, original imagery, one primary goal, avoid unnecessary enquiry friction.
- https://cxl.com/blog/case-study-how-we-improved-landing-page-conversion/ — audience research, responsive hierarchy, credible proof, iterative testing. Some seemingly sensible variants lost. Treat principles as hypotheses; do not copy reported conversion lifts.

## Validation

Behavior-first integration tests: all four routes, reciprocal language alternatives/self canonicals, localized headings and email intent, Service JSON-LD, actual public evidence and case links, invalid route handling, sitemap/discovery integration once i18n convention is agreed. Check TypeScript, scoped lint/format, full existing behavior suite, production build in an isolated output directory if feasible. Inspect desktop/mobile screenshots, language navigation, FAQ keyboard behavior, and contact/project destinations. Preserve unrelated dirty work; no deployment authorized by this task.

## Review resolution

The independent bug review identified that a caught upstream outage could become a permanent static fallback. The service route now revalidates hourly, so fallback pages retry after recovery without caching errors in the shared project source. This interval is a route recovery policy; it does not change the existing project dataset refresh policy.

## Final i18n integration

Alex confirmed explicit /en and /de prefixes in the sibling i18n chat. Service routing now shares Locale, isLocale, locales and localizedPath. Service metadata delegates to the shared locale-aware pageMetadata helper. ServicePage passes locale into Layout and getCachedCvProjects; it computes project hrefs from the complete source before projecting only display fields, allowing the shared translation-readiness rules to choose German case links or the English fallback. The global i18n chat owns root html language, localized chrome, canonical migrations and legacy redirects.

## Acceptance evidence

- The isolated production build owned by the i18n chat passed with all four service pages. It serves the reviewed snapshot at localhost:6892; this is a local preview, not a production deployment.
- `SEO_TEST_BASE_URL=http://localhost:6892 node --test tests/service-pages.test.mjs`: 7 passed, 0 failed. Covers four localized offers, root document language, canonical/hreflang, Service JSON-LD, direct email enquiry, real case links, private-field projection, unknown service/locale 404s, shared navigation and sitemap discovery.
- TypeScript passed on the migrated verification snapshot. Scoped ESLint and Prettier checks passed. Both independent reviewers reported no remaining findings after the outage recovery fix and locale/data integration review.
- Nine browser scenarios covered all four pages at desktop (1440) and mobile (390) widths, plus German product interfaces at 320. All images loaded, no horizontal overflow or runtime errors, correct root language, and keyboard-operated FAQs.
- Followed the German-to-English service switch and Conversion Y case link. Inspected the localized email subject/body without sending email.
- Production response: HTTP 200, static cache HIT, `Cache-Control: s-maxage=3600`.
- Verified German KPI output for all four selected projects from the completed Notion backfill, with case-specific attribution retained.
- No deployment, DNS, hosting or unrelated SEO operations performed by this task.

Logs: /tmp/service-production-tests.log, /tmp/service-production-headers.log, /tmp/service-browser-final.log, /tmp/service-links-final.log, /tmp/service-acceptance-types.log. Earlier baseline full suite passed 62 tests before the shared locale migration; final whole-site regression/build ownership remains with the i18n chat.
