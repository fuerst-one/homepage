# Technical SEO follow-up

Scope: complete the technical gaps from the SEO/AIEO audit. Editorial copy,
comparison tables, external profile edits and visitor analytics remain separate.

- Reuse the public publication pipeline to carry validated source edit dates.
  Project dates come from the source project; case-study dates use the latest
  edit of that study and its project metadata. Never use sync time, project
  lifetime or a fabricated publication date.
- Add source-backed `lastmod` values for project and case-study sitemap entries.
  Keep dates absent for legacy snapshots and static pages without a reliable
  source date.
- Reuse the existing JSON-LD renderer for case-study Article, Person, project
  and breadcrumb entities. Derive the description from the published study
  body, and link the author to the existing person identity.
- Show localized source update dates on projects and case studies. Add the
  owner-confirmed Malt and freelancermap profiles to the existing identity links.
- Verify behavior with publication/schema/sitemap tests, type checks, scoped
  lint/format, and actual local HTML/browser checks. Preserve unrelated work.

## Validation and rollout

- 40 focused SEO, publication, sitemap, localization, navigation and package
  boundary checks passed. Eight database-backed worker integration checks passed,
  including unchanged refreshes preserving source edit dates.
- Workspace type checks, scoped ESLint and the web production build passed.
  A fresh worker package also loaded successfully with the new shared date helper.
- The local content sync published 49 projects and 32 studies with no deferred
  assets. English and German case studies were checked in the in-app browser;
  their localized bylines and source dates were visible.
- Scoped bugs, security, code quality and UI reviews returned no findings.
- Release requires the updated sync worker, a normal content sync, and the
  updated web application. No database migration is required. Older publications
  remain readable and omit dates until the updated worker publishes them.
- Implementation validation did not deploy production, edit external profiles or
  change visitor tracking. The Konfig workload contradiction remains editorial.
