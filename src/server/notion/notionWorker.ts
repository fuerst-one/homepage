import { notionFailure } from "./notionDiagnostics";
import { setTimeout as pause } from "node:timers/promises";
import { knowledgeDatabase } from "../knowledge/database";
import { drainEnquiryOutbox } from "../enquiries/durableEnquiryStore";
import { notionEnquiryStore } from "../enquiries/notionEnquiryStore";
import { notionMaltMirrorStore } from "../malt/notionMaltMirrorStore";
import { syncWebsiteContent } from "./syncWebsiteContent";

export async function seedMaltMirror() {
  const sql = knowledgeDatabase();
  const [existing] = await sql`SELECT id FROM site_malt_mirror WHERE id=1`;
  if (existing) return;
  const value = await notionMaltMirrorStore().read();
  if (value)
    await sql`INSERT INTO site_malt_mirror(id,payload) VALUES (1,${sql.json(JSON.parse(JSON.stringify(value)))}) ON CONFLICT DO NOTHING`;
}

export async function deliverPendingEnquiries() {
  return drainEnquiryOutbox(knowledgeDatabase(), notionEnquiryStore());
}

/** Separate loops keep notification delivery independent of slow content/AI syncs. */
export async function watchNotion(signal: AbortSignal) {
  const loop = async (
    work: () => Promise<unknown>,
    interval: number,
    label: string,
  ) => {
    while (!signal.aborted) {
      try {
        await work();
      } catch (error) {
        console.warn(
          `${label} deferred; retaining database state`,
          notionFailure(error),
        );
      }
      try {
        await pause(interval, undefined, { signal });
      } catch {
        break;
      }
    }
  };
  await Promise.all([
    loop(deliverPendingEnquiries, 5000, "Notion enquiry delivery"),
    loop(
      async () => {
        await syncWebsiteContent();
        await seedMaltMirror();
      },
      60_000,
      "Website sync",
    ),
  ]);
}
