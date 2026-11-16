import { notionFailure } from "@homepage/database/notionDiagnostics";
import { setTimeout as pause } from "node:timers/promises";
import { knowledgeDatabase } from "@homepage/database/database";
import { drainEnquiryOutbox } from "@homepage/database/durableEnquiryStore";
import { notionEnquiryStore } from "../enquiries/notionEnquiryStore";
import { postgresMaltMirrorStore } from "@homepage/database/postgresMaltMirrorStore";
import { refreshMaltIfDue } from "../malt/scheduledRefresh";
import { notionMaltMirrorStore } from "../malt/notionMaltMirrorStore";
import { syncWebsiteContent } from "./syncWebsiteContent";
import { cleanupKnowledgeUsage } from "@homepage/knowledge/policy";

export async function seedMaltMirror() {
  const sql = knowledgeDatabase();
  const store = postgresMaltMirrorStore(sql);
  if ((await store.read())?.observation) return;
  const value = await notionMaltMirrorStore().read();
  // An empty legacy mirror must not erase a concurrent successful refresh.
  if (value?.observation) await store.write(value);
}

export async function deliverPendingEnquiries() {
  return drainEnquiryOutbox(knowledgeDatabase(), notionEnquiryStore());
}

/** Separate loops keep notifications and Malt refresh independent of content/AI syncs. */
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
    loop(cleanupKnowledgeUsage, 3600_000, "AI retention cleanup"),
    loop(deliverPendingEnquiries, 5000, "Notion enquiry delivery"),
    loop(() => refreshMaltIfDue(), 60_000, "Malt refresh"),
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
