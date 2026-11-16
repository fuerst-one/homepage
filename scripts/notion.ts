import { notionFailure } from "../src/server/notion/notionDiagnostics";
import { readFile } from "node:fs/promises";
import { knowledgeDatabase } from "../src/server/knowledge/database";
import { syncWebsiteContent } from "../src/server/notion/syncWebsiteContent";
import {
  deliverPendingEnquiries,
  seedMaltMirror,
  watchNotion,
} from "../src/server/notion/notionWorker";

async function main() {
  const sql = knowledgeDatabase(),
    command = process.argv[2] ?? "status";
  try {
    if (command === "migrate")
      await sql.unsafe(
        await readFile("ops/knowledge/003-notion-resilience.sql", "utf8"),
      );
    else if (command === "sync") {
      await syncWebsiteContent(true);
      await seedMaltMirror();
    } else if (command === "deliver")
      console.log(await deliverPendingEnquiries());
    else if (command === "watch") {
      const controller = new AbortController();
      process.once("SIGTERM", () => controller.abort());
      process.once("SIGINT", () => controller.abort());
      await watchNotion(controller.signal);
    } else if (command === "status" || command === "health") {
      const [state] = await sql`SELECT
        (SELECT refreshed_at FROM notion_snapshots WHERE key='website-v1') AS content_published_at,
        (SELECT count(*) FROM notion_enquiry_outbox WHERE delivered_at IS NULL) AS pending_enquiries,
        (SELECT min(created_at) FROM notion_enquiry_outbox WHERE delivered_at IS NULL) AS oldest_pending_at,
        (SELECT max(attempts) FROM notion_enquiry_outbox WHERE delivered_at IS NULL) AS max_delivery_attempts,
        (SELECT max(cooldown_until) FROM notion_request_gate) AS notion_cooldown_until`;
      console.log(JSON.stringify(state));
      if (
        command === "health" &&
        (!state.content_published_at ||
          Date.now() - new Date(state.content_published_at).getTime() >
            30 * 60_000 ||
          (state.oldest_pending_at &&
            Date.now() - new Date(state.oldest_pending_at).getTime() >
              15 * 60_000))
      )
        process.exitCode = 1;
    } else
      throw new Error("Use migrate, sync, deliver, watch, status or health");
  } finally {
    await sql.end();
  }
}
main().catch((error) => {
  console.error(
    "Notion maintenance failed; database content retained",
    notionFailure(error),
  );
  process.exitCode = 1;
});
