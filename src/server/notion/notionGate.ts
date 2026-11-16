import { createHash } from "node:crypto";
import { knowledgeDatabase } from "../knowledge/database";

export type NotionGate = {
  /** Zero admits this request; otherwise retry admission after this many ms. */
  acquire(): Promise<number>;
  defer(ms: number): Promise<void>;
};

export function notionScope() {
  return createHash("sha256")
    .update(process.env.NEXT_NOTION_TOKEN || "unconfigured")
    .digest("hex");
}

/** One admission clock for web instances, background jobs, and every SDK client. */
export function postgresNotionGate(
  sql = knowledgeDatabase(),
  key = notionScope(),
): NotionGate {
  return {
    async acquire() {
      return sql.begin(async (tx) => {
        await tx`INSERT INTO notion_request_gate(key) VALUES (${key}) ON CONFLICT DO NOTHING`;
        const [row] = await tx`SELECT greatest(0,extract(epoch FROM
          (greatest(next_at,cooldown_until)-clock_timestamp()))*1000) AS delay
          FROM notion_request_gate WHERE key=${key} FOR UPDATE`;
        const delay = Math.ceil(Number(row.delay));
        if (delay > 0) return delay;
        await tx`UPDATE notion_request_gate SET next_at=clock_timestamp()+interval '550 milliseconds' WHERE key=${key}`;
        return 0;
      });
    },
    async defer(ms) {
      await sql`INSERT INTO notion_request_gate(key,cooldown_until)
        VALUES (${key},clock_timestamp()+${ms}*interval '1 millisecond')
        ON CONFLICT(key) DO UPDATE SET cooldown_until=greatest(notion_request_gate.cooldown_until,excluded.cooldown_until)`;
    },
  };
}
