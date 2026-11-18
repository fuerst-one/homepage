import { describeKnowledgeImage } from "./describeImage";
import { writeIndexPublication } from "./publicationIndex";
import { chunkKnowledge } from "@homepage/content/knowledge";
import { knowledgeDatabase } from "@homepage/database/database";
import {
  embedKnowledgeWithUsage,
  embeddingModel,
} from "@homepage/knowledge/openRouter";
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
      let imagesSkipped = 0;
      const imageFailures: {
        documentId: string;
        assetKey: string;
        reason: string;
      }[] = [];
      const noteImageFailure = (doc: KnowledgeDocument, error: unknown) => {
        imagesSkipped++;
        const message = error instanceof Error ? error.message : "";
        const reason = /allowance/i.test(message)
          ? "budget-admission"
          : /review|in progress/i.test(message)
            ? "checkpoint-review"
            : /raster|size limit|Input image/i.test(message)
              ? "unsupported-image"
              : "description-unavailable";
        if (imageFailures.length < 50)
          imageFailures.push({
            documentId: doc.id,
            assetKey: doc.image!.assetKey,
            reason,
          });
      };
      const prepared: {
        doc: KnowledgeDocument;
        chunks: string[];
        vectors: number[][];
      }[] = [];
      for (const original of changed) {
        let doc = original;
        if (doc.image) {
          // Changed image versions must never retain observations from old pixels.
          await sql`DELETE FROM knowledge_documents WHERE id=${doc.id}`;
          try {
            doc = { ...doc, ...(await describeKnowledgeImage(doc, sql)) };
          } catch (error) {
            noteImageFailure(doc, error);
            continue;
          }
        }
        if (doc.text.length > 100000)
          throw new Error("Knowledge document size limit exceeded");
        const chunks = chunkKnowledge(`${doc.title}\n\n${doc.text}`);
        if (chunks.length > 80)
          throw new Error("Knowledge chunk limit exceeded");
        let vectors: number[][];
        try {
          vectors = await cachedKnowledgeEmbeddings(
            sql,
            chunks,
            embeddingModel(),
            async (batch) => {
              const reservation = await reserveKnowledgeUsage("indexer", true);
              try {
                const result = await embedKnowledgeWithUsage(batch);
                await finishKnowledgeUsage(reservation, result.costUsd);
                return result.vectors;
              } catch (error) {
                await finishKnowledgeUsage(reservation, undefined, true);
                throw error;
              }
            },
          );
        } catch (error) {
          if (!doc.image) throw error;
          noteImageFailure(doc, error);
          continue;
        }
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
        imagesSkipped,
        imageFailures,
      };
    } finally {
      await lock`SELECT pg_advisory_unlock(816162)`;
    }
  } finally {
    lock.release();
  }
}
