# Shared query and response cache

Build on `3a54761` in `codex/semantic-response-cache`. Keep the original dirty checkout untouched.

## Accepted scope

The user approved building and testing a shared persistent query-vector cache for the landing assistant and project search, plus exact and conservative semantic response reuse. Typing remains local; submitted requests still require current explicit consent and existing admission/rate limits.

## Design

- PostgreSQL holds query vectors (1536 dimensions), keyed HMACs and expiry, with original query text but without visitor identifiers. Both paths use the same cache. Model, dimensions and normalization version namespace entries. Conservative whitespace normalization preserves case and punctuation.
- Cache writes use transaction advisory locks to coalesce concurrent misses across server instances; a failed/aborted owner releases its lock. Cache failures fall through to ordinary bounded provider work where safe.
- Assistant answers have separate exact keys and a semantic guard, language, model/prompt version and content revision. Only explicit public portfolio query forms are eligible for shared response storage. Personal/free-form answers continue uncached; their query vectors and raw submitted text are retained with the query cache as requested. Cache raw structured answers with their public evidence, validate again before serving, never cache failures or ungrounded fallbacks.
- Semantic reuse requires an identical conservative meaning signature, matching context, and cosine similarity of at least 0.75. The [bilingual hardening](2026-11-18-bilingual-cache-hardening-design.md) uses fully parsed English/German public templates, keeps broad topics separate from explicit technology usage, and bypasses shared answers for negation, ownership and all other qualifiers. Project overview identities must be unambiguous and constrain evidence retrieval. Eligible generations use a canonical localized question; old answer scopes are invalidated. Exact hits skip both providers; approved semantic hits skip chat; both paths share vectors.
- All request quotas and enabled/consent checks remain active on hits. Record zero provider cost for full cache hits; sum known embedding/chat costs on misses and retain conservative reservations for unknown costs.
- One-calendar-year expiry from creation and no eviction of younger entries due to a size cap, with independent daily maintenance cleanup. Content revisions prevent reuse after source changes. App/indexer SQL grants are explicit.
- Update EN/DE disclosure and consent notice/version for original query text, query-derived vectors and reusable public answers. Withdrawal stops further processing and clears local state; shared entries expire with a privacy contact for earlier erasure and no claim of anonymity. Legacy entries retain their original expiry and cannot be silently extended under old consent.

## Work and validation

1. Add behavior tests showing exact reuse, shared vectors, strict semantic reuse, false-positive rejection, expiry/context isolation, cancellation and concurrent misses; observe failures first.
2. Implement database migration and shared cache helpers; wire both services, cost accounting and cleanup.
3. Update disclosures and receipt version, keeping the UI consistent.
4. Run unit tests, dedicated local PostgreSQL integration with synthetic provider responses, web build/typecheck/lint, and focused consent/browser checks. Measure avoided embedding/chat calls; no public AI-setting changes or deployment.
5. Review persistence, invalidation and privacy boundaries independently and resolve concrete findings.

## Alternatives

Memory-only caching does not survive serverless instances. A broadly permissive similarity-only cache can reuse opposite answers. This build uses durable storage with conservative misses instead.

## Threshold evidence

Real text-embedding-3-small scores: Show me React projects / Find React projects = 0.823; / Which projects use React = 0.772; / React Native projects = 0.894; / Projects without React = 0.792. Tell me about Konfig / What is Konfig = 0.904. A similarity-only threshold cannot distinguish these reliably. The accepted meaning guard is mandatory, and similarity is an additional check, rather than the equivalence decision on its own. The 10 fixed-query embedding calibration cost reported by the provider was USD 0.00000078.
