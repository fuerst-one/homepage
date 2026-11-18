import type postgres from "postgres";
import type { PublicProject } from "./queryCache";

/** Index heartbeats do not invalidate answers; any public document change does. */
export async function readKnowledgeCacheContext(
  sql: postgres.Sql,
  signal?: AbortSignal,
) {
  const [state] = await sql`
    SELECT synced_at>now()-interval '15 minutes' AS fresh,
      (SELECT md5(string_agg(json_build_array(id,project_id,locale,hash,title,href,embedding_model,provenance)::text,',' ORDER BY id)) FROM knowledge_documents) AS revision,
      (SELECT jsonb_agg(DISTINCT jsonb_build_object('projectId',project_id,'title',title)) FROM knowledge_documents) AS projects
    FROM knowledge_sync WHERE id=1
  `.signal(signal);
  if (!state?.fresh || !state.revision)
    throw new Error("Knowledge source needs synchronization");
  return {
    revision: state.revision as string,
    projects: state.projects as PublicProject[],
  };
}
