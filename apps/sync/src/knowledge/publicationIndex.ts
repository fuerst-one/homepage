import { knowledgeDatabase } from "@homepage/database/database";
import type { KnowledgeDocument } from "./publicationSource";
export type PreparedDocument = {
  doc: KnowledgeDocument;
  chunks: string[];
  vectors: number[][];
};
/** Paid work may overlap a content refresh. Commit only against the exact publication read. */
export async function writeIndexPublication(
  sql: ReturnType<typeof knowledgeDatabase>,
  source: { documents: KnowledgeDocument[]; revision: string },
  prepared: PreparedDocument[],
  model: string,
) {
  return sql.begin(async (tx) => {
    const [current] =
      await tx`SELECT refreshed_at::text AS revision FROM public_content WHERE key='website-v3' FOR SHARE`;
    if (current?.revision !== source.revision) return false;
    const documents = source.documents;
    for (const { doc, chunks, vectors } of prepared) {
      await tx`INSERT INTO knowledge_documents(id,project_id,title,locale,href,hash,embedding_model)
            VALUES (${doc.id},${doc.projectId},${doc.title},${doc.locale},${doc.href},${doc.hash},${model})
            ON CONFLICT(id) DO UPDATE SET title=excluded.title,locale=excluded.locale,href=excluded.href,hash=excluded.hash,embedding_model=excluded.embedding_model,updated_at=now()`;
      await tx`DELETE FROM knowledge_chunks WHERE document_id=${doc.id}`;
      for (let i = 0; i < chunks.length; i++) {
        await tx`INSERT INTO knowledge_chunks(id,document_id,content,embedding)
              VALUES (${`${doc.id}:${i}`},${doc.id},${chunks[i]},${JSON.stringify(vectors[i])}::vector)`;
      }
    }
    await tx`DELETE FROM knowledge_documents WHERE NOT (id = ANY(${documents.map((doc) => doc.id)}::text[]))`;
    await tx`INSERT INTO knowledge_sync(id,synced_at) VALUES (1,now()) ON CONFLICT(id) DO UPDATE SET synced_at=now()`;
    return true;
  });
}
