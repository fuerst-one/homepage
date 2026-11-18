# Project-list search

The English and German project lists now reuse the landing-page matcher. Typing
searches public descriptions, project names, all public facets and the curated
bilingual case vocabulary. Results use the existing cards and intersect with
the active filters. Clearing the query restores the filtered list. Search text
stays in page memory and is not added to URLs.

The search UI uses the same shared glass panel, black input background, neutral
text and white focus treatment as the existing project filters. It reuses the
shared button, with an inline accessible clear control and stacked actions on
narrow screens. There are no search-specific accent colors.
Result feedback appears only during a search, without a separate divider.

“Search by meaning” explicitly requests additional matches. It embeds the query
through the existing OpenRouter/Azure route, then combines vector similarity
and lexical relevance in PostgreSQL. It generates no answer and requires no
chat model or chat health probe. Results are deduplicated by project and joined
back to the projects already available to the page. Exact project names and
explicit technical/delivery constraints retain their existing matching rules.

The public embedding projection now includes tools, capabilities, methods,
languages, industries, product formats, customer markets, usage contexts,
delivery models, clients, work arrangements and every public case dimension,
alongside the existing descriptions and published case-study content. A change
to those fields changes the document hash and triggers normal reindexing.

Semantic controls and hints are hidden until a current AI permission exists.
Without permission, typing and Enter use local search and never open an AI
consent prompt. Visitors can opt in through the optional homepage assistant;
the project list does not solicit permission. Search-only receipts carry
`scope: "search"`; the assistant rejects these
receipts until the visitor separately authorizes answer generation. Existing
broader assistant receipts also cover retrieval. Withdrawal applies to both
surfaces, aborts pending work and removes semantic results. Queries are bounded,
same-origin JSON POSTs, protected by the existing BotID registration, admission
and durable usage budgets. An unavailable provider, paused AI, exhausted budget
or stale index leaves local search usable.

Query embeddings must use the same model as the stored project embeddings.
The current index uses `openai/text-embedding-3-small` with 1536 dimensions.
Vector comparison itself is performed locally on the server. Replacing the
provider with a local embedding model would also require rebuilding the project
index with that model; stored vectors alone cannot encode a new query.

## Validation

- Production build, TypeScript, scoped ESLint and formatting checks pass.
- The initial full suite passed 317 tests against the production build on port 6888.
- The consent-visibility follow-up passes 33 focused tests, four browser checks,
  the production build, TypeScript, scoped ESLint and formatting checks. Fresh,
  declined, expired and outdated choices show local search only; Enter neither
  sends an embedding request nor opens a permission prompt.
- Browser checks cover English/German local search, facet composition,
  clearing, 320px layout, valid opt-in, semantic matches, repeated submission,
  focus restoration, withdrawal, expired/declined/outdated choices and
  provider-error fallback. Provider responses
  are intercepted in these browser checks.
- The configured local index was rebuilt successfully: 98 documents, 142 chunks.
  A separate read-only database integration check exercises the actual retrieval
  SQL with a real stored vector, including ranking and project deduplication.
- Public AI admission currently uses its conservative paused default. Its
  settings and budgets were not changed. Visitor query embedding through the
  public endpoint was therefore checked with controlled provider responses,
  while the index rebuild used the configured embedding provider.

No commit or deployment is included. Production needs the updated application
and the normal knowledge-index synchronization before it can use the expanded
embedding projection.
