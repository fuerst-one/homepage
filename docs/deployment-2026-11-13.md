# Homepage deployment — 2026-11-13

Subsequent operation: the separately authorized [apex cutover](apex-cutover-2026-11-13.md) made `https://fuerst.one` live on this same production revision. The receipt below records the earlier application deployment and its rollback checkpoint.

The user authorized redeploying the website after the hosting inventory. Production is live at [cv.fuerst.one](https://cv.fuerst.one). This release uses the existing Vercel project and domain bindings; it does not perform the apex migration.

## Released revision

- Project: `auto-cv`, team `fuerstones-projects`.
- Commit: `56d6b11e7eb5dabc037c1fb698b5279ae978705e`, including SEO/header commit `c78f5c5366761ac2b3580aa3cfca99494cf11821`.
- Production deployment: `dpl_JDr7v1gCXEBuE5o3cX6i45r2hHWr`.
- Immutable deployment URL: `https://auto-rcp259krt-fuerstones-projects.vercel.app` (subject to existing Vercel deployment protection).
- API verified `READY`, `aliasAssigned: true`, production target matching the deployment, and matching `gitCommitSha` and `githubCommitSha`, at 17:54 UTC.
- `cv.fuerst.one` serves directly; `auto-cv.fuerst.one` retains its 307 redirect to cv. The domain configuration matches the pre-deploy checkpoint.
- Deployed from clean detached worktree `/private/tmp/fuerst-homepage-release-20261113` using Vercel CLI 65.15.0. The unrelated local root-layout widget edit and uncommitted documentation were excluded. Commits were not pushed to GitHub.

The first successful deployment of `c78f5c5` was `dpl_GZP3tCKf7YafPCdwukPvATDpsD33`. Live checks exposed cold Notion requests hitting the existing ten-second function limit and Notion 429s on image lookups. The final revision configures API functions for 60 seconds and reuses the existing bounded Notion retry helper for image lookup, with no-store fetches inside the existing URL cache. [Vercel's duration configuration](https://vercel.com/docs/functions/configuring-functions/duration) documents this function configuration.

## Validation

- Both Vercel production builds completed; final source type check, scoped ESLint and formatting passed.
- Independent focused bug, quality and security reviews of the runtime delta returned no findings.
- Final live test run: **11 passed, zero failed**. Includes three retry behavior tests and public profile/project API, server-rendered content, metadata/canonicals, sitemap/discovery links, structured data, llms.txt and print noindex checks. The Host-header spoofing test is local-only and was excluded over HTTPS; it passed during prior local validation.
- Direct avatar, project logo and screenshot requests returned 200 with image content types and nonempty bytes.
- Browser verification of the named Konfig project page found no console errors. At 649 px, the portrait rendered square (86 × 86 px), with no horizontal overflow. Temporary viewport override was reset.
- Apex project URLs still reach the matching cv page through the existing forwarding/normalization chain. The Open Graph image returned 200 PNG. Existing alias redirects preserved query parameters in the checked URL.

Evidence logs and screenshot are copied to the private archive below. Indexing or ranking changes are not established by deployment checks.

## Rollback

Fresh pre-deployment checkpoint:

`/Users/Alex/dev/01-fuerst-one/01-archive/hosting-inventory-2026-11-13/homepage-predeploy-checkpoint.json`

Original production target: `dpl_7TAHARKPerYdoTBuVZVfnpquHC1t`, `auto-p6rvnnab9-fuerstones-projects.vercel.app`.

If restoration is needed, confirm the selected project and checkpoint, then run from the linked release worktree:

```sh
npx --yes vercel@65.15.0 rollback dpl_7TAHARKPerYdoTBuVZVfnpquHC1t --scope fuerstones-projects --yes
```

The CLI rollback syntax was checked with `--help`; no rollback was executed. After any rollback, verify the production target ID, existing alias/redirect settings, homepage/CV HTML, an image, API availability and HTTPS. DNS remains unchanged, so this release needs no DNS rollback. The prior deployment and clean worktree are retained.

The deployment receipt and post-deploy provenance are preserved alongside the inventory. No one.com files, DNS, forwarding, Coolify resources/databases, Buchstabiene deployments or Search Console settings were changed. Those migration steps remain separately paused.
