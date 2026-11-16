import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { createNotionFetch } = loadTs(
  new URL("../src/server/notion/createNotionFetch.ts", import.meta.url),
);

function clock() {
  let time = 0;
  let next = 0;
  let cooldown = 0;
  return {
    now: () => time,
    wait: async (ms) => {
      time += ms;
    },
    gate: {
      async acquire() {
        const delay = Math.max(next, cooldown) - time;
        if (delay > 0) return delay;
        next = time + 550;
        return 0;
      },
      async defer(ms) {
        cooldown = Math.max(cooldown, time + ms);
      },
    },
  };
}

test("a Notion cooldown also stops another client using the same gate", async () => {
  const c = clock();
  const options = {
    gate: c.gate,
    now: c.now,
    maxWaitMs: 2500,
    jitter: () => 0,
  };
  const failing = createNotionFetch(
    async () =>
      new Response("limited", {
        status: 429,
        headers: { "Retry-After": "60" },
      }),
    c.wait,
    options,
  );
  assert.equal(
    (await failing("https://api.notion.com/v1/pages/x")).status,
    429,
  );
  let calls = 0;
  const another = createNotionFetch(
    async () => {
      calls++;
      return Response.json({});
    },
    c.wait,
    options,
  );
  await assert.rejects(
    another("https://api.notion.com/v1/pages/y"),
    /backoff/i,
  );
  assert.equal(calls, 0);
  assert.equal(c.now(), 0, "a long cooldown does not hold the caller open");
});

test("separate Notion clients pace requests through a shared gate", async () => {
  const c = clock();
  const sent = [];
  const request = () =>
    createNotionFetch(
      async () => {
        sent.push(c.now());
        return Response.json({});
      },
      c.wait,
      { gate: c.gate, now: c.now },
    );
  await request()("https://api.notion.com/v1/pages/x");
  await request()("https://api.notion.com/v1/pages/y");
  assert.ok(sent[1] - sent[0] >= 550);
});

test("Notion overload uses Retry-After and retries within the caller budget", async () => {
  const c = clock();
  let calls = 0;
  const request = createNotionFetch(
    async () =>
      ++calls === 1
        ? new Response("busy", { status: 529, headers: { "Retry-After": "2" } })
        : Response.json({ id: "ok" }),
    c.wait,
    { gate: c.gate, now: c.now, jitter: () => 0 },
  );
  assert.equal(
    (await request("https://api.notion.com/v1/pages/x")).status,
    200,
  );
  assert.equal(c.now(), 2000);
});

test("restricted access is not retried and uncertain writes are not replayed", async () => {
  for (const status of [429, 503]) {
    const c = clock();
    let calls = 0;
    const request = createNotionFetch(
      async () => {
        calls++;
        return Response.json(
          {
            additional_data: {
              rate_limit_reason: "public_api_request_blocked",
            },
          },
          { status },
        );
      },
      c.wait,
      { gate: c.gate, now: c.now },
    );
    assert.equal(
      (await request("https://api.notion.com/v1/pages", { method: "POST" }))
        .status,
      status,
    );
    assert.equal(calls, 1);
  }
});

test("maintenance diagnostics keep useful codes while excluding private error content", () => {
  const { notionFailure } = loadTs(
    new URL("../src/server/notion/notionDiagnostics.ts", import.meta.url),
  );
  assert.deepEqual(
    notionFailure({
      code: "42501",
      message: "private brief",
      query: "secret",
      parameters: ["email@example.invalid"],
    }),
    { code: "42501" },
  );
  assert.deepEqual(
    notionFailure({
      code: "rate_limited",
      status: 429,
      body: { private: "brief" },
    }),
    { code: "rate_limited", status: 429 },
  );
  assert.deepEqual(
    notionFailure({ code: "private-token", message: "secret" }),
    { code: "unknown" },
  );
});
