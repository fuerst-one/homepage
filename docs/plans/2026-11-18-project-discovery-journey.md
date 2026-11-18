# Project discovery journey

Agreed direction: retain Experience Atlas as the portfolio explorer, retire the public Research Lab, and add useful context to existing project pages. The list modal becomes a brief preview with a prominent full-project link. Full pages reuse published case-study sections and show editorially explained related experience, including the limits of each comparison.

No new public page, publication schema, source sync or database changes. Existing lab components and the checkpoint at `69d5736` remain recoverable. Consider squashing the experimental checkpoint only after review; do not rewrite history automatically.

Connections start with reviewed examples: Konfig / Playlist-Canvas (visual editing), Konfig / Seabo (complex interfaces with different responsibility), Playlist-Canvas / Playlist-Stats (Spotify integration with different outputs), Seabo / ORA (logistics data with different workflows), and Conversion Y / Web Strategy Toolbox (research and improvement tools). Only currently published, locale-available projects can appear. Do not manufacture a connection for every project or expose similarity percentages.

Verification: behavioral unit tests for published-content excerpts and related-project eligibility; route checks; existing suite, types, lint and build; independent code/UI review; in-app browser checks for desktop, mobile and modal navigation.

## Result and acceptance

- Public `/en/lab/projects` and its German equivalent redirect to the Atlas; the Research Lab card/navigation and raw Atlas comparison disclosure are removed. Research components remain in source and the earlier checkpoint remains intact.
- The modal retains imagery, a brief description, role and a persistent action footer (full project, published case study, live site). No scale, taxonomy table, related experience or other content follows those links.
- Existing full detail pages reuse two complete paragraphs under headings from their locale-specific published case study. Detailed metadata sits in a disclosure. No source sync or publication schema changes were made.
- Five editorial connections span seven projects, in English and German. Each explains transferable work and the difference in scope. Connections only resolve among the currently published projects and available translations. Editorial wording should be reviewed if the source project facts change.
- Sources: existing published case-study paragraphs for Konfig and Seabo; published project descriptions and matching summaries for the Spotify projects, ORA, Conversion Y and Web Strategy Toolbox. Stable IDs were checked against the local publication; a regression test prevents confusing ORA with ROLLT!.
- Independent bugs/quality/UI reviews completed. A repeated accessible-link name was fixed. In-app browser checks covered desktop and 390 × 844 mobile, the modal-to-detail transition, related links, German content, and Atlas-to-detail navigation. Modal DOM confirms no details disclosures or related-experience section while retaining its case-study link.
- Verification: full suite 434 passing, workspace type checks, scoped ESLint and production build passed. The final ORA ID correction has an additional behavioral regression check; targeted tests rerun after that correction. Existing build warning about metadataBase remains outside this change.
- Preserved all four unrelated tracked diffs and 15 untracked checkpoint files byte-for-byte. No push, deployment or history rewrite.

Evidence screenshots: `/Users/Alex/.codex/visualizations/2026/11/17/01a1e9cf-fd06-74d2-8bab-a07ca973cdc2/project-journey/`.
