// Needs a web server started with analytics pointing at this test's collector:
//   UMAMI_URL=http://localhost:6898 UMAMI_WEBSITE_ID=test-site
//   ANALYTICS_SALT_SECRET=test-secret next dev -p <port>
// then: SEO_TEST_BASE_URL=http://localhost:<port> node --test tests/analytics.integration.mjs
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { after, before, test } from "node:test";

const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";
const collectorPort = Number(process.env.ANALYTICS_COLLECTOR_PORT || 6898);
const browser =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
let received = [];
let collector;

before(async () => {
  collector = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => {
      received.push({ headers: request.headers, body: JSON.parse(body) });
      response.end("{}");
    });
  });
  await new Promise((resolve) => collector.listen(collectorPort, resolve));
});
after(() => collector.close());

async function collected(count) {
  for (let i = 0; i < 50 && received.length < count; i++)
    await new Promise((resolve) => setTimeout(resolve, 100));
  return received;
}

test("a page load reaches Umami without IP, query or full referrer", async () => {
  received = [];
  const response = await fetch(`${base}/en/projects?utm_source=test&secret=1`, {
    headers: {
      "user-agent": browser,
      "sec-fetch-dest": "document",
      referer: "https://news.example/item?id=7",
      "x-forwarded-for": "203.0.113.9",
    },
  });
  assert.equal(response.status, 200);
  const [send] = await collected(1);
  assert.ok(send, "no page view arrived");
  assert.equal(send.body.type, "event");
  assert.equal(send.body.payload.website, "test-site");
  assert.equal(send.body.payload.url, "/en/projects?utm_source=test");
  assert.equal(send.body.payload.referrer, "https://news.example/");
  assert.equal(send.headers["x-analytics-client-ip"], "192.0.2.1");
  assert.equal(send.headers["user-agent"], browser);
  assert.ok(!JSON.stringify(send).includes("203.0.113.9"));
});

test("prefetches, API calls and GPC requests are not counted", async () => {
  received = [];
  await fetch(`${base}/en/hire`, {
    headers: { "user-agent": browser, rsc: "1", "next-router-prefetch": "1" },
  });
  await fetch(`${base}/en`, {
    headers: {
      "user-agent": browser,
      "sec-fetch-dest": "document",
      "sec-gpc": "1",
    },
  });
  await fetch(`${base}/api/profile/catalog`, {
    headers: { "user-agent": browser },
  });
  await new Promise((resolve) => setTimeout(resolve, 1500));
  assert.deepEqual(received, []);
});

test("shared profile signals arrive without the browser token", async () => {
  const { terms } = await (await fetch(`${base}/api/profile/catalog`)).json();
  const token = randomBytes(32).toString("hex");
  received = [];
  const response = await fetch(`${base}/api/profile/events`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: base,
      "user-agent": browser,
      "x-forwarded-for": "198.51.100.184",
    },
    body: JSON.stringify({
      version: 1,
      token,
      consentAt: Date.now(),
      events: [
        { id: randomUUID(), kind: "filter_selected", subject: terms[0].id },
      ],
    }),
  });
  assert.equal(response.status, 200);
  const [send] = await collected(1);
  assert.ok(send, "no profile signal arrived");
  assert.equal(send.body.payload.name, "profile_filter_selected");
  assert.deepEqual(send.body.payload.data, { subject: terms[0].id });
  assert.ok(!JSON.stringify(send).includes(token));
  await fetch(`${base}/api/profile/events`, {
    method: "DELETE",
    headers: { "content-type": "application/json", origin: base },
    body: JSON.stringify({ token }),
  });
});

test("the privacy pages describe the statistics when analytics is on", async () => {
  const en = await (await fetch(`${base}/en/privacy`)).text();
  const de = await (await fetch(`${base}/de/datenschutz`)).text();
  assert.match(en, /Visitor statistics/);
  assert.match(de, /Besucherstatistik/);
});
