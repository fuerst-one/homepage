// Usage: node --env-file=.env.local scripts/import-malt-observation.mjs /path/to/public-observation.json
// The local production/dev server must be running. No browser cookies or credentials enter the snapshot.
import { readFile } from "node:fs/promises";
const file = process.argv[2];
if (!file || !process.env.CRON_SECRET)
  throw new Error("Observation file and CRON_SECRET required");
const input = JSON.parse(await readFile(file, "utf8"));
const response = await fetch("http://localhost:6888/api/integrations/malt", {
  method: "POST",
  headers: {
    authorization: `Bearer ${process.env.CRON_SECRET}`,
    "content-type": "application/json",
  },
  body: JSON.stringify(input),
});
const result = await response.json();
if (!response.ok)
  throw new Error(
    `Malt mirror import failed: ${response.status} ${result.error}`,
  );
console.log(JSON.stringify(result));
