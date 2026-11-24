# Search and AI discovery rollout

Canonical website: **https://fuerst.one**. Audience: clients and recruiters looking for UX, frontend, AI engineering, data visualization, and e-commerce experience.

## Current plan after the bilingual commits

The completed hosting rollout below remains the historical baseline. Commits `27c4174`, `e66db92` and `9a2c04b` add the interactive homepage, bilingual site and service offers. These changes and SEO follow-up `6a9f4c9` are now deployed and verified, with canonical HTML under `/en/...` and `/de/...`, including four service pages. The same apex domain, unprefixed sitemap/API/assets and existing hosting records remain in use. See the [bilingual release and starting-offer receipt](deployment-2026-11-14.md) for production evidence and the subsequent product-page scope.

Read the [localized SEO review and release plan](seo-localized-review-2026-11-13.md) before the next release. Deploy routes, permanent old-path redirects, metadata, internal links and sitemap together; validate actual HTTPS before asking Google to crawl the new URLs. The daily indexing monitor now determines which URL structure is live before choosing inspection targets. It must not treat not-yet-deployed localized URLs as a regression or continue treating redirected old paths as the final canonicals after release.

## Completed hosting rollout

**Rollout completed.** Normal system HTTPS and browser access to `https://fuerst.one` recovered after the DNS transition. The www/CV aliases now return path-preserving 308 redirects to apex. The old portfolio returns relevant 301 redirects or 410 for retired pages; its one.com cache was purged. Buchstabiene's noindex changes are deployed and Google's live crawler confirmed the directive. Google Search Console successfully read both canonical sitemaps (50 main-site URLs, one Buchstabiene homepage); obsolete HTTP/www submissions were removed. Four recrawl requests were accepted. See the [finalization receipt](seo-finalization-2026-11-13.md) for exact releases, verification and rollback. Folder subdomains and service/mail records remain preserved. The DNS/deployment timer is stopped; the user subsequently authorized a daily indexing follow-up at 09:00 Europe/Berlin while Google recrawls.

Reviewed revisions: homepage SEO/header `c78f5c5366761ac2b3580aa3cfca99494cf11821`, followed by runtime fix `56d6b11e7eb5dabc037c1fb698b5279ae978705e`. The initial Buchstabiene SEO deployment was `bc4284726ce5cf7cd313b30f4306f128030aedcb`; the GitHub synchronization follow-up restored an upstream login fix in merge `be75b3523ae3294f98c1d370c6356fb1c69f9d40`, now deployed as `dpl_9ZqRhP2a2bD6cfmQctAyerTbTR9L`. Earlier production upload attempts created no deployments because CLI 39.1.2 was too old. The authorized manual releases used CLI 65.15.0 and clean detached worktrees. The first Buchstabiene attempt was rejected because Node 20 is discontinued; its project now selects Node 26, checkpointed separately. Release commits are now pushed to GitHub; see the finalization receipt for the synchronization and indexing follow-up.

## Implemented in the homepage repository

- Visible, server-rendered introduction and navigation below the existing plasma landing.
- Unique metadata, canonical URLs, Open Graph/Twitter previews, and a generated share image using the existing local font.
- Website/Person, CV ProfilePage, project CreativeWork, and breadcrumb JSON-LD; only public profile fields are published and script content is escaped.
- `/projects` is a server-rendered directory of all public projects. Static pages such as `/projects/konfig-product-design-configurator` reuse the existing full project details. The CV links every public project, independent of filters or the collapsed list. The existing ID-based URLs permanently redirect to the named canonical pages.
- Published slugs are pinned to Notion IDs in `src/data/project-slugs.json`, so renaming a project does not break its URL. New records work immediately with descriptive name-plus-ID URLs; add a unique short entry to the registry when curating a new project. The fallback URL remains a permanent redirect after a short slug is assigned. The API's `webUrl` links to the canonical HTML page; its existing `url` remains the JSON endpoint.
- Sitemap containing public pages and projects, crawlable robots.txt, and expanded existing llms.txt linking the HTML content, public profile, and API documentation.
- `noindex, follow` for the print-only CV page. URL-dependent sync components have their own Suspense boundary so the CV HTML survives production prerendering.
- Notion 429 retries respect Retry-After, failed fetches do not cache an empty dataset, and build concurrency is limited to avoid duplicate cold-cache requests.
- Legacy navigation URLs have relevant permanent redirects instead of all pointing to the homepage.

## Pre-migration state observed on 2026-11-13

- Apex `fuerst.one` resolves to one.com (`46.30.213.31`) and issues a temporary 302 to `cv.fuerst.one`. Paths acquire a double slash, for example `/cv` becomes `https://cv.fuerst.one//cv`.
- Vercel project `auto-cv` owns `cv.fuerst.one`; `auto-cv.fuerst.one` redirects there. Vercel does not currently list apex `fuerst.one` under this account.
- `buchstabiene.fuerst.one` belongs to the separate Vercel project `spelling-bee`.
- `portfolio.fuerst.one` serves the old Nuxt-generated site on Apache with index/follow, very long caching, and an SPA fallback. Its source is preserved at `/Users/Alex/dev/01-fuerst-one/01-archive/fuerst-one-portfolio`.
- Search Console domain property `sc-domain:fuerst.one` listed **50 indexed pages**, including six portfolio URLs and many Buchstabiene dated game/solution/highscore pages (report last updated 2026-11-09).
- Submitted sitemaps: `https://www.fuerst.one/sitemap.xml`, `https://fuerst.one/sitemap.xml`, and `http://fuerst.one/sitemap.xml`. All three reported errors and zero discovered pages. None had been read since 2024 or earlier.
- No removal requests were present in the last six months when inspected. No request has been submitted by this work yet.
- Existing one.com SSH authentication works outside the sandbox. Its public document root is `/customers/5/4/3/fuerst.one/httpd.www`; the portfolio subdomain uses the `portfolio` directory. The root `.htaccess` still permanently redirects `www.fuerst.one` to the old portfolio. The apex-to-cv 302 is not in that file and needs the provider control-panel/DNS change. No live files have been changed and the Apache retirement file is not installed.
- The user completed one.com control-panel authentication. DNS and forwarding settings can now be inspected through the authenticated browser; SSH access covers website files separately.

## Safe activation order

1. Deploy the reviewed homepage revision to `auto-cv`, retaining existing API/Notion configuration. Check raw HTML (not only a JavaScript browser) for CV/project content and metadata.
2. Attach **only** `fuerst.one` and, if desired, `www.fuerst.one` to that Vercel project. Get the exact apex/www DNS values from Vercel for these domains. Snapshot their current records; change only the apex/www records. Preserve all other subdomain, MX, and TXT records used by Coolify, mail, and Vercel services.
3. Verify apex HTTPS serves the new site directly with 200 for `/`, `/cv`, a project, `/robots.txt`, and `/sitemap.xml`. Confirm there is no apex-to-cv redirect before configuring cv-to-apex redirects.
4. Set Vercel's `cv.fuerst.one`, `auto-cv.fuerst.one`, and optional `www` aliases to permanent, path-preserving redirects to apex. Check query preservation and no redirect loops. Keep all aliases operational for old inbound links.
5. Back up the live portfolio `.htaccess`, then install the rules in `ops/portfolio-retirement.htaccess` **in that subdomain's document root**, before the SPA fallback. The known content routes get 301 replacements; retired experiments get 410. Test the real Apache responses before calling this finished. This is configuration retirement, not deletion of the archived code. Retain redirects long term.
6. Deploy the SEO changes in `/Users/Alex/dev/01-fuerst-one/spelling-bee`. Its `/spielen` layout applies `noindex, follow` to dates, today aliases, solutions, and highscores. Each dated page has its own canonical; the German homepage remains indexable, and the sitemap lists only that homepage. Do not block `/spielen` in robots.txt, because crawlers must see noindex.
7. In Search Console, submit/resubmit `https://fuerst.one/sitemap.xml` and `https://buchstabiene.fuerst.one/sitemap.xml` **after checking public 200 XML responses**. Remove stale HTTP/www submissions after the canonical sitemap is accepted.
8. Inspect and request recrawls for the new homepage/CV, a project, one old portfolio URL, and a dated Buchstabiene page. Confirm the intended canonical, redirects, and noindex as Google sees them. A temporary removal for **only** `https://buchstabiene.fuerst.one/spielen/` can accelerate hiding game pages; the scope must not include the Buchstabiene homepage or the whole fuerst.one property. Removals expire after about six months and do not replace the deployed directives. Do not use the Removals tool to canonicalize cv/portfolio aliases.

## Bing Webmaster Tools and IndexNow

Bing Webmaster Tools already held the `https://fuerst.one/` site (and `burger-loop.fuerst.one`) from an import in February 2021; its only sitemap had last been crawled then, with 11 URLs. On 2026-11-24 `https://fuerst.one/sitemap.xml` was resubmitted there and accepted for processing. Buchstabiene is not listed there; it is intentionally noindex apart from its homepage.

IndexNow pushes changed URLs to Bing and the other participating engines without waiting for a crawl. The sync worker runs an "IndexNow sync" loop every five minutes (`apps/sync/src/indexnow/`). It reads the live sitemap, which keeps the web app as the only source of URLs, and submits URLs that are new or whose `lastmod` changed. `indexnow_submissions` remembers what was sent, and a rejected submission records nothing, so the next run retries. Static pages have no `lastmod` and are sent once. The loop is skipped in development so local workers never push production URLs.

The key is public by design: `packages/content/src/indexNow.ts`, served at `https://fuerst.one/indexnow-key.txt` and named as `keyLocation` in each submission. Activation order: deploy the web app so the key URL returns 200, run `pnpm notion:migrate` against production (adds `016-indexnow.sql`), then redeploy the worker. Its first run submits every sitemap URL once. Submissions appear under IndexNow in Bing Webmaster Tools.

## Verification

With a production server running (for example `pnpm build && pnpm start --port 6891`):

```sh
SEO_TEST_BASE_URL=http://localhost:6891 pnpm test
pnpm exec tsc --noEmit
pnpm exec eslint src/app src/lib/seo.ts src/components/Cv/Projects
```

The HTTP suite checks initial HTML, metadata, all project discovery links against the public API, sitemap contents, project schema/404s, AI entry points, print-page noindex, and legacy host redirects. Unit tests check bounded Notion retries. Use the existing TypeScript compiler so tests work on Node 20 as well as newer Node versions.

## Basis

- [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features): crawlable text, internal links, accurate structured data, and existing SEO fundamentals matter; llms.txt is supplementary, not an indexing requirement or ranking guarantee.
- [Google: canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls): use relevant permanent redirects for moved content and do not use removals for canonicalization.
- [Google: noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing): pages must remain crawlable for the directive to be read.
- [Google: removal requests](https://support.google.com/webmasters/answer/9689846): temporary, cancellable, and separate from the permanent server/page response.
- [OpenAI: crawlers](https://developers.openai.com/api/docs/bots): OAI-SearchBot controls search crawling independently of training. The existing open crawl policy remains; API endpoints and images are not blocked.

Indexing, rankings, and AI citations require external crawling and are not proven by local code checks.

Validation on 2026-11-13: both production builds passed; the homepage's 12 HTTP/retry tests, TypeScript build check, scoped ESLint, Prettier, and whitespace checks passed. Browser checks confirmed the directory exposes 38 project links and that a named project opens with its own heading/title/canonical without console errors. Buchstabiene's built server returned 200 with `noindex, follow` for a dated game, its solutions, and its highscores, while its German homepage stayed indexable with its own canonical. The portfolio Apache configuration has been reviewed but still needs a real hosting check after activation.

At the local-validation checkpoint, changes had not yet been deployed. The pre-existing development widget edit in the homepage root layout is preserved and must be excluded from a scoped SEO commit. The shared header was also adjusted after the user's viewport screenshot: fixed square portrait tracks, whole-phrase tagline wrapping, and an explicit compact status row. Browser checks at 320, 390, 649, 768, 1024, and 1440 pixels found no horizontal overflow and square portraits; independent delta review found no new issues.

## Existing interactive CV issue observed during browser checks

The project dialog can reopen after closing, and `focus` query parameters can enter the filter store. Review confirmed both URL-sync files are unchanged from HEAD; the issue predates this work. The new standalone project pages and directory do not depend on dialog state. This separate interaction issue is not included in the SEO changes.
