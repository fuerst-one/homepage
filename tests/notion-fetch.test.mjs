import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const { createNotionFetch: factory } = loadTs(
  new URL("../src/server/notion/createNotionFetch.ts", import.meta.url),
);
const createNotionFetch = (fetcher, wait) =>
  factory(fetcher, wait, {
    gate: { acquire: async () => 0, defer: async () => {} },
    jitter: () => 0,
  });

test("Notion rate limits are retried after the server's requested delay", async () => {
  let calls = 0;
  const delays = [];
  const request = createNotionFetch(
    async () =>
      ++calls === 1
        ? new Response("rate limited", {
            status: 429,
            headers: { "Retry-After": "2" },
          })
        : Response.json({ id: "public-project" }),
    async (ms) => {
      delays.push(ms);
    },
  );
  const response = await request("https://api.notion.com/v1/pages/example");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { id: "public-project" });
  assert.deepEqual(delays, [2000]);
});

test("persistent rate limits stop after three attempts", async () => {
  let calls = 0;
  const request = createNotionFetch(
    async () => {
      calls++;
      return new Response("rate limited", { status: 429 });
    },
    async () => {},
  );
  assert.equal((await request("https://api.notion.com")).status, 429);
  assert.equal(calls, 3);
});

test("other API errors are returned without retrying", async () => {
  let calls = 0;
  const request = createNotionFetch(
    async () => {
      calls++;
      return new Response("forbidden", { status: 403 });
    },
    async () => {
      throw new Error("Unexpected retry");
    },
  );
  assert.equal((await request("https://api.notion.com")).status, 403);
  assert.equal(calls, 1);
});
