# Conservative bilingual answer reuse

The user prioritizes avoiding false answer-cache matches over cache hit rate.
Continue in the existing semantic-response-cache worktree. Preserve the shared
exact query-vector cache, one-year retention, daily pruning, consent and budgets.

## Decision

Use a fully anchored, explicit English/German grammar for shared public answers.
Only approved wording variants may share an intent. Keep broad topic requests
separate from explicit technology-usage requests. Negation, ownership, pricing,
time, quantities, comparisons, multiple topics and other qualifiers bypass answer
reuse, including exact answer reuse; their vectors can still be cached.

Support common German imperatives, hyphenated topic compounds, usage questions
and project overviews. Project-name matches must resolve to one public project
ID; case/whitespace/terminal-punctuation ambiguity across projects fails closed.

Generate eligible answers from a fixed localized question for the parsed intent,
so cached answers do not inherit incidental wording from the first visitor.
Resolve canonical project names unambiguously across all project IDs and restrict
overview evidence to the resolved ID. Compound terminal punctuation fails closed.
Continue requiring identical intent guard and context plus the existing vector
similarity check. Similarity never authorizes reuse across intents. Bump the
answer-cache namespace so earlier parsing/generation rules cannot leak through.
Keep older entries until their existing expiry rather than deleting retained data.

Exact-only answer reuse would reduce useful approved paraphrase hits. Increasing
the similarity threshold alone would still admit close but different meanings.
The explicit grammar provides a reviewable, bounded equivalence policy and
deliberately misses everything it cannot prove equivalent.

## Validation

1. Add English/German positive and adversarial phrase fixtures; observe current
   ownership/ambiguity and German-coverage failures before implementation.
2. Verify every approved group has one fixed generation question and different
   groups remain separate. Check ambiguous project names and punctuation.
3. Exercise the real service and PostgreSQL with identical vectors for every
   phrase, proving similarity cannot defeat intent separation. Rejected phrases
   must generate afresh without creating shared answer rows. Verify old scope
   isolation and generated provider question text.
4. Run focused tests, workspace types, lint and production build, then independent
   bugs/quality/security review. Smoke-test German requests against the local
   preview/providers without changing production settings.

This protects cache equivalence within the supported grammar. It cannot promise
the generated answer itself is always correct or comprehensively interpret
arbitrary natural language.

Real German smoke testing exposed an overconfident absence claim from partial
retrieval. The provider instruction now explicitly treats its six passages as a
subset and requires positive evidence to verify exclusions. Prompt version 3
invalidates both earlier v1/v2 answer scopes; the final live exclusion response
acknowledged insufficient evidence rather than asserting catalogue-wide absence.
