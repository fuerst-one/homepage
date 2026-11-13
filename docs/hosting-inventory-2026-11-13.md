# Hosting inventory and rollback gates — 2026-11-13

This is the preserved pre-migration inventory. Subsequent authorized operations are recorded in the [deployment receipt](deployment-2026-11-13.md) and [apex cutover receipt](apex-cutover-2026-11-13.md); the baseline settings below are retained for rollback.

Status: **read-only inventory complete for the one.com control panel/webspace, all 12 projects in the accessible Vercel team, and the accessible Fürst One Coolify instance. Rollout remains paused.** This is a configuration and dependency inventory, not a functional certification of every old application. No live files, DNS records, forwarding, domains, deployments, or Search Console settings were changed during this inventory.

## Evidence and backup location

Private, persistent archive, outside the website repository:

`/Users/Alex/dev/01-fuerst-one/01-archive/hosting-inventory-2026-11-13/`

The directory is mode 0700 and its files are mode 0600. It contains account configuration snapshots and legacy source that may contain credentials; do not publish or commit it. No API tokens were added to this repository.

| Artifact                                                                  | Coverage                                                                                                                                 |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `onecom-files-manifest.txt`                                               | Every regular webspace file: path, size, timestamp; live SHA-256 hashes for all `.htaccess` files                                        |
| `onecom-tree.txt`, `onecom-detail.txt`, `onecom-entrypoints.txt`          | Folder sizes, entry files, symlinks, existing backup filenames and dates                                                                 |
| `onecom-routing.tar.gz`                                                   | Exact Apache, robots.txt and sitemap.xml files throughout the webspace                                                                   |
| `onecom-portfolio-mail.tar.gz`                                            | Complete live `portfolio/`, shared `mail/`, and root `.htaccess`; about 64 MiB compressed, 588 archive entries                           |
| `routing-restore-verification.json`                                       | All 34 archived `.htaccess` files match separately retrieved live hashes                                                                 |
| `portfolio-backup-verification.json`                                      | Portfolio routing hashes, archive entry counts, and legacy fuerst.one URL references                                                     |
| `fuerst-dns-full.txt`, `dns-toggles.json`                                 | All personal DNS settings and expanded standard records with enabled states                                                              |
| `dns-authoritative.json`                                                  | Authoritative answers, TTLs and empty answers for the inventoried names; initial UDP timeouts were retried using IPv4 TCP                |
| `fuerst-forwarding.txt`, `forwarding-options.json`                        | Apex/www target and forwarding mode                                                                                                      |
| `fuerst-nameservers.txt`, `fuerst-dnssec.txt`, `fuerst-secondary-dns.txt` | Nameserver, DNSSEC and secondary DNS configuration                                                                                       |
| `vercel-routing.json`                                                     | All 12 projects: domain bindings/redirects, production targets, deployment IDs, repository/branch and runtime settings                   |
| `coolify-routing.json`                                                    | Servers, applications, Compose host references, services and their public routes, databases and project IDs; excludes environment values |
| `http-before.json`, `http-rechecks.json`                                  | HEAD responses for all folder hosts, configured service hosts and corresponding apex folder paths                                        |
| `public-project-host-references.json`                                     | fuerst.one URL references from all 38 production-built project HTML pages                                                                |
| `SHA256SUMS`                                                              | Local artifact integrity hashes                                                                                                          |

Validation: routing files were compared with live SHA-256 hashes, and both gzip archives were integrity-tested. This is not a destructive restore rehearsal. There is no new full-webspace or current database dump. Other webspace folders and all databases are outside the proposed changes and must stay untouched. The remote backup directory contains website/mail/database archives dating from 2019 and 2022; their existence does not establish current recovery coverage.

## one.com DNS and forwarding

Nameservers remain `ns01.one.com` and `ns02.one.com`; DNSSEC is active. Secondary DNS has no primary address configured. **Do not replace nameservers or disable DNSSEC.** Domain-wide forwarding applies to apex and www, in external website mode, with URL masking off:

`https://cv.fuerst.one/`

Observed HTTP and HTTPS root responses are 302. A folder path such as `/burger-loop/` currently becomes `https://cv.fuerst.one//burger-loop/`. These apex paths already bypass the webspace today.

| Name                                                                         | Current configuration                                              | Treatment                                                                |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| apex and www                                                                 | Web forwards; live A `46.30.213.31`, TTL 3600; no published AAAA   | Only potential DNS/forwarding migration candidates; still paused         |
| `*`                                                                          | A `46.30.213.9`, AAAA `2a02:2350:5:10a:4c:7fae:c0d8:9312`, TTL 900 | Preserve both; these serve folder subdomains                             |
| `*.dev`                                                                      | A `168.119.225.236`                                                | Preserve                                                                 |
| `conversion-y`                                                               | A `178.105.73.225`                                                 | Preserve                                                                 |
| `konfig-test`                                                                | A `159.69.245.181`                                                 | Preserve; separate host                                                  |
| `roadtrippin`, `roadtrippin-api`, `roadtrippin-yjs`                          | A `168.119.225.236`                                                | Preserve                                                                 |
| `cv`, `auto-cv`                                                              | CNAME `97f2958ff02e1fa8.vercel-dns-017.com`                        | Preserve until apex is verified; later alias changes are a separate step |
| `buchstabiene`, `playlist-canvas`, `playlist-stats`, `working-day-countdown` | CNAME `cname.vercel-dns.com`                                       | Preserve                                                                 |
| `personal-os`                                                                | CNAME `0b3155c3fcf87016.vercel-dns-017.com`                        | Preserve                                                                 |
| `serp-api`                                                                   | CNAME `rocky-brook-ym5q3voxsuit2spjdxocpo3u.herokudns.com`         | Preserve                                                                 |
| `web-opt`                                                                    | CNAME `floral-velociraptor-wlp59xh157ccmxf5fu64vkzc.herokudns.com` | Preserve                                                                 |

Mail: four MX records at priority 10, `mx1` through `mx4.pub.mailpod14-cph3.one.com`, TTL 10800. Preserve all MX, verification TXT, FTP/SFTP/SSH A/AAAA, CalDAV SRV and SSHFP settings. The standard SPF TXT and DMARC TXT toggles are currently off; that is the baseline, not a requested change. Personal Google verification and both Conversion-Y verification TXT records are captured privately. Apex/www standard A/AAAA toggles are off while provider forwarding is active; do not simply enable standard records and assume they target Vercel.

## one.com webspace

Document root: `/customers/5/4/3/fuerst.one/httpd.www`. The wildcard resolves folder subdomains to one.com independently of apex/www. Changing only apex/www records need not move these applications. Folder paths on apex are a separate compatibility problem.

| Folder / matching subdomain   | Approx. allocated KiB | HTTPS HEAD baseline                                                        |
| ----------------------------- | --------------------: | -------------------------------------------------------------------------- |
| arider-configurator-prototype |                  7396 | 200                                                                        |
| backup                        |                 54728 | 403                                                                        |
| bubble-ui                     |                   180 | 200                                                                        |
| burger                        |                 10180 | 200                                                                        |
| burger-loop                   |                 11964 | 200                                                                        |
| buttons                       |                    24 | 200                                                                        |
| certificates                  |                   152 | 403                                                                        |
| conversion-y-test             |                    52 | 200                                                                        |
| hochzeit                      |                   240 | 200                                                                        |
| kinoa                         |                 21924 | 200                                                                        |
| kleineralsraute               |                    16 | 200                                                                        |
| kleineralsraute-shop          |                507524 | 200 on slow recheck                                                        |
| konfig                        |                     8 | 200 on slow recheck                                                        |
| mail                          |                   512 | 200 on slow recheck                                                        |
| mouse-track                   |                  3984 | 200 on slow recheck                                                        |
| portfolio                     |                 89028 | 200                                                                        |
| static                        |                 92968 | 403 on slow recheck; directory status says nothing about individual assets |
| wst                           |               5056520 | 403                                                                        |

There are 18 top-level folders, plus `kleineralsraute.zip` and `shopware.zip` archives, and the root `.htaccess`. The webspace is roughly 6 GiB. Initial concurrent checks triggered some 429 responses; slow rechecks resolved them. HTTP 200 here establishes routing, not working authentication, database access, forms, or gameplay.

Root `.htaccess` currently redirects only www to `https://portfolio.fuerst.one/$1` with 301. Provider forwarding currently takes precedence. If forwarding is removed while www still reaches Apache, that older rule becomes relevant again.

Portfolio has HTTPS/www normalization, an SPA index fallback, 404-to-index behavior, and long cache lifetimes. The prepared `ops/portfolio-retirement.htaccess` is **not installed**. Source also exists in `01-archive/fuerst-one-portfolio`; the new live archive is authoritative for exact restoration.

Legacy portfolio files reference `https://fuerst.one/img/...`, `/mail/mail.php`, old legal/contact pages and retired experiments. The `static/` folder contains a video and an ONNX model. `certificates/` contains a PDF. These paths/assets must not be swept into a generic portfolio redirect or deleted. No mail endpoint was called or form submitted during inventory. The earlier `onecom-mail-endpoints-2026-10-28` backup remains separate; rollback must use today's live snapshot rather than restoring older mail code blindly.

## Vercel

Team: `fuerstones-projects`. All 12 projects and their domain bindings are in the private snapshot. Six projects have seven fuerst.one aliases: auto-cv (two aliases), spelling-bee, personal-os, playlist-canvas, playlist-stats and working-day-countdown. The other six are rollt-prototype, ora-frontend, public-searoutes, nautic-internet, katzenbaer and yolov8-x-view-web.

| Project      | Current production rollback target                                                       | Domain behavior                                                       |
| ------------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| auto-cv      | `dpl_7TAHARKPerYdoTBuVZVfnpquHC1t` / `auto-p6rvnnab9-fuerstones-projects.vercel.app`     | `cv.fuerst.one` serves; `auto-cv.fuerst.one` redirects to cv with 307 |
| spelling-bee | `dpl_BigyPWYuKTTBFNzhDgRkjPKw4g3S` / `spelling-rlku20e7i-fuerstones-projects.vercel.app` | `buchstabiene.fuerst.one` serves; vercel.app alias also exists        |

Both targets date from 2026-07-17. Apex/www are not attached to auto-cv. Homepage environment keys cover the existing Notion token/database/owner/signup configuration; Buchstabiene has existing auth, encryption, URL and Postgres configuration. No environment or database changes are needed for the indexing changes.

Current service HEAD responses: cv, Buchstabiene, both playlist apps, countdown are 200; personal-os redirects to `/login`. Deployment upload attempts made earlier in this session created no deployments because CLI 39.1.2 was rejected as outdated. Do not retry or upgrade as part of this inventory.

## Coolify and other services

The existing Fürst One API was accessible through Tailscale. Version 4.1.3; two registered servers, 11 applications, four service resources, one standalone database, 10 projects. The private snapshot records IDs and route declarations; no applications, proxy settings, environment variables, containers, volumes or databases were changed.

| Dependency               | Observed route / state                                                                          | Migration implication                                              |
| ------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Roadtrippin frontend     | `roadtrippin.fuerst.one`, healthy                                                               | Preserve A and Compose routes                                      |
| Roadtrippin Laravel      | `roadtrippin-api.fuerst.one`, running:unknown                                                   | Preserve; existing API status is not a new migration failure       |
| Roadtrippin Yjs          | `roadtrippin-yjs.fuerst.one`, healthy                                                           | Preserve; HEAD 200 does not test WebSockets                        |
| Roadtrippin infra        | healthy, no public route                                                                        | Keep volumes and internal network unchanged                        |
| Conversion-Y app         | `conversion-y.fuerst.one`, running:unhealthy                                                    | Preserve; root HTTP baseline is 200                                |
| Conversion-Y infra       | healthy, no public route                                                                        | Keep storage/network unchanged                                     |
| BuchstaBiene Postgres    | standalone database, healthy                                                                    | Required by Vercel-hosted Buchstabiene; do not move or recreate it |
| Playlist apps on Coolify | separate `fuerst-one.dev` routes, healthy                                                       | Distinct from the Vercel `.fuerst.one` routes                      |
| Other resources          | Arider test, plasma, housing hunter, NocoDB, Tailscale services and OpenClaw have exited states | Inventoried; do not restart or clean up as part of SEO             |

`konfig-test.fuerst.one` returns 404 at root on its separate IP. Its underlying account/proxy configuration was not inspected; it is excluded from changes. `serp-api.fuerst.one` has an existing TLS handshake failure; no certificate bypass was used. `web-opt.fuerst.one` returns 200. Heroku account settings were not inspected. The one.com panel and existing resource listings define this inventory's scope; it is not proof that no unlisted historical hostname exists.

## Search Console baseline

Earlier read-only inspection in this session: domain property `sc-domain:fuerst.one`, report updated 2026-11-09, 50 indexed pages. Outdated portfolio routes and many dated Buchstabiene game/solution/highscore pages are included. Three stale apex/www/HTTP sitemap submissions report errors. No removal requests were present in the last six months. No submissions, removals or deletions were made.

## Change and rollback gates

1. **Decide path compatibility before deployment.** List which old apex paths should redirect to the matching folder subdomain, which asset paths must remain available, and whether any shared mail endpoint still needs apex requests. Verify a real file under static/certificates and needed nested SPA routes. Do not blindly redirect POST requests to a form endpoint or redirect backup/shop archives into public navigation. The old portfolio retirement rules need review against this matrix.
2. **Prepare staging with the exact reviewed commit.** Homepage `c78f5c5366761ac2b3580aa3cfca99494cf11821`; Buchstabiene `bc4284726ce5cf7cd313b30f4306f128030aedcb`. Clean release worktrees are retained in `/private/tmp/fuerst-homepage-release-20261113` and `/private/tmp/buchstabiene-seo-release-20261113`. Keep existing Notion/auth/database environments. The homepage's unrelated root-layout widget edit must remain outside release changes.
3. **Record a fresh checkpoint immediately before each live action.** Refresh deployment target/domain bindings and exact DNS settings; compare with this snapshot. Abort on drift. Obtain Vercel's actual per-domain DNS requirements; no guessed target IPs. Create only the intended apex/www bindings, retaining all service aliases. Make one reversible change at a time and record old/new values, timestamp, verification and undo action.
4. **DNS/forwarding rollback:** restore apex and www Web forward records to `https://cv.fuerst.one/`, external mode, masking off. Restore the captured standard toggle states, removing only records introduced by the migration. Do not reset the zone. Check authoritative answers return A `46.30.213.31`, no AAAA, and the original 302 behavior. Confirm wildcard A/AAAA and all preserved records still match. Current apex TTL is one hour; one.com warns forwarding updates may take 90 minutes. Rollback cannot instantly clear resolver/browser/CDN caches. Keep both old and new destinations operational during that interval.
5. **Alias rollback:** first remove any new cv/auto-cv-to-apex redirect so cv can serve the previous site independently. Reassign production aliases to the captured deployment IDs if app deployment changed; verify raw HTML, assets, API and HTTPS. Restore `auto-cv` to its original 307 redirect to cv. Do not remove a domain binding before DNS/forwarding no longer sends traffic there. Each release needs a freshly verified rollback target; July's IDs are the current baseline, not a permanent assumption.
6. **Apache rollback:** only change `portfolio/.htaccess` if retiring that subdomain. Upload a temporary sibling file, check its bytes/hash, preserve ownership/mode, then rename atomically. On failure, atomically restore the exact member `./portfolio/.htaccess` from `onecom-routing.tar.gz`, verify its stored hash and recheck HTTPS, a known route and asset. Do not extract the whole archive over the webspace. The root `.htaccess` must remain untouched unless separately planned; its exact backup exists. No site deletion is required.
7. **Use temporary redirects while validating routing.** Permanent 301/308 responses may be cached by clients and crawlers; restoring server configuration cannot recall them immediately. Only finalize permanent redirects after checking representative root/nested/query URLs, assets, forms and both IP families. Keep backups and old content available throughout recrawling.
8. **Buchstabiene rollback:** repoint production aliases to `dpl_BigyPWYuKTTBFNzhDgRkjPKw4g3S` if a later SEO deployment fails. Do not change its Coolify database. Validate gameplay and auth separately from metadata. The desired change is noindex/follow on game pages, with homepage still indexable; not deleting game data or blocking crawling.
9. **Search Console last:** submit only verified public sitemaps and inspect rendered directives after live routing works. Avoid bulk removals or property deletion. Any later temporary removal must be separately scoped and logged with its cancellation path; deployment rollback does not cancel a Search Console request or instantly restore indexing.

For local source rollback, the pre-SEO commits are homepage `62ae2318afcb67f1ed41f2f33c8c23bb2c6d2e0f` and Buchstabiene `0418a21af406a7dd721dfa3677918722e94eddea`. Use a scoped revert or a clean release worktree; never `reset --hard` the user's working directory.

No live migration should resume until gate 1 has a concrete path/asset/form matrix and the user has reviewed the resulting scope. This inventory intentionally stops before that migration.
