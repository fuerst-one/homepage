import { readFile } from "node:fs/promises";
import { knowledgeDatabase } from "../src/server/knowledge/database";
import { indexKnowledge } from "../src/server/knowledge/indexKnowledge";

async function main() {
  const sql = knowledgeDatabase(),
    command = process.argv[2] ?? "status";
  try {
    if (command === "migrate") {
      const migration = await readFile("ops/knowledge/001-initial.sql", "utf8");
      await sql.begin(async (tx) => {
        await tx.unsafe(migration);
      });
      console.log("Knowledge database ready");
    } else if (command === "sync" || command === "watch") {
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
          await new Promise((resolve) => setTimeout(resolve, 60_000));
      } while (command === "watch");
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
