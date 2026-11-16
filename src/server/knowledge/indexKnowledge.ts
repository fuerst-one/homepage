import { chunkKnowledge } from "../../lib/knowledge";
import { knowledgeDatabase } from "./database";
import { embedKnowledge, embeddingModel } from "./openRouter";
import { readNotionKnowledge, type KnowledgeDocument } from "./notionSource";
import { finishKnowledgeUsage, reserveKnowledgeUsage } from "./usage";
import { cachedKnowledgeEmbeddings } from "./embeddingCache";

let previous = new Map<string, KnowledgeDocument>();
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
      const documents = await readNotionKnowledge(previous);
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
      await sql.begin(async (tx) => {
        for (const { doc, chunks, vectors } of prepared) {
          await tx`INSERT INTO knowledge_documents(id,project_id,title,locale,href,hash,embedding_model)
            VALUES (${doc.id},${doc.projectId},${doc.title},${doc.locale},${doc.href},${doc.hash},${embeddingModel()})
            ON CONFLICT(id) DO UPDATE SET title=excluded.title,locale=excluded.locale,href=excluded.href,hash=excluded.hash,embedding_model=excluded.embedding_model,updated_at=now()`;
          await tx`DELETE FROM knowledge_chunks WHERE document_id=${doc.id}`;
          for (let i = 0; i < chunks.length; i++) {
            await tx`INSERT INTO knowledge_chunks(id,document_id,content,embedding)
              VALUES (${`${doc.id}:${i}`},${doc.id},${chunks[i]},${JSON.stringify(vectors[i])}::vector)`;
          }
        }
        await tx`DELETE FROM knowledge_documents WHERE NOT (id = ANY(${documents.map((doc) => doc.id)}::text[]))`;
        await tx`INSERT INTO knowledge_sync(id,synced_at) VALUES (1,now()) ON CONFLICT(id) DO UPDATE SET synced_at=now()`;
      });
      previous = new Map(documents.map((doc) => [doc.id, doc]));
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
