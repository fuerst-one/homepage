import { notionFailure } from "../notion/notionDiagnostics";
import { randomUUID } from "node:crypto";
import type { Enquiry } from "../../lib/enquiry";
import { knowledgeDatabase } from "../knowledge/database";
import type { EnquiryStore } from "./submitEnquiry";

/** A receipt means the database has the brief; Notion availability is irrelevant. */
export function durableEnquiryStore(sql = knowledgeDatabase()): EnquiryStore {
  return {
    async find(id) {
      const [row] =
        await sql`SELECT fingerprint FROM notion_enquiry_outbox WHERE id=${id}`;
      return row
        ? { receipt: id, fingerprint: row.fingerprint as string }
        : undefined;
    },
    async create(value, fingerprint) {
      const [row] =
        await sql`INSERT INTO notion_enquiry_outbox(id,fingerprint,payload)
        VALUES (${value.id},${fingerprint},${sql.json(JSON.parse(JSON.stringify(value)))})
        ON CONFLICT(id) DO UPDATE SET id=excluded.id RETURNING fingerprint`;
      if (row.fingerprint !== fingerprint) throw new Error("enquiry_conflict");
      return { receipt: value.id, fingerprint };
    },
  };
}

/** Query-before-create reconciles an uncertain Notion write on the next attempt. */
export async function drainEnquiryOutbox(
  sql: ReturnType<typeof knowledgeDatabase>,
  target: EnquiryStore,
  limit = 5,
) {
  let delivered = 0;
  for (let i = 0; i < limit; i++) {
    const token = randomUUID();
    const [row] =
      await sql`UPDATE notion_enquiry_outbox SET lease_token=${token},lease_until=clock_timestamp()+interval '2 minutes',attempts=attempts+1
      WHERE id=(SELECT id FROM notion_enquiry_outbox WHERE delivered_at IS NULL AND available_at<=clock_timestamp()
      AND lease_until<=clock_timestamp() ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1)
      RETURNING id,fingerprint,payload,attempts`;
    if (!row) break;
    try {
      const existing = await target.find(row.id);
      if (existing && existing.fingerprint !== row.fingerprint)
        throw new Error("enquiry_conflict");
      const receipt =
        existing ??
        (await target.create(row.payload as Enquiry, row.fingerprint));
      await target.notify?.(receipt);
      const done =
        await sql`UPDATE notion_enquiry_outbox SET delivered_at=clock_timestamp(),payload=NULL,lease_token=NULL,lease_until=clock_timestamp()
        WHERE id=${row.id} AND lease_token=${token} AND lease_until>clock_timestamp() RETURNING id`;
      delivered += done.length;
    } catch (error) {
      const delaySeconds = Math.min(
        3600,
        30 * 2 ** Math.min(Number(row.attempts), 7),
      );
      await sql`UPDATE notion_enquiry_outbox SET available_at=clock_timestamp()+${delaySeconds}*interval '1 second',lease_token=NULL,lease_until=clock_timestamp()
        WHERE id=${row.id} AND lease_token=${token}`;
      console.warn("Notion enquiry delivery deferred", {
        attempt: Number(row.attempts),
        ...notionFailure(error),
      });
    }
  }
  // Delivered briefs are already erased. Retain only bounded idempotency receipts.
  await sql`DELETE FROM notion_enquiry_outbox WHERE delivered_at<clock_timestamp()-interval '30 days'`;
  return { delivered };
}
