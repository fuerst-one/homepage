import { knowledgeDatabase } from "./database";
import { readGitHubActivity } from "@homepage/content/githubActivity";

export async function readPublicGitHubActivity(sql = knowledgeDatabase()) {
  try {
    const [row] =
      await sql`SELECT payload FROM public_github_activity WHERE key='github-activity-v1'`;
    return readGitHubActivity(row?.payload);
  } catch (error) {
    // Independent web/worker releases may precede this additive migration.
    if ((error as { code?: string }).code === "42P01") return null;
    throw error;
  }
}
