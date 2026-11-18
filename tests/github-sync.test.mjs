import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const subject = () =>
  loadTs(
    new URL("../apps/sync/src/github/collectGitHubHistory.ts", import.meta.url),
  );
const sha = (n) => n.toString(16).padStart(40, "0");
const repo = (id, extra = {}) => ({
  id,
  full_name: `owner/repo-${id}`,
  private: true,
  default_branch: "main",
  pushed_at: "2026-01-01T00:00:00Z",
  ...extra,
});
const commit = (n) => ({
  sha: sha(n),
  author: { login: "owner" },
  commit: { author: { date: "2026-01-02T12:00:00Z" } },
});
const response = (data, status = 200) =>
  new Response(JSON.stringify(data), { status });

test("collector paginates inventory and history, pins the scanned branch head and strips private metadata", async () => {
  const { collectGitHubHistory } = subject();
  const fetcher = async (url, options) => {
    const u = new URL(url);
    assert.equal(u.origin, "https://api.github.com");
    assert.equal(options.headers.Authorization, "Bearer secret");
    if (u.pathname === "/user") return response({ login: "owner" });
    if (u.pathname === "/user/repos")
      return response(
        u.searchParams.get("page") === "1"
          ? Array.from({ length: 100 }, (_, i) =>
              repo(i + 1, { pushed_at: null }),
            )
          : [repo(101)],
      );
    if (u.pathname.endsWith("/branches/main"))
      return response({ commit: { sha: sha(999) } });
    assert.equal(u.searchParams.get("author"), "owner");
    assert.equal(u.searchParams.get("sha"), sha(999));
    return response(
      u.searchParams.get("page") === "1"
        ? Array.from({ length: 100 }, (_, i) => commit(i + 1))
        : [commit(101)],
    );
  };
  const result = await collectGitHubHistory({
    token: "secret",
    fetcher,
    now: "2026-03-20T12:00:00Z",
  });
  assert.equal(result.repositories.length, 101);
  assert.equal(result.repositories.at(-1).commits.length, 101);
  assert.equal(result.login, "owner");
  assert.doesNotMatch(
    JSON.stringify(result.repositories.at(-1).commits),
    /author|message|secret/,
  );
});
test("unchanged heads reuse history and changed heads fully reconcile removed commits", async () => {
  const { collectGitHubHistory } = subject();
  const previous = {
    login: "owner",
    repositories: [
      {
        ...repo(1),
        head: sha(5),
        syncedAt: "2026-03-19T12:00:00Z",
        commits: [{ sha: sha(1), date: "2026-01-02T12:00:00Z" }],
      },
    ],
  };
  for (const changed of [false, true]) {
    let historyReads = 0;
    const result = await collectGitHubHistory({
      token: "secret",
      previous,
      now: "2026-03-20T12:00:00Z",
      fetcher: async (url) => {
        const path = new URL(url).pathname;
        if (path === "/user") return response({ login: "owner" });
        if (path === "/user/repos") return response([repo(1)]);
        if (path.endsWith("/branches/main"))
          return response({ commit: { sha: sha(changed ? 6 : 5) } });
        historyReads++;
        return response([commit(2)]);
      },
    });
    assert.equal(historyReads, changed ? 1 : 0);
    assert.equal(result.repositories[0].commits[0].sha, sha(changed ? 2 : 1));
  }
});
test("an inaccessible repository or rate limit aborts the complete refresh instead of publishing a lower total", async () => {
  const { collectGitHubHistory } = subject();
  await assert.rejects(
    () =>
      collectGitHubHistory({
        token: "secret",
        now: "2026-03-20T12:00:00Z",
        fetcher: async (url) => {
          const path = new URL(url).pathname;
          if (path === "/user") return response({ login: "owner" });
          if (path === "/user/repos") return response([repo(1)]);
          return response({ message: "private detail secret" }, 403);
        },
      }),
    (error) =>
      !error.message.includes("private detail") &&
      !error.message.includes("secret"),
  );
});
test("a weekly reconciliation advances its timestamp so the next refresh reuses history", async () => {
  const { collectGitHubHistory } = subject();
  let scans = 0;
  const fetcher = async (url) => {
    const path = new URL(url).pathname;
    if (path === "/user") return response({ login: "owner" });
    if (path === "/user/repos") return response([repo(1)]);
    if (path.endsWith("/branches/main"))
      return response({ commit: { sha: sha(5) } });
    scans++;
    return response([commit(1)]);
  };
  const previous = {
    login: "owner",
    repositories: [
      {
        ...repo(1),
        head: sha(5),
        syncedAt: "2026-01-01T12:00:00Z",
        commits: [],
      },
    ],
  };
  const renewed = await collectGitHubHistory({
    token: "secret",
    previous,
    fetcher,
    now: "2026-03-20T12:00:00Z",
  });
  assert.equal(renewed.repositories[0].syncedAt, "2026-03-20T12:00:00Z");
  await collectGitHubHistory({
    token: "secret",
    previous: renewed,
    fetcher,
    now: "2026-03-20T13:00:00Z",
  });
  assert.equal(scans, 1);
});
test("an empty repository with a push timestamp is accepted only after an explicit empty-history response", async () => {
  const { collectGitHubHistory } = subject();
  for (const empty of [true, false]) {
    const load = () =>
      collectGitHubHistory({
        token: "secret",
        now: "2026-03-20T12:00:00Z",
        fetcher: async (url) => {
          const path = new URL(url).pathname;
          if (path === "/user") return response({ login: "owner" });
          if (path === "/user/repos") return response([repo(1)]);
          if (path.endsWith("/branches/main"))
            return response({ message: "Not Found" }, 404);
          return empty
            ? response({ message: "Git Repository is empty." }, 409)
            : response({ message: "Not Found" }, 404);
        },
      });
    if (empty) assert.deepEqual((await load()).repositories[0].commits, []);
    else await assert.rejects(load);
  }
});
