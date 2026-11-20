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
    const migrations = await Promise.all(
      [
        "012-visitor-profile.sql",
        "013-visitor-profile-signals.sql",
        "014-visitor-profile-strength.sql",
        "015-visitor-profile-rate.sql",
      ].map((migration) =>
        readFile(
          new URL(
            `../packages/database/migrations/${migration}`,
            import.meta.url,
          ),
          "utf8",
        ),
      ),
    );
    await sql.begin(async (tx) => {
      for (const migration of migrations) await tx.unsafe(migration);
      await tx.unsafe(
        "ALTER TABLE visitor_profile_events VALIDATE CONSTRAINT visitor_profile_events_kind_check, VALIDATE CONSTRAINT visitor_profile_events_rule_version_check",
      );
    });
    console.log("Visitor profile schema ready.");
  } else if (command === "report" || command === "prune") {
    await pruneProfileEvents(sql);
    if (command === "report")
      console.log(JSON.stringify(await profileInsights(sql), null, 2));
  } else throw new Error("Expected report, migrate or prune");
} finally {
  await sql.end();
}
