import { readFile } from "node:fs/promises";
import { knowledgeDatabase } from "@homepage/database/database";
import { readPublicGitHubActivity } from "@homepage/database/githubActivity";
import { syncGitHubActivity } from "../src/github/syncGitHubActivity";

const command = process.argv[2] ?? "status";
const sql = knowledgeDatabase();
try {
  if (command === "migrate")
    await sql.unsafe(
      await readFile(
        new URL(
          import.meta
            .resolve("@homepage/database/migrations/011-github-activity.sql"),
        ),
        "utf8",
      ),
    );
  else if (command === "sync")
    console.log(JSON.stringify(await syncGitHubActivity(true)));
  else if (command === "status") {
    const value = await readPublicGitHubActivity();
    console.log(
      JSON.stringify(
        value
          ? {
              login: value.login,
              refreshedAt: value.refreshedAt,
              totalCommits: value.totalCommits,
              repositoryCount: value.repositoryCount,
              includesPrivate: value.includesPrivate,
            }
          : { status: "not-published" },
      ),
    );
  } else throw new Error("Use migrate, sync or status");
} catch {
  console.error(
    "GitHub maintenance failed; prior publication retained. Check worker credentials, API quota and database migration.",
  );
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
