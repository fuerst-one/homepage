import type {
  CommitRecord,
  GitHubHistory,
} from "@homepage/content/githubActivity";

type Repository = {
  id: number;
  full_name: string;
  private: boolean;
  default_branch: string;
  pushed_at: string | null;
};
export type RepositoryHistory = GitHubHistory & {
  full_name: string;
  default_branch: string;
  head: string | null;
  syncedAt: string;
};
export type GitHubSnapshot = {
  login: string;
  repositories: RepositoryHistory[];
};
const WEEK = 7 * 86400_000;
const SHA = /^[a-f\d]{40}$/i;

/** GitHub-only requests. Numeric pagination never follows an untrusted Link URL. */
export async function collectGitHubHistory({
  token,
  previous,
  fetcher = fetch,
  now = new Date().toISOString(),
  signal,
}: {
  token: string;
  previous?: GitHubSnapshot | null;
  fetcher?: typeof fetch;
  now?: string;
  signal?: AbortSignal;
}): Promise<GitHubSnapshot> {
  const request = async (path: string, empty = false): Promise<unknown> => {
    const result = await fetcher(`https://api.github.com${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2026-03-10",
        "User-Agent": "fuerst-one-portfolio-sync",
      },
      redirect: "error",
      signal: AbortSignal.any([
        AbortSignal.timeout(30_000),
        ...(signal ? [signal] : []),
      ]),
    });
    if (!result.ok) {
      if (empty && result.status === 409) {
        const data = (await result.json()) as { message?: string };
        if (/repository is empty/i.test(data.message ?? ""))
          return { emptyRepository: true };
      }
      // Provider bodies/URLs can contain repository names or secrets.
      throw Object.assign(
        new Error(`GitHub refresh deferred (HTTP ${result.status})`),
        { status: result.status },
      );
    }
    return result.json();
  };
  const user = (await request("/user")) as { login?: string };
  if (!user.login || !/^[a-z\d-]{1,39}$/i.test(user.login))
    throw new Error("GitHub account unavailable");
  const login = user.login;
  const inventory = new Map<number, Repository>();
  for (let page = 1; ; page++) {
    if (page > 1000)
      throw new Error("GitHub inventory limit reached; publication retained");
    const data = await request(
      `/user/repos?affiliation=owner,collaborator,organization_member&sort=full_name&direction=asc&per_page=100&page=${page}`,
    );
    if (!Array.isArray(data)) throw new Error("Invalid GitHub inventory");
    for (const item of data) {
      const repo = item as Repository;
      if (
        !Number.isSafeInteger(repo.id) ||
        !/^[a-z\d-]+\/[\w.-]+$/i.test(repo.full_name) ||
        typeof repo.private !== "boolean" ||
        typeof repo.default_branch !== "string" ||
        !repo.default_branch
      )
        throw new Error("Incomplete GitHub inventory");
      inventory.set(repo.id, repo);
    }
    if (data.length < 100) break;
  }
  const cached = new Map(
    previous?.login.toLowerCase() === login.toLowerCase()
      ? previous.repositories.map((r) => [r.id, r])
      : [],
  );
  const repositories: RepositoryHistory[] = [];
  for (const repo of inventory.values()) {
    const base = `/repos/${repo.full_name.split("/").map(encodeURIComponent).join("/")}`;
    // A never-pushed repository has no branch/commit history to fetch.
    if (repo.pushed_at === null) {
      repositories.push({
        id: repo.id,
        full_name: repo.full_name,
        default_branch: repo.default_branch,
        private: repo.private,
        head: null,
        syncedAt: now,
        commits: [],
      });
      continue;
    }
    let branch: { commit?: { sha?: string } };
    try {
      branch = (await request(
        `${base}/branches/${encodeURIComponent(repo.default_branch)}`,
      )) as typeof branch;
    } catch (error) {
      if ((error as { status?: number }).status === 404) {
        const probe = (await request(`${base}/commits?per_page=1`, true)) as {
          emptyRepository?: boolean;
        };
        if (probe.emptyRepository === true) {
          repositories.push({
            id: repo.id,
            full_name: repo.full_name,
            default_branch: repo.default_branch,
            private: repo.private,
            head: null,
            syncedAt: now,
            commits: [],
          });
          continue;
        }
      }
      throw error;
    }
    const head = branch.commit?.sha;
    if (!head || !SHA.test(head)) throw new Error("GitHub branch unavailable");
    const old = cached.get(repo.id);
    let commits: CommitRecord[];
    const reused =
      old?.head === head &&
      old.default_branch === repo.default_branch &&
      Date.parse(now) - Date.parse(old.syncedAt) < WEEK;
    if (reused) commits = old.commits;
    else {
      commits = [];
      for (let page = 1; ; page++) {
        if (page > 10000)
          throw new Error("GitHub history limit reached; publication retained");
        const data = await request(
          `${base}/commits?author=${encodeURIComponent(login)}&sha=${head}&per_page=100&page=${page}`,
        );
        if (!Array.isArray(data))
          throw new Error("Invalid GitHub commit history");
        for (const item of data) {
          const row = item as {
            sha?: string;
            author?: { login?: string };
            commit?: { author?: { date?: string } };
          };
          const date = row.commit?.author?.date;
          if (
            !row.sha ||
            !SHA.test(row.sha) ||
            !date ||
            !Number.isFinite(Date.parse(date))
          )
            throw new Error("Incomplete GitHub commit history");
          if (row.author?.login?.toLowerCase() !== login.toLowerCase())
            throw new Error("GitHub author filter mismatch");
          commits.push({ sha: row.sha.toLowerCase(), date });
        }
        if (data.length < 100) break;
      }
    }
    repositories.push({
      id: repo.id,
      full_name: repo.full_name,
      default_branch: repo.default_branch,
      private: repo.private,
      head,
      syncedAt: reused ? old.syncedAt : now,
      commits,
    });
  }
  return { login, repositories };
}
