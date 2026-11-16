import { writeIndexPublication } from "./publicationIndex";
import { chunkKnowledge } from "@homepage/content/knowledge";
import { knowledgeDatabase } from "@homepage/database/database";
import { embedKnowledge, embeddingModel } from "@homepage/knowledge/openRouter";
import {
  readPublishedKnowledge,
  type KnowledgeDocument,
} from "./publicationSource";
import {
  finishKnowledgeUsage,
  reserveKnowledgeUsage,
} from "@homepage/knowledge/usage";
import { cachedKnowledgeEmbeddings } from "@homepage/knowledge/embeddingCache";

export async function indexKnowledge() {
  const sql = knowledgeDatabase();
  if (embeddingModel() !== "openai/text-embedding-3-small")
    throw new Error(
      "This index requires text-embedding-3-small with 1536 dimensions",
    );
  // A dedicated connection keeps the lock while external API calls are in flight.
  const lock = await sql.reserve();
  try {
    const [state] = await lock`SELECT pg_try_advisory_lock(816162) AS acquired`;
    if (!state.acquired) return { skipped: true };
    try {
      const source = await readPublishedKnowledge(sql);
      const { documents } = source;
      const rows =
        await sql`SELECT id, hash, embedding_model FROM knowledge_documents`;
      const existing = new Map(rows.map((row) => [row.id, row]));
      const changed = documents.filter(
        (doc) =>
          existing.get(doc.id)?.hash !== doc.hash ||
          existing.get(doc.id)?.embedding_model !== embeddingModel(),
      );
      // Withdraw removed material before paid work; fail closed while replacing changed content.
      if (changed.length || rows.length !== documents.length) {
        await sql.begin(async (tx) => {
          await tx`DELETE FROM knowledge_sync`;
          await tx`DELETE FROM knowledge_documents WHERE NOT (id = ANY(${documents.map((doc) => doc.id)}::text[]))`;
        });
      }
      const prepared: {
        doc: KnowledgeDocument;
        chunks: string[];
        vectors: number[][];
      }[] = [];
      for (const doc of changed) {
        if (doc.text.length > 100000)
          throw new Error("Knowledge document size limit exceeded");
        const chunks = chunkKnowledge(`${doc.title}\n\n${doc.text}`);
        if (chunks.length > 80)
          throw new Error("Knowledge chunk limit exceeded");
        const vectors = await cachedKnowledgeEmbeddings(
          sql,
          chunks,
          embeddingModel(),
          async (batch) => {
            const reservation = await reserveKnowledgeUsage("indexer", true);
            try {
              const result = await embedKnowledge(batch);
              await finishKnowledgeUsage(reservation);
              return result;
            } catch (error) {
              await finishKnowledgeUsage(reservation, undefined, true);
              throw error;
            }
          },
        );
        prepared.push({ doc, chunks, vectors });
      }
      if (
        !(await writeIndexPublication(sql, source, prepared, embeddingModel()))
      )
        return { skipped: true };
      const [count] = await sql`SELECT count(*) AS count FROM knowledge_chunks`;
      return {
        documents: documents.length,
        updated: changed.length,
        chunks: Number(count.count),
      };
    } finally {
      await lock`SELECT pg_advisory_unlock(816162)`;
    }
  } finally {
    lock.release();
  }
}
