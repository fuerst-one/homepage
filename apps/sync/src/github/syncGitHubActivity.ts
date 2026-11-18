import { refreshSnapshot } from "../notion/snapshot";
import {
  collectGitHubHistory,
  type GitHubSnapshot,
} from "./collectGitHubHistory";
import { githubStore, GITHUB_KEY } from "./githubStore";

export async function syncGitHubActivity(force = false, signal?: AbortSignal) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return { status: "unconfigured" };
  const store = githubStore();
  let published = false;
  await refreshSnapshot(
    store,
    GITHUB_KEY,
    async () => {
      const previous = (await store.read(GITHUB_KEY))
        ?.value as GitHubSnapshot | null;
      const result = await collectGitHubHistory({ token, previous, signal });
      published = true;
      return result;
    },
    force ? 0 : 3600,
  );
  return { status: published ? "ok" : "not-due" };
}
