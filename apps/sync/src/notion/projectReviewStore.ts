import { knowledgeDatabase } from "@homepage/database/database";
import type { ProjectSourceIssue } from "@homepage/content/projectSourceReview";

export const PROJECT_REVIEW_KEY = "project-source-review-v1";

/** Worker-only: option and value names stay in this table and never reach logs or public payloads. */
export type ProjectReviewIssue = ProjectSourceIssue & { projectId?: string };
export type ProjectReview = { checkedAt: string; issues: ProjectReviewIssue[] };

export async function saveProjectReview(
  issues: ProjectReviewIssue[],
  sql = knowledgeDatabase(),
) {
  const review: ProjectReview = { checkedAt: new Date().toISOString(), issues };
  await sql`INSERT INTO notion_snapshots(key,payload,refreshed_at)
    VALUES (${PROJECT_REVIEW_KEY},${sql.json(review)},clock_timestamp())
    ON CONFLICT(key) DO UPDATE SET payload=excluded.payload,refreshed_at=excluded.refreshed_at`;
}

export async function readProjectReview(
  sql = knowledgeDatabase(),
): Promise<ProjectReview | undefined> {
  const [row] =
    await sql`SELECT payload FROM notion_snapshots WHERE key=${PROJECT_REVIEW_KEY}`;
  return row?.payload as ProjectReview | undefined;
}

/** Counts per field and reason, safe to print where values must not appear. */
export const summarizeProjectReview = (issues: ProjectReviewIssue[]) =>
  issues.reduce<Record<string, number>>((counts, { field, reason }) => {
    const key = `${field}: ${reason}`;
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
