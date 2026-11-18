/**
 * Export published portfolio data and existing embeddings without source IO or paid work.
 * node --env-file=.env.production.local --import tsx scripts/export-project-lab-db.ts /private/tmp/homepage-lab-db.json
 */
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { knowledgeDatabase } from "../packages/database/src/database";
import type { PublicPublication } from "../packages/content/src/models";
import { publishedKnowledgeDocuments } from "../apps/sync/src/knowledge/publicationSource";

async function main() {
  const outputPath = process.argv[2];
  if (!outputPath || process.argv.length !== 3)
    throw new Error("Usage: export-project-lab-db.ts OUTPUT.json");
  const sql = knowledgeDatabase();
  try {
    const output = await sql.begin(
      "isolation level repeatable read read only",
      async (tx) => {
        const [published] = await tx<
          { payload: PublicPublication; refreshed_at: Date }[]
        >`SELECT payload,refreshed_at FROM public_content WHERE key='website-v3' AND payload->>'version'='3'`;
        if (!published) throw new Error("Public portfolio unavailable");
        const [sync] = await tx<{ synced_at: Date }[]>`
          SELECT synced_at FROM knowledge_sync WHERE id=1`;
        const documents = await tx<
          {
            id: string;
            project_id: string;
            title: string;
            locale: "en";
            href: string;
            hash: string;
            embedding_model: string;
            updated_at: Date;
          }[]
        >`SELECT id,project_id,title,locale,href,hash,embedding_model,updated_at
          FROM knowledge_documents WHERE locale='en' ORDER BY project_id`;
        const chunks = await tx<
          {
            id: string;
            document_id: string;
            content: string;
            embedding: string;
          }[]
        >`SELECT c.id,c.document_id,c.content,c.embedding::text AS embedding
          FROM knowledge_chunks c JOIN knowledge_documents d ON d.id=c.document_id
          WHERE d.locale='en' ORDER BY c.document_id,c.id`;
        const section = published.payload.locales.en;
        const publicProjectIds = new Set(section.projects.map((p) => p.id));
        const studyIds = new Set(
          section.projects.map((p) => p.caseStudyIds.en).filter(Boolean),
        );
        const expected = new Map(
          publishedKnowledgeDocuments(published.payload)
            .filter((d) => d.locale === "en")
            .map((d) => [d.id, d.hash]),
        );
        const exported = documents
          .filter((d) => publicProjectIds.has(d.project_id))
          .map((d) => ({
            id: d.id,
            projectId: d.project_id,
            title: d.title,
            locale: d.locale,
            href: d.href,
            contentHash: d.hash,
            matchesPublication: expected.get(d.id) === d.hash,
            embeddingModel: d.embedding_model,
            updatedAt: d.updated_at,
            chunks: chunks
              .filter((c) => c.document_id === d.id)
              .map((c) => ({
                id: c.id,
                content: c.content,
                contentHash: createHash("sha256")
                  .update(c.content)
                  .digest("hex"),
                embedding: JSON.parse(c.embedding) as number[],
              })),
          }));
        return {
          metadata: {
            exportedAt: new Date().toISOString(),
            publicationRefreshedAt: published.refreshed_at,
            knowledgeSyncedAt: sync?.synced_at ?? null,
            source:
              "public_content website-v3; existing EN knowledge chunks; read-only repeatable-read transaction",
            embeddingDimensions: 1536,
            expectedDocuments: expected.size,
            matchingDocuments: exported.filter((d) => d.matchesPublication)
              .length,
            missingDocumentIds: [...expected.keys()].filter(
              (id) => !exported.some((d) => d.id === id),
            ),
            embeddingInputFields: [
              "title",
              "description",
              "English case summary",
              "buyerNeeds",
              "aiCapabilities",
              "stages",
              "ownership",
              "maintenance",
              "published case-study body",
            ],
          },
          projects: section.projects,
          cases: section.cases,
          studies: Object.fromEntries(
            Object.entries(section.studies).filter(([id]) => studyIds.has(id)),
          ),
          documents: exported,
        };
      },
    );
    const destination = resolve(outputPath);
    await writeFile(destination, JSON.stringify(output), { mode: 0o600 });
    console.log(
      JSON.stringify({
        path: destination,
        projects: output.projects.length,
        caseStudies: Object.keys(output.studies).length,
        documents: output.documents.length,
        chunks: output.documents.reduce((n, d) => n + d.chunks.length, 0),
        matchingDocuments: output.metadata.matchingDocuments,
        expectedDocuments: output.metadata.expectedDocuments,
        missingDocuments: output.metadata.missingDocumentIds.length,
      }),
    );
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  // Connection errors may contain credential-bearing URLs; keep failure output bounded.
  console.error(
    error instanceof Error && error.message.startsWith("Usage:")
      ? error.message
      : "Project lab export failed; check database access and publication schema",
  );
  process.exitCode = 1;
});
