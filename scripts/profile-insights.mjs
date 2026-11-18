import { readFile } from "node:fs/promises";
import { knowledgeDatabase } from "@homepage/database/database";
import {
  profileInsights,
  pruneProfileEvents,
} from "@homepage/database/visitorProfile";

const sql = knowledgeDatabase();
try {
  const command = process.argv[2] || "report";
  if (command === "migrate") {
    await sql.unsafe(
      await readFile(
        new URL(
          "../packages/database/migrations/012-visitor-profile.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    console.log("Visitor profile schema ready.");
  } else if (command === "report" || command === "prune") {
    await pruneProfileEvents(sql);
    if (command === "report")
      console.log(JSON.stringify(await profileInsights(sql), null, 2));
  } else throw new Error("Expected report, migrate or prune");
} finally {
  await sql.end();
}
