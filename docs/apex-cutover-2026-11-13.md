# Apex cutover — 2026-11-13

The user authorized moving the homepage to `https://fuerst.one` after the completed inventory and deployment. This operation changes apex/www hosting only. The existing production revision is `56d6b11e7eb5dabc037c1fb698b5279ae978705e`, deployment `dpl_JDr7v1gCXEBuE5o3cX6i45r2hHWr`.

## Path and service scope

| URLs                                                                                                     | Decision                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`, `/cv`, `/projects`, named project pages, contact/legal/privacy, API/images, robots/sitemap/llms.txt | Serve the already-deployed Next.js application directly at apex                                                                                                               |
| `www.fuerst.one`                                                                                         | Move to Vercel; use a temporary redirect to apex during verification                                                                                                          |
| `cv.fuerst.one`, `auto-cv.fuerst.one`                                                                    | Retain existing serving/redirect behavior through the DNS cache transition; metadata already names apex as canonical                                                          |
| The 18 folder-based subdomains, including burger-loop, kinoa, static, certificates, mail and portfolio   | Preserve wildcard A/AAAA and webspace files; keep each service's current host and path handling                                                                               |
| Old apex folder paths such as `/burger-loop/`, `/kinoa/`, `/static/`, `/mail/`                           | Already forwarded to the CV application before cutover. Continue using the same application routing; no migration, reverse proxy or new exposure of old PHP/backup/shop paths |
| Legacy portfolio `/img/...` and apex mail references                                                     | Existing references are recorded in the inventory. They are outside this DNS-only cutover; no mail endpoint is invoked or newly proxied                                       |
| Coolify/Vercel/Heroku services, mail DNS, FTP/SSH, nameservers and DNSSEC                                | Preserve existing records and service configuration                                                                                                                           |

This preserves the existing folder-subdomain URLs. It does not claim that already-broken historical apex folder paths have been repaired. No project files, archives or databases are moved or deleted.

## Checkpoints and intended changes

Private evidence directory:

`/Users/Alex/dev/01-fuerst-one/01-archive/hosting-inventory-2026-11-13/apex-cutover/`

Fresh production/domain snapshot and validated authoritative DNS baseline are saved there. The baseline validates response status for 121 name/type queries; initial fast-query output was incomplete and must not be used as the rollback reference. Use `dns-before-validated.json`.

Vercel accepted ownership verification for apex and www. Its per-domain configuration recommends apex A `216.198.79.1` (also lists `64.29.17.1` at rank 1) and www CNAME `97f2958ff02e1fa8.vercel-dns-017.com`. Use one recommended apex IPv4 and TTL 600, one.com's minimum. Do not add an apex AAAA pointing to one.com.

Before cutover, apex/www are Web forwards to `https://cv.fuerst.one/`, external mode, masking off, A `46.30.213.31` with TTL 3600. Their standard A/AAAA toggles are off. Wildcard A `46.30.213.9` and AAAA `2a02:2350:5:10a:4c:7fae:c0d8:9312` remain enabled.

CV must continue to serve while cached apex DNS may still reach the old forwarder. Immediately redirecting CV back to apex could create a loop for those visitors. Permanent alias redirects are a later step after the old DNS/forwarding cache window has elapsed and been checked.

## Rollback

Keep the apex Vercel binding operational while any DNS resolver may still send traffic to it. Restore apex and www Web forwards to `https://cv.fuerst.one/`, external mode, masking off; remove only the custom A/CNAME introduced here and restore the four standard apex/www A/AAAA toggles to their saved off states. CV remains available as the fallback throughout. Do not reset DNS, replace nameservers, change wildcard/service records, or restore webspace files as part of DNS rollback.

Validate authoritative DNS, actual HTTPS/root/nested/query responses, API and images, and compare every preserved record with the validated baseline. Cached answers do not change instantly. Original TTL is 3600 seconds; the provider also warns forwarding updates may take 90 minutes. Remove unused new Vercel domain bindings only after traffic no longer depends on them.

## Result and validation

**Apex cutover completed.** `https://fuerst.one/` serves the production application directly with 200 and a valid Let's Encrypt certificate. `www` returns 307 to apex, preserving the checked nested path and query. Production remains `dpl_JDr7v1gCXEBuE5o3cX6i45r2hHWr`; no application redeployment was necessary.

Applied one.com settings:

- Removed the saved domain-wide apex/www Web forward using the Redirect control. The individual record editor had first rejected removal with provider errors and left it present; no repeated failing mutation was used.
- Added apex A `216.198.79.1`, TTL 600.
- Added www CNAME `97f2958ff02e1fa8.vercel-dns-017.com`, TTL 600.
- Confirmed standard apex/www A/AAAA toggles are disabled. Both wildcard IP families and all other DNS settings remain as inventoried.

The 121-query comparison found changes only in apex A, www routing and the SOA serial. No protected wildcard, mail, verification, service or nameserver record changed. Cloudflare's recursive resolver returned the new apex A with DNSSEC's authenticated-data flag. A normal HTTPS request using public DNS over HTTPS returned Vercel 200 directly.

Vercel's legacy global domain record belongs to the user's personal account, while the project belongs to `fuerstones-projects`. The native CLI alias command rejected that ownership scope. The supported project alias API activated the verified domains successfully. **No domain ownership, registrar or nameserver move was performed.** The old expired Vercel certificate was replaced by a valid one (2026-11-13 through 2027-02-11). Initial checks caught certificate propagation in progress; final validated HTTPS requests passed without bypassing certificate checks.

Final automated run: 11 applicable checks passed, zero failures. These cover public APIs, server-rendered pages, metadata/canonicals, sitemap and project discovery, JSON-LD, robots/llms.txt, print noindex, and the existing retry helper. Verification temporarily resolved apex to its published Vercel IP within the test process while retaining normal HTTPS hostname/SNI and certificate validation, because the system resolver still cached the previous forwarder. The local-only Host-header test was excluded. The temporary preload is an evidence artifact, not production code.

Avatar, project logo and screenshot GETs returned 200 with nonempty image bytes. Seven representative preserved service URLs returned 200: Burger Loop, Kinoa, the static video, a real certificate PDF, Roadtrippin, Buchstabiene and Playlist Canvas. These are routing checks, not full application/auth/database tests.

The in-app browser returned `ERR_BLOCKED_BY_CLIENT` for apex preview navigation; no browser security or client filtering setting was bypassed. The unchanged application's visible UI was verified on the CV deployment during the preceding release. Applied DNS screenshots and direct/public-DNS HTTPS evidence are saved with the checkpoint.

`cv.fuerst.one` deliberately continues serving 200 and `auto-cv.fuerst.one` retains its existing 307 to CV during propagation. Do not immediately redirect these back to apex while cached apex DNS can still reach the old CV forwarder. Permanent alias consolidation remains pending until the old TTL/forwarding cache window has elapsed and been checked. The existing apex canonicals already identify the preferred address during this transition.

No one.com webspace file, project application, archive, database, Coolify resource, Buchstabiene deployment or Search Console setting was changed by this cutover.
