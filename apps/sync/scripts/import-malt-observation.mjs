// Usage: pnpm malt:import /path/to/public-observation.json (worker/database credentials).
// Import public HTML only; browser cookies and credentials never enter the snapshot.
import { readFile, stat } from "node:fs/promises";
import { knowledgeDatabase } from "@homepage/database/database";
import { postgresMaltMirrorStore } from "@homepage/database/postgresMaltMirrorStore";
import { importMaltObservation } from "../src/malt/refreshMaltMirror.ts";

async function main() {
  const file = process.argv[2];
  if (!file || (await stat(file)).size > 200_000)
    throw new Error("invalid_file");
  const input = JSON.parse(await readFile(file, "utf8"));
  const sql = knowledgeDatabase();
  try {
    console.log(
      JSON.stringify(
        await importMaltObservation(input, postgresMaltMirrorStore(sql)),
      ),
    );
  } finally {
    await sql.end();
  }
}
main().catch(() => {
  console.error(
    "Malt observation import failed; check the public observation file, timestamp and database access",
  );
  process.exitCode = 1;
});
