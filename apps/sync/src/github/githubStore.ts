import { knowledgeDatabase } from "@homepage/database/database";
import { aggregateGitHubActivity } from "@homepage/content/githubActivity";
import { postgresSnapshotStore } from "../notion/snapshot";
import type { GitHubSnapshot } from "./collectGitHubHistory";

export const GITHUB_KEY = "github-activity-v1";
export function githubStore(sql = knowledgeDatabase()) {
  const base = postgresSnapshotStore(sql, "github_worker_snapshots");
  return {
    ...base,
    async publish(key: string, token: string, value: unknown) {
      const snapshot = value as GitHubSnapshot;
      return sql.begin(async (tx) => {
        const [owned] =
          await tx`UPDATE github_worker_snapshots SET payload=${tx.json(JSON.parse(JSON.stringify(snapshot)))},refreshed_at=clock_timestamp(),lease_token=NULL,lease_until=clock_timestamp(),retry_at=clock_timestamp() WHERE key=${key} AND lease_token=${token} AND lease_until>clock_timestamp() RETURNING refreshed_at`;
        if (!owned) return false;
        const activity = aggregateGitHubActivity(
          snapshot.repositories,
          snapshot.login,
          new Date(owned.refreshed_at).toISOString(),
        );
        await tx`INSERT INTO public_github_activity(key,payload,refreshed_at) VALUES (${GITHUB_KEY},${tx.json(activity)},clock_timestamp()) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload,refreshed_at=excluded.refreshed_at`;
        return true;
      });
    },
    async fail(key: string, token: string) {
      // A failed inventory can be an exhausted provider quota. Keep the old
      // aggregate and wait an hour rather than issuing another request each loop.
      await sql`UPDATE github_worker_snapshots SET lease_token=NULL,lease_until=clock_timestamp(),retry_at=clock_timestamp()+interval '1 hour' WHERE key=${key} AND lease_token=${token}`;
    },
  };
}
