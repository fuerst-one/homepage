# SEO rollout finalization — 2026-11-13

Completed the authorized [hosting inventory](hosting-inventory-2026-11-13.md), [homepage deployment](deployment-2026-11-13.md) and [apex cutover](apex-cutover-2026-11-13.md) rollout. The DNS/deployment heartbeat was paused when that work completed; the subsequent authorized GitHub synchronization and daily indexing monitor are recorded below. No unrelated frontend/hiring changes in the main worktree are included.

## Live routing

Normal system HTTPS and browser access to `https://fuerst.one/` recovered at approximately 20:27 Europe/Berlin. Both curl and Node resolved the published Vercel address and returned 200 without an IP override; the browser rendered the homepage. The homepage production deployment remains `dpl_JDr7v1gCXEBuE5o3cX6i45r2hHWr`, revision `56d6b11e7eb5dabc037c1fb698b5279ae978705e`.

`www.fuerst.one`, `cv.fuerst.one` and `auto-cv.fuerst.one` now return permanent 308 redirects directly to apex. The checked nested project path and query string were preserved for all three. The alias settings were checkpointed before modification. Vercel required moving auto-cv's incoming redirect away from CV before CV could itself be redirected; the rejected first attempt left CV unchanged. Final actual HTTPS responses confirm the intended routing.

## Old portfolio

Installed `ops/portfolio-retirement.htaccess` only in `/customers/5/4/3/fuerst.one/httpd.www/portfolio/.htaccess`, with an atomic sibling-file rename. Original SHA256: `9fe55b8e3bb3829f74346918e22df4dca1a2092195b232166bcc301d0be68afa`. Installed SHA256: `775462e22290efa9d6cdb38239ab6cbd21b56621ab25046119422fdea9078c86`.

Known routes return relevant 301 replacements: homepage to apex, learn-more to CV, projects to projects, contact/team-up to contact, privacy-policy to privacy, legal-notice to legal-notice, and sitemap to the canonical sitemap. Unknown retired pages return 410. Robots remains crawlable with 200, allowing Google to see the redirects and removals. Ten actual public response checks passed.

The old site advertised a one-year cache lifetime. Initial ordinary requests therefore continued returning cached 200 responses despite correct origin rules. Added the provider's documented [Cache-Control no-cache opt-out](https://help.one.com/hc/en-us/articles/115005586269-How-can-I-disable-the-Varnish-cache) and used the PURGE mechanism from its [official plugin download](https://wpapi.one.com/api/v1.0/onecom-themes-plugins/download), inspected without installing or executing that plugin. A server-side, host-scoped regex PURGE for `portfolio.fuerst.one` returned `200 Purged`; subsequent ordinary HTTPS requests returned the intended 301/410 responses. No other host's cache or configuration was changed. Existing browser-cached copies cannot be recalled remotely.

No portfolio source or asset was deleted. Original configuration is retained both in the private local archive and remotely at `/customers/5/4/3/fuerst.one/httpd.private/seo-rollout-20261113/portfolio.htaccess.before`.

## Buchstabiene release

- Source revision: `bc4284726ce5cf7cd313b30f4306f128030aedcb`.
- Vercel project: `spelling-bee`, `prj_ceRNaldz9n3YdBK2Q3CNzFL8WcUU`.
- Production: `dpl_9HdVm4xL57xNxnVExDWkbhTcYWLr`, immutable URL `https://spelling-p5ox0galw-fuerstones-projects.vercel.app` (existing deployment protection applies).
- API confirmed READY, production target, source SHA and public aliases. Deployment used the clean worktree `/private/tmp/buchstabiene-seo-release-20261113`.
- The discontinued Node 20 project setting blocked the first deployment. Only `nodeVersion` was changed to `26.x`, after recording the original `20.x` setting. The subsequent production build succeeded. No application dependency, database, secret or domain setting was changed.
- Seven live checks passed: index/follow and canonical on the homepage; noindex/follow on `/spielen` and a dated game, solutions and highscores; correct dated canonicals; crawlable robots; sitemap containing only the homepage. Browser verification rendered the dated puzzle, navigation and letter controls.

Rollback: from the linked release worktree, `npx --yes vercel@65.15.0 rollback dpl_BigyPWYuKTTBFNzhDgRkjPKw4g3S --scope fuerstones-projects --yes`. Verify the production target and actual homepage/game responses afterward. The original runtime setting is checkpointed; restoring discontinued Node 20 is not a way to produce a new build.

## Search Console

Both canonical sitemap submissions were accepted and subsequently showed **Success** with last-read date 13 November 2026: `https://fuerst.one/sitemap.xml` discovered 50 URLs; `https://buchstabiene.fuerst.one/sitemap.xml` discovered one. A transient initial Buchstabiene "Couldn't fetch" status cleared to Success during this run. Removed the obsolete `http://fuerst.one/sitemap.xml` and `https://www.fuerst.one/sitemap.xml` submissions only after canonical sitemap success. These entries can be restored by resubmitting their exact URLs; removing a sitemap submission does not delete indexed pages.

Google accepted recrawl requests for the homepage, CV and named Konfig project page. The new CV URL was discovered through the sitemap and had not yet been crawled; its initial request returned a transient Google error. A subsequent Google live test reported "URL is available to Google", "Page can be indexed" and one valid ProfilePage item. After that successful live test, Google accepted the CV recrawl request too. The new Konfig URL initially showed "unknown to Google"; its priority crawl request was accepted.

Google's live smartphone inspection of `https://buchstabiene.fuerst.one/spielen/2026-11-13` reported crawl allowed, successful fetch and **Excluded by noindex tag**. It detected the intended dated canonical and the robots meta noindex directive; Request indexing was appropriately disabled. No index request was attempted for that excluded page. This establishes that Google's live crawler can read the directive; it does not prove that every previously indexed daily page has already been recrawled and removed.

The old portfolio homepage's stored Google record still showed indexed, as expected before recrawling. Its live smartphone test fetched successfully through the redirect and reported `https://fuerst.one/` as the user-declared canonical. Google then accepted a recrawl request for that old URL too: four accepted requests in total. No temporary removal request was submitted; the permanent portfolio redirects/410 responses and Buchstabiene noindex directives remain the lasting controls.

Google indexing changes are external crawl results, not established by sitemap or crawl-request success alone. No broad property removal is authorized or necessary.

## Validation and evidence

The eight applicable live homepage HTTP checks passed using ordinary DNS; three retry behavior tests passed separately in the main checkout with dependencies installed. The initial combined command in the detached release worktree could not load TypeScript for its unit tests; it was a test-environment failure, not an HTTP failure. No local-only Host-header test was run against public HTTPS.

Three actual image GETs returned 200 and nonempty PNG/SVG/JPEG bytes. Seven representative protected service URLs returned 200 after retirement, including Burger Loop, Kinoa, static video, a certificate PDF, Roadtrippin, Buchstabiene and Playlist Canvas. These are routing checks, not full authenticated application/database tests.

The final authoritative DNS snapshot checked 121 name/type pairs against the validated pre-cutover inventory. No protected record changed; differences are confined to the authorized apex/www records and SOA. In particular, folder-subdomain wildcard A/AAAA, mail, verification, nameservers and service records remain intact.

Private checkpoints, logs and screenshots are stored under `/Users/Alex/dev/01-fuerst-one/01-archive/hosting-inventory-2026-11-13/seo-finalization/`. The earlier full portfolio/mail archive, routing archive and DNS/service inventory remain available. Rollback of portfolio routing restores the exact saved file atomically and purges only that host's cache again. Alias rollback restores the saved domain settings; restore CV serving before restoring any incoming auto-cv redirect to it. Do not reset the DNS zone or change wildcard, mail, nameserver or DNSSEC settings.

## GitHub synchronization and indexing follow-up

The user subsequently authorized pushing the release commits and checking indexing after recrawling. The four homepage release/operations commits were pushed through `b8d44dfecef5508c71084c6e9884d0573f9fda5e`. Vercel's automatic deployment `dpl_3gthcmP1HvQNKrkeGuKyk71LodUt` reached READY with that exact revision. The application source is unchanged from the manual homepage release; unrelated uncommitted frontend work remains excluded.

Fetching Buchstabiene revealed an upstream commit missing from the local checkout: `a7256f7a89f89437ba5c486b2fd3a883c9ae5ab2`, which fixes login by calling credential checking directly instead of fetching the application itself. The initial SEO deployment had omitted that fix. A normal merge preserved both histories as `be75b3523ae3294f98c1d370c6356fb1c69f9d40`, and was pushed without force. All four authentication files match the existing upstream fix exactly; only the eight intended SEO files differ from the upstream application. The merged source passed TypeScript checking with incremental writes disabled.

The automatic Buchstabiene deployment `dpl_9ZqRhP2a2bD6cfmQctAyerTbTR9L`, `https://spelling-rmcv5vnnx-fuerstones-projects.vercel.app`, reached READY with merge revision `be75b3523ae3294f98c1d370c6356fb1c69f9d40`. Normal public HTTPS checks confirmed homepage/CV availability, permanent alias routing, the portfolio redirect, puzzle noindex and the authentication provider endpoint. A successful real-account login was not tested. The earlier `dpl_9HdVm4xL57xNxnVExDWkbhTcYWLr` checkpoint omits the upstream login fix; prefer the recorded original `dpl_BigyPWYuKTTBFNzhDgRkjPKw4g3S` if a return to the pre-SEO application becomes necessary.

The existing heartbeat was repurposed, rather than duplicated, as **Check Google indexing after SEO rollout** at 09:00 Europe/Berlin daily. It checks the stored Google index for the canonical CV/project URLs, portfolio consolidation and daily-puzzle exclusions, staying quiet on unchanged or stale reports. It stops once the changes are confirmed; if still unresolved on 27 November 2026 it reports the remaining state once and pauses. It performs no further hosting changes. Evidence for this follow-up is under `/Users/Alex/dev/01-fuerst-one/01-archive/hosting-inventory-2026-11-13/git-sync-followup/`.
