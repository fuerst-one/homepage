import { notionFailure } from "@homepage/database/notionDiagnostics";
import { readFile } from "node:fs/promises";
import { knowledgeDatabase } from "@homepage/database/database";
import { syncWebsiteContent } from "../src/notion/syncWebsiteContent";
import {
  readProjectReview,
  summarizeProjectReview,
} from "../src/notion/projectReviewStore";
import {
  deliverPendingEnquiries,
  seedMaltMirror,
  watchNotion,
} from "../src/notion/notionWorker";

async function main() {
  const sql = knowledgeDatabase(),
    command = process.argv[2] ?? "status";
  try {
    if (command === "migrate") {
      for (const file of [
        "003-notion-resilience.sql",
        "005-public-content.sql",
        "007-malt-refresh.sql",
        "008-project-dimensions.sql",
        "011-github-activity.sql",
      ])
        await sql.unsafe(
          await readFile(
            new URL(
              import.meta.resolve(`@homepage/database/migrations/${file}`),
            ),
            "utf8",
          ),
        );
    } else if (command === "sync") {
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
        (SELECT refreshed_at FROM public_content WHERE key='website-v3') AS content_published_at,
        (SELECT count(*) FROM notion_enquiry_outbox WHERE delivered_at IS NULL) AS pending_enquiries,
        (SELECT min(created_at) FROM notion_enquiry_outbox WHERE delivered_at IS NULL) AS oldest_pending_at,
        (SELECT max(attempts) FROM notion_enquiry_outbox WHERE delivered_at IS NULL) AS max_delivery_attempts,
        (SELECT max(cooldown_until) FROM notion_request_gate) AS notion_cooldown_until`;
      const review = await readProjectReview(sql);
      console.log(
        JSON.stringify({
          ...state,
          project_review_checked_at: review?.checkedAt ?? null,
          project_review_issues: summarizeProjectReview(review?.issues ?? []),
        }),
      );
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
    } else if (command === "review") {
      // Unlike health, drift must not mark a working worker container unhealthy.
      const review = await readProjectReview(sql);
      console.log(JSON.stringify(review ?? null, null, 2));
      if (!review || review.issues.length) process.exitCode = 1;
    } else
      throw new Error(
        "Use migrate, sync, deliver, watch, status, health or review",
      );
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
