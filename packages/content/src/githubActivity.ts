export type GitHubMonth = {
  month: string;
  commits: number;
  cumulative: number;
};
export type GitHubActivity = {
  version: 1;
  login: string;
  refreshedAt: string;
  scope: "authored-default-branches";
  totalCommits: number;
  repositoryCount: number;
  includesPrivate: boolean;
  months: GitHubMonth[];
};
export type CommitRecord = { sha: string; date: string };
export type GitHubHistory = {
  id: number;
  private: boolean;
  commits: CommitRecord[];
};

export function aggregateGitHubActivity(
  repositories: GitHubHistory[],
  login: string,
  refreshedAt: string,
): GitHubActivity {
  const commits = new Map<string, string>();
  const now = Date.parse(refreshedAt);
  if (!Number.isFinite(now)) throw new Error("Invalid GitHub refresh date");
  for (const repo of repositories)
    for (const commit of repo.commits) {
      const at = Date.parse(commit.date);
      if (
        /^[a-f0-9]{40}$/i.test(commit.sha) &&
        /^\d{4}-\d{2}-\d{2}T/.test(commit.date) &&
        Number.isFinite(at) &&
        at >= 0 &&
        at <= now
      )
        commits.set(
          commit.sha.toLowerCase(),
          new Date(at).toISOString().slice(0, 7),
        );
    }
  const counts = new Map<string, number>();
  for (const month of commits.values())
    counts.set(month, (counts.get(month) ?? 0) + 1);
  const months: GitHubMonth[] = [];
  const first = [...counts.keys()].sort()[0];
  if (first) {
    const cursor = new Date(`${first}-01T00:00:00Z`);
    let cumulative = 0;
    while (cursor.getTime() <= now) {
      const month = cursor.toISOString().slice(0, 7),
        count = counts.get(month) ?? 0;
      cumulative += count;
      months.push({ month, commits: count, cumulative });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
  }
  return {
    version: 1,
    login,
    refreshedAt,
    scope: "authored-default-branches",
    totalCommits: commits.size,
    repositoryCount: new Set(repositories.map((r) => r.id)).size,
    includesPrivate: repositories.some((r) => r.private),
    months,
  };
}

/** Explicit allowlist: private history is never serialized through this reader. */
export function readGitHubActivity(input: unknown): GitHubActivity | null {
  if (!input || typeof input !== "object") return null;
  const p = input as Record<string, unknown>;
  const integer = (n: unknown): n is number =>
    typeof n === "number" && Number.isSafeInteger(n) && n >= 0;
  if (
    p.version !== 1 ||
    p.scope !== "authored-default-branches" ||
    typeof p.login !== "string" ||
    !/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(p.login) ||
    typeof p.refreshedAt !== "string" ||
    !Number.isFinite(Date.parse(p.refreshedAt)) ||
    !integer(p.totalCommits) ||
    !integer(p.repositoryCount) ||
    typeof p.includesPrivate !== "boolean" ||
    !Array.isArray(p.months) ||
    p.months.length > 2000
  )
    return null;
  let cumulative = 0,
    previous = "";
  const months: GitHubMonth[] = [];
  for (const raw of p.months) {
    if (!raw || typeof raw !== "object") return null;
    const m = raw as Record<string, unknown>;
    if (
      typeof m.month !== "string" ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(m.month) ||
      m.month <= previous ||
      m.month > p.refreshedAt.slice(0, 7) ||
      !integer(m.commits) ||
      !integer(m.cumulative) ||
      m.cumulative !== cumulative + m.commits
    )
      return null;
    previous = m.month;
    cumulative = m.cumulative;
    months.push({ month: m.month, commits: m.commits, cumulative });
  }
  if (cumulative !== p.totalCommits) return null;
  return {
    version: 1,
    login: p.login,
    refreshedAt: p.refreshedAt,
    scope: "authored-default-branches",
    totalCommits: p.totalCommits,
    repositoryCount: p.repositoryCount,
    includesPrivate: p.includesPrivate,
    months,
  };
}
