import { knowledgeDatabase } from "@homepage/database/database";
import { postgresMaltMirrorStore } from "@homepage/database/postgresMaltMirrorStore";
import { fetchMaltProfile } from "./fetchMaltProfile";
import { nextMaltRefreshAt, refreshMaltMirror } from "./refreshMaltMirror";

/** A shared lease coordinates overlapping worker deployments without holding a DB lock during HTTP. */
export async function refreshMaltIfDue(
  sql = knowledgeDatabase(),
  fetcher = fetchMaltProfile,
  force = false,
) {
  const store = postgresMaltMirrorStore(sql);
  const token = await store.claimRefresh(force);
  if (!token) return { skipped: true };
  try {
    return await refreshMaltMirror(
      {
        read: store.read,
        write: async (value, attemptOnly) => {
          const result = await store.completeRefresh(
            token,
            value,
            nextMaltRefreshAt(),
            attemptOnly,
          );
          if (result === "lease_lost")
            throw new Error("malt_refresh_lease_lost");
          return result;
        },
      },
      fetcher,
    );
  } catch (error) {
    await store.failRefresh(token);
    throw error;
  }
}
