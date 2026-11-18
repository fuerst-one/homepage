# Delivery and operation migration

The owner approved reframing the entire Delivery model column as Delivery & operation for all projects, and keeping the website compatible. They also approved Design handoff for concept-only deliverables.

- Preserve the existing Notion property ID, rename it, and convert it to multi-select through the in-app browser. Review all 53 records, including the four hidden records; preserve visibility and unrelated properties.
- Controlled tags: Hosted access; Self-hosted; Local installation; Package / source distribution; Embedded integration; Physical build; Professional service; Design handoff.
- These describe the delivered access/operation pattern, including historical work. They do not establish current hosting, deployment, production readiness, licensing, price, ownership, or maintenance.
- Use a private per-project manifest rather than globally replacing SaaS or Free Service. Keep source snapshots and migration records in the ignored local data directory.
- Publish an additive deliveryModels array; retain deliveryModel as a deprecated string/null first-value projection. Continue reading the old field name/type and cached scalar publications during rollout. An explicitly empty new field takes precedence over old values.
- Reuse existing metadata, filters, tags, and search components. Existing singular filter URLs inspect all delivery tags. Also accept deliveryModels in web/API URLs. Translate the new vocabulary in German.
- Update source review, publication, API facets/OpenAPI, text/landing search, and knowledge text projection. Do not run paid embedding refreshes.

## Progress

- [x] Live browser review and read-only source snapshot of all 53 projects.
- [x] Behavioral regression tests failed on the old implementation.
- [ ] Website compatibility checks and review.
- [ ] Browser schema and per-project data migration, followed by read-only verification.
- [ ] Refresh normal publication and verify the visible website in both languages.
- [ ] Record final validation and release status.
