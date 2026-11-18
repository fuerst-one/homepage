import { randomUUID } from "node:crypto";
import { knowledgeDatabase } from "@homepage/database/database";

type Snapshot = { value: unknown; ageMs: number };

export function postgresSnapshotStore(
  sql = knowledgeDatabase(),
  table: "notion_snapshots" | "github_worker_snapshots" = "notion_snapshots",
) {
  return {
    async read(key: string): Promise<Snapshot | null> {
      const [row] =
        await sql`SELECT payload, extract(epoch FROM (clock_timestamp()-refreshed_at))*1000 AS age
        FROM ${sql(table)} WHERE key=${key}`;
      return row ? { value: row.payload, ageMs: Number(row.age) } : null;
    },
    async claim(key: string, freshSeconds: number): Promise<string | null> {
      const token = randomUUID();
      await sql`INSERT INTO ${sql(table)}(key) VALUES (${key}) ON CONFLICT DO NOTHING`;
      const rows =
        await sql`UPDATE ${sql(table)} SET lease_token=${token},lease_until=clock_timestamp()+interval '10 minutes'
        WHERE key=${key} AND lease_until<=clock_timestamp() AND retry_at<=clock_timestamp()
        AND (refreshed_at IS NULL OR refreshed_at<=clock_timestamp()-${freshSeconds}*interval '1 second') RETURNING key`;
      return rows.length ? token : null;
    },
    async publish(key: string, token: string, value: unknown) {
      const rows =
        await sql`UPDATE ${sql(table)} SET payload=${sql.json(JSON.parse(JSON.stringify(value)))},refreshed_at=clock_timestamp(),
        lease_token=NULL,lease_until=clock_timestamp(),retry_at=clock_timestamp()
        WHERE key=${key} AND lease_token=${token} AND lease_until>clock_timestamp() RETURNING key`;
      return rows.length > 0;
    },
    async renew(key: string, token: string) {
      const rows =
        await sql`UPDATE ${sql(table)} SET lease_until=clock_timestamp()+interval '10 minutes'
        WHERE key=${key} AND lease_token=${token} AND lease_until>clock_timestamp() RETURNING key`;
      return rows.length > 0;
    },
    async fail(key: string, token: string) {
      await sql`UPDATE ${sql(table)} SET lease_token=NULL,lease_until=clock_timestamp(),retry_at=clock_timestamp()+interval '60 seconds'
        WHERE key=${key} AND lease_token=${token}`;
    },
  };
}
type Store = ReturnType<typeof postgresSnapshotStore>;

export async function refreshSnapshot<T>(
  store: Store,
  key: string,
  load: () => Promise<T>,
  freshSeconds: number,
  { renewEveryMs = 30_000 } = {},
) {
  const token = await store.claim(key, freshSeconds);
  if (!token) return;
  let leaseHealthy = true;
  let renewing: Promise<void> | null = null;
  const timer = setInterval(() => {
    if (renewing) return;
    renewing = store
      .renew(key, token)
      .then(
        (ok) => {
          leaseHealthy &&= ok;
        },
        () => {
          leaseHealthy = false;
        },
      )
      .finally(() => {
        renewing = null;
      });
  }, renewEveryMs);
  timer.unref();
  try {
    const value = await load();
    // Null is the sentinel for an uninitialised snapshot; empty arrays are valid successes.
    if (value === null || value === undefined)
      throw new Error("Notion snapshot unavailable");
    if (!leaseHealthy || !(await store.publish(key, token, value)))
      throw Object.assign(new Error("Website publication lease lost"), {
        code: "snapshot_lease_lost",
      });
  } catch (error) {
    await store.fail(key, token);
    throw error;
  } finally {
    clearInterval(timer);
    await renewing;
  }
}

/** Readers never call Notion, schedule refreshes, or expire successfully published data. */
export async function readSnapshot<T>(store: Store, key: string): Promise<T> {
  const snapshot = await store.read(key);
  if (snapshot?.value !== null && snapshot?.value !== undefined) {
    return snapshot.value as T;
  }
  throw new Error("Website content unavailable; run the initial worker sync");
}
