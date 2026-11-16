import { knowledgeDatabase } from "@homepage/database/database";
import { refreshMaltIfDue } from "../src/malt/scheduledRefresh";

async function main() {
  const sql = knowledgeDatabase();
  try {
    if (process.argv[2] === "refresh") {
      console.log(JSON.stringify(await refreshMaltIfDue(sql, undefined, true)));
    } else {
      const [state] =
        await sql`SELECT payload->'observation'->>'observedAt' AS observed_at,
        payload->'lastAttempt' AS last_attempt,next_refresh_at,
        refresh_until>clock_timestamp() AS refresh_in_progress FROM site_malt_mirror WHERE id=1`;
      console.log(JSON.stringify(state ?? null));
    }
  } finally {
    await sql.end();
  }
}
main().catch(() => {
  console.error("Malt maintenance failed; database content retained");
  process.exitCode = 1;
});
