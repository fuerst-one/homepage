import { readMaltMirror } from "@homepage/content/maltMirror";
import type { MaltMirrorStore } from "@homepage/database/refreshMaltMirror";
import { knowledgeDatabase } from "@homepage/database/database";

export function postgresMaltMirrorStore(
  sql = knowledgeDatabase(),
): MaltMirrorStore {
  return {
    async read() {
      const [row] = await sql`SELECT payload FROM site_malt_mirror WHERE id=1`;
      return row ? readMaltMirror(JSON.stringify(row.payload)) : null;
    },
    async write(value, attemptOnly = false) {
      const checked = readMaltMirror(JSON.stringify(value));
      if (!checked) throw new Error("invalid_malt_mirror");
      return sql.begin(async (tx) => {
        // Serialise even the first insertion, without relying on process-local locks.
        await tx`SELECT pg_advisory_xact_lock(816163)`;
        const [row] =
          await tx`SELECT payload FROM site_malt_mirror WHERE id=1 FOR UPDATE`;
        const latest = row ? readMaltMirror(JSON.stringify(row.payload)) : null;
        if (
          !attemptOnly &&
          latest?.observation &&
          checked.observation &&
          Date.parse(latest.observation.observedAt) >
            Date.parse(checked.observation.observedAt)
        )
          return "older" as const;
        const next =
          attemptOnly && latest
            ? { ...latest, lastAttempt: checked.lastAttempt }
            : checked;
        await tx`INSERT INTO site_malt_mirror(id,payload) VALUES (1,${tx.json(JSON.parse(JSON.stringify(next)))})
          ON CONFLICT(id) DO UPDATE SET payload=excluded.payload`;
      });
    },
  };
}
