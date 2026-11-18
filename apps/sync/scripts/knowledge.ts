import { readFile } from "node:fs/promises";
import { knowledgeDatabase } from "@homepage/database/database";
import { indexKnowledge } from "../src/knowledge/indexKnowledge";
import { watchNotion } from "../src/notion/notionWorker";
import { setTimeout as pause } from "node:timers/promises";

async function main() {
  const sql = knowledgeDatabase(),
    command = process.argv[2] ?? "status";
  try {
    if (command === "migrate") {
      for (const file of [
        "001-initial.sql",
        "003-notion-resilience.sql",
        "005-public-content.sql",
        "007-malt-refresh.sql",
        "008-project-dimensions.sql",
        "008-ai-admission.sql",
        "009-query-cache.sql",
        "010-query-cache-retention.sql",
        "011-image-descriptions.sql",
      ]) {
        const migration = await readFile(
          new URL(import.meta.resolve(`@homepage/database/migrations/${file}`)),
          "utf8",
        );
        await sql.begin(async (tx) => {
          await tx.unsafe(migration);
        });
      }
      console.log("Knowledge database ready");
    } else if (command === "sync" || command === "watch") {
      const controller = new AbortController();
      process.once("SIGTERM", () => controller.abort());
      process.once("SIGINT", () => controller.abort());
      const index = async () => {
        do {
          try {
            console.log(
              new Date().toISOString(),
              JSON.stringify(await indexKnowledge()),
            );
          } catch (error) {
            console.error(
              "Knowledge sync failed:",
              error instanceof Error ? error.message : "unknown error",
            );
            if (command === "sync") throw error;
          }
          if (command === "watch")
            await pause(60_000, undefined, { signal: controller.signal }).catch(
              () => {},
            );
        } while (command === "watch" && !controller.signal.aborted);
      };
      if (command === "watch")
        await Promise.all([index(), watchNotion(controller.signal)]);
      else await index();
    } else if (command === "status") {
      console.log(
        JSON.stringify(
          await sql`SELECT (SELECT count(*) FROM knowledge_documents) AS documents,(SELECT count(*) FROM knowledge_chunks) AS chunks,(SELECT synced_at FROM knowledge_sync WHERE id=1) AS last_sync,(SELECT coalesce(sum(amount_micro_usd),0)/1000000.0 FROM knowledge_usage) AS accounted_usd`,
          null,
          2,
        ),
      );
    } else throw new Error("Use migrate, sync, watch or status");
  } finally {
    await sql.end();
  }
}
main().catch(() => {
  console.error("Knowledge command failed");
  process.exitCode = 1;
});
