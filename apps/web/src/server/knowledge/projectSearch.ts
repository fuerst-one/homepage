import { createHmac } from "node:crypto";
import type { KnowledgeConsent } from "@homepage/content/knowledgeConsent";
import { knowledgeDatabase } from "@homepage/database/database";
import {
  embeddingModel,
  embedKnowledgeWithUsage,
} from "@homepage/knowledge/openRouter";
import {
  reserveKnowledgeUsage,
  finishKnowledgeUsage,
} from "@homepage/knowledge/usage";

/** Retrieve projects directly. No answer generation or chat health probes are needed. */
export async function searchKnowledgeProjects(
  message: string,
  address: string,
  signal?: AbortSignal,
  consent?: KnowledgeConsent,
): Promise<string[]> {
  signal?.throwIfAborted();
  const secret =
    process.env.KNOWLEDGE_RATE_LIMIT_SECRET || process.env.CRON_SECRET;
  if (!secret || embeddingModel() !== "openai/text-embedding-3-small")
    throw new Error("Project search configuration unavailable");
  const sql = knowledgeDatabase();
  const [sync] =
    await sql`SELECT synced_at > now() - interval '15 minutes' AS fresh FROM knowledge_sync WHERE id=1`.signal(
      signal,
    );
  if (!sync?.fresh) throw new Error("Knowledge source needs synchronization");
  const visitor = createHmac("sha256", secret).update(address).digest("hex");
  const reservation = await reserveKnowledgeUsage(
    visitor,
    false,
    signal,
    consent,
  );
  try {
    const {
      vectors: [vector],
      costUsd,
    } = await embedKnowledgeWithUsage([message], signal);
    signal?.throwIfAborted();
    // Both public languages contribute evidence; multiple chunks become one result per project.
    const rows = await sql`
      SELECT d.project_id,
        max(1-(c.embedding <=> ${JSON.stringify(vector)}::vector) +
          least(ts_rank_cd(c.search,plainto_tsquery('simple',${message})),0.3)) AS score
      FROM knowledge_chunks c JOIN knowledge_documents d ON d.id=c.document_id
      WHERE d.embedding_model=${embeddingModel()}
      GROUP BY d.project_id
      HAVING max(1-(c.embedding <=> ${JSON.stringify(vector)}::vector)) >= 0.25
        OR max(ts_rank_cd(c.search,plainto_tsquery('simple',${message}))) > 0
      ORDER BY score DESC,d.project_id
      LIMIT 100
    `.signal(signal);
    await finishKnowledgeUsage(reservation, costUsd, false, signal);
    return rows.map((row) => row.project_id as string);
  } catch (error) {
    await finishKnowledgeUsage(
      reservation,
      undefined,
      true,
      AbortSignal.timeout(750),
    ).catch(() => {});
    throw error;
  }
}
