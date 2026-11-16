import { randomUUID } from "node:crypto";
import {
  MALT_PROFILE_URL,
  readMaltMirror,
  type MaltMirror,
} from "@homepage/content/maltMirror";
import { knowledgeDatabase } from "@homepage/database/database";

export type MaltMirrorStore = {
  read(): Promise<MaltMirror | null>;
  write(value: MaltMirror, attemptOnly?: boolean): Promise<void | "older">;
};
const empty: MaltMirror = {
  version: 1,
  profileUrl: MALT_PROFILE_URL,
  observation: null,
  lastAttempt: null,
};
const checkedMirror = (value: MaltMirror) => {
  const checked = readMaltMirror(JSON.stringify(value));
  if (!checked) throw new Error("invalid_malt_mirror");
  return checked;
};
function merge(
  latest: MaltMirror | null,
  checked: MaltMirror,
  attemptOnly: boolean,
) {
  const older =
    !attemptOnly &&
    latest?.observation &&
    checked.observation &&
    Date.parse(latest.observation.observedAt) >
      Date.parse(checked.observation.observedAt);
  return {
    older: !!older,
    next:
      (attemptOnly || older) && latest
        ? { ...latest, lastAttempt: checked.lastAttempt }
        : checked,
  };
}

export function postgresMaltMirrorStore(sql = knowledgeDatabase()) {
  return {
    async read(): Promise<MaltMirror | null> {
      const [row] = await sql`SELECT payload FROM site_malt_mirror WHERE id=1`;
      return row ? readMaltMirror(JSON.stringify(row.payload)) : null;
    },
    async write(
      value: MaltMirror,
      attemptOnly = false,
    ): Promise<void | "older"> {
      const checked = checkedMirror(value);
      return sql.begin(async (tx) => {
        // Serialize first insertion and imports as well as refresh publication.
        await tx`SELECT pg_advisory_xact_lock(816163)`;
        const [row] =
          await tx`SELECT payload FROM site_malt_mirror WHERE id=1 FOR UPDATE`;
        const latest = row ? readMaltMirror(JSON.stringify(row.payload)) : null;
        const { older, next } = merge(latest, checked, attemptOnly);
        if (older) return "older" as const;
        await tx`INSERT INTO site_malt_mirror(id,payload) VALUES (1,${tx.json(JSON.parse(JSON.stringify(next)))})
          ON CONFLICT(id) DO UPDATE SET payload=excluded.payload`;
      });
    },
    async claimRefresh(force = false): Promise<string | null> {
      await sql`INSERT INTO site_malt_mirror(id,payload) VALUES (1,${sql.json(JSON.parse(JSON.stringify(empty)))}) ON CONFLICT DO NOTHING`;
      const token = randomUUID();
      const [row] =
        await sql`UPDATE site_malt_mirror SET refresh_token=${token}::uuid,
        refresh_until=clock_timestamp()+interval '2 minutes'
        WHERE id=1 AND refresh_until<=clock_timestamp()
          AND (${force} OR next_refresh_at<=clock_timestamp()) RETURNING refresh_token`;
      return row?.refresh_token ?? null;
    },
    async completeRefresh(
      token: string,
      value: MaltMirror,
      nextRefreshAt: string,
      attemptOnly = false,
    ): Promise<void | "older" | "lease_lost"> {
      const checked = checkedMirror(value);
      if (!Number.isFinite(Date.parse(nextRefreshAt)))
        throw new Error("invalid_refresh_schedule");
      return sql.begin(async (tx) => {
        await tx`SELECT pg_advisory_xact_lock(816163)`;
        const [row] =
          await tx`SELECT payload,refresh_token,refresh_until>clock_timestamp() AS live
          FROM site_malt_mirror WHERE id=1 FOR UPDATE`;
        if (!row || row.refresh_token !== token || !row.live)
          return "lease_lost" as const;
        const { older, next } = merge(
          readMaltMirror(JSON.stringify(row.payload)),
          checked,
          attemptOnly,
        );
        await tx`UPDATE site_malt_mirror SET payload=${tx.json(JSON.parse(JSON.stringify(next)))},
          next_refresh_at=${nextRefreshAt}::timestamptz,refresh_token=NULL,refresh_until='-infinity' WHERE id=1`;
        return older ? ("older" as const) : undefined;
      });
    },
    async failRefresh(token: string) {
      await sql`UPDATE site_malt_mirror SET refresh_token=NULL,refresh_until='-infinity',
        next_refresh_at=clock_timestamp()+interval '5 minutes' WHERE id=1 AND refresh_token=${token}::uuid`;
    },
  };
}
