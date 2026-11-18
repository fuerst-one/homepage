import { createHash } from "node:crypto";
import type postgres from "postgres";
import { KnowledgeQuotaError } from "./usage";
import { parseImageDescriptionVariants } from "./imagePolicy";

type DescriptionInput = { content: Buffer; model: string; version: string };
type DescriptionResult = {
  description: string;
  altText: string;
  costUsd?: number;
};
/** Persist a claim before dispatch. Unknown outcomes require operator review, never automatic repayment. */
export async function cachedImageDescription(
  sql: postgres.Sql,
  input: DescriptionInput,
  describe: () => Promise<DescriptionResult>,
) {
  const contentHash = createHash("sha256").update(input.content).digest("hex");
  const key = createHash("sha256")
    .update(JSON.stringify([contentHash, input.model, input.version]))
    .digest("hex");
  const [existing] =
    await sql`SELECT status,description,alt_text FROM knowledge_image_descriptions WHERE key=${key}`;
  if (existing?.status === "complete")
    return {
      key,
      contentHash,
      ...parseImageDescriptionVariants({
        description: existing.description,
        altText: existing.alt_text,
      }),
    };
  if (existing)
    throw new Error("Image description outcome requires operator review");
  const [claimed] =
    await sql`INSERT INTO knowledge_image_descriptions(key,content_hash,model,version,status) VALUES(${key},${contentHash},${input.model},${input.version},'pending') ON CONFLICT DO NOTHING RETURNING key`;
  if (!claimed) {
    const [ready] =
      await sql`SELECT description,alt_text FROM knowledge_image_descriptions WHERE key=${key} AND status='complete'`;
    if (ready)
      return {
        key,
        contentHash,
        ...parseImageDescriptionVariants({
          description: ready.description,
          altText: ready.alt_text,
        }),
      };
    throw new Error("Image description in progress; review before retry");
  }
  try {
    const result = await describe();
    const { description, altText } = parseImageDescriptionVariants(result);
    const cost =
      typeof result.costUsd === "number" &&
      Number.isFinite(result.costUsd) &&
      result.costUsd >= 0
        ? result.costUsd
        : null;
    await sql`UPDATE knowledge_image_descriptions SET status='complete',description=${description},alt_text=${altText},cost_usd=${cost} WHERE key=${key}`;
    return { key, contentHash, description, altText };
  } catch (error) {
    if (error instanceof KnowledgeQuotaError)
      await sql`DELETE FROM knowledge_image_descriptions WHERE key=${key} AND status='pending'`.catch(
        () => {},
      );
    else
      await sql`UPDATE knowledge_image_descriptions SET status='failed' WHERE key=${key}`.catch(
        () => {},
      );
    throw error;
  }
}
