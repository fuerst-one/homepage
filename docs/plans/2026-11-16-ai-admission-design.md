# Controlled public AI rollout

User-authorized implementation and production release, 16 November 2026.

## Design

Use an administrator-managed `settings` table (`key`, JSONB `value`, `updated_at`).
AI settings have a typed, bounded parser. Missing keys use conservative defaults;
invalid values or inaccessible storage fail closed. Web/indexer roles can read
settings, but cannot change them. No public settings-write endpoint or new UI.

Before paid work, reject known automated request signatures and obvious malformed
or prompt-extraction payloads. These are heuristics, not proof a visitor is human.
Ordinary website crawling/search stays available. A keyed IP lottery admits 25%
by default, stable in a configurable 24-hour window, without another cookie or
browser identifier. Shared IPs share eligibility. Both status and POST enforce
eligibility, including direct API calls; excluded visitors get local suggestions.

Use the existing PostgreSQL advisory-lock transaction for shared budgets,
visitor/global request caps, concurrency and separately bounded synthetic probes.
The database pause switch takes effect without a web rebuild. Environment release
switches remain an outer safety gate. Persist admission counts by hour/reason only,
without question text, raw IPs or new visitor records. Worker maintenance deletes
expired usage and aggregate counters independently of paid requests.

## Execution and acceptance

1. Write failing behavior tests for settings validation, stable lottery, screening,
   direct API enforcement and global/probe quota admission.
2. Add additive migration 008, shared policy and admission, reuse current chat,
   consent, status and fallback components. Update EN/DE notices and operations.
3. Run focused tests, real local database concurrency/permission/retention checks,
   full tests, workspace types/lint/build and browser acceptance. Review bugs,
   security and quality; fix findings.
4. Back up production, apply additive migrations, deploy exact committed worker
   and web revisions, preserve deployment holds, and verify live state.
5. Activate with explicit consent, 25% eligibility and conservative caps only after
   unresolved OpenRouter account/DPA checks are confirmed. If owner action remains,
   deploy the complete implementation with `ai.enabled=false`, report that exact
   remaining blocker, and do not claim public activation.
