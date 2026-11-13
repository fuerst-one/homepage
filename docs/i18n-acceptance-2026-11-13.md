# Bilingual site acceptance — 2026-11-13

Implemented the approved `/en` and `/de` route structure together with the service-page session. This receipt records local production acceptance, not a deployment or Google indexing result. See [editing and refresh instructions](i18n.md).

## Content and routing

Backfilled 41 public project descriptions/KPIs and owner profile properties in Notion. Created 21 keyed English/German Site Copy rows. Shared names, multiselect values, IDs and assets are retained. The migration's final dry run proposed zero project or copy changes. German projects require the publication checkbox and complete prose; raw translation fields are stripped from public responses and client props.

Both language routes prerender with hourly revalidation. Old English paths redirect permanently, preserving query strings; German legal aliases resolve to their canonical legal URLs. APIs and assets remain unprefixed. German API detail links preserve the selected locale, and unsupported locale inputs are rejected.

Self canonicals, reciprocal language alternatives, `x-default`, localized structured data and the sitemap share the same routing helpers. This follows Google's [localized-page guidance](https://developers.google.com/search/docs/specialty/international/localized-versions) and [URL-migration guidance](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes).

The [previous SEO receipt](seo-finalization-2026-11-13.md) records that Google had discovered the old CV URL without crawling it and initially did not know the new project URL. Crawl requests were subsequently accepted. Those observations do not prove that the URLs remain uncrawled now. This implementation updates the generator at the existing `/sitemap.xml` URL; live deployment must precede any resubmission or indexing-monitor target change. DNS, hosting aliases and Search Console were not changed by this implementation.

## Verification

- Production build: `pnpm exec next build --webpack`, passed in an isolated copy at `/tmp/homepage-i18n-verify` using the installed dependencies. Webpack avoids the temporary copy's symlink restriction with Turbopack.
- Full suite: `SEO_TEST_BASE_URL=http://localhost:6892 pnpm test`, 88 tests passed, zero failed or skipped.
- TypeScript source check and scoped ESLint passed. `git diff --check` passed.
- All 102 sitemap URLs returned 200, self canonicals and the matching HTML language. Unsupported PDF locales returned 404; invalid API locales returned 400.
- Isolated Chrome checked German homepage rendering and pause controls at 320, 390 and 1440 pixels; language switching retained a React filter. Clearing filters retained `/de`, and opening/closing a project dialog retained the cleared selection. The German `Kontakt` command navigated to German contact with translated presets. German project prose rendered from Notion. No browser page errors remained.
- Downloaded `/de/cv.pdf?preset=featured`, verified PDF bytes, extracted German text and rendered the one-page document with macOS PDFKit. Visual inspection confirmed readable German summary, profile and project prose with intact layout.

Browser acceptance found and fixed two existing data/state issues: separate filter/dialog URL writers could overwrite newer choices, and an empty Notion workplace select could crash homepage search. One URL coordinator now serializes both stores, and empty single-value search facets are omitted. Regression tests cover queued changes, navigation, sparse records and retained URL state.

Security, code-quality, UI and bug reviewers checked the implementation. The final bug/security passes reported no remaining actionable findings. Production build/test logs, isolated browser screenshots and the rendered PDF are temporary local evidence under `/tmp/homepage-i18n-*`; the PDF contains the existing personal CV contact details and is not added to the repository.

## Release boundary

Commit the route migration, redirects, shared helpers, Notion configuration, metadata, sitemap and bilingual services together. No push or deployment is included in this acceptance. After release, verify actual HTTPS responses and the deployed revision before updating Search Console or the indexing follow-up.
