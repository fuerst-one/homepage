import { createHash } from "node:crypto";
import type postgres from "postgres";

/** Checkpoint each paid batch so a later failure does not charge for it again. */
export async function cachedKnowledgeEmbeddings(
  sql: postgres.Sql,
  chunks: string[],
  model: string,
  embed: (chunks: string[]) => Promise<number[][]>,
): Promise<number[][]> {
  const keys = chunks.map((text) =>
    createHash("sha256")
      .update(JSON.stringify([model, text]))
      .digest("hex"),
  );
  const rows =
    await sql`SELECT key, embedding::text AS embedding FROM knowledge_embedding_cache WHERE key = ANY(${keys}::text[])`;
  const vectors = new Map<string, number[]>(
    rows.map((row) => [row.key, JSON.parse(row.embedding)]),
  );
  const missing = [
    ...new Map(chunks.map((text, i) => [keys[i], text])).entries(),
  ].filter(([key]) => !vectors.has(key));
  for (let start = 0; start < missing.length; start += 16) {
    const batch = missing.slice(start, start + 16);
    const embedded = await embed(batch.map(([, text]) => text));
    if (embedded.length !== batch.length)
      throw new Error("Incomplete embedding batch");
    await sql.begin(async (tx) => {
      for (let i = 0; i < batch.length; i++) {
        await tx`INSERT INTO knowledge_embedding_cache(key,embedding) VALUES (${batch[i][0]},${JSON.stringify(embedded[i])}::vector) ON CONFLICT(key) DO NOTHING`;
        vectors.set(batch[i][0], embedded[i]);
      }
    });
  }
  return keys.map((key) => vectors.get(key)!);
}
