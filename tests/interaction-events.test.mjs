import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { parseInteraction, buildInteractionEvent } = loadTs(
  new URL(
    "../apps/web/src/server/analytics/interactionEvents.ts",
    import.meta.url,
  ),
);
const { buildPageView } = loadTs(
  new URL("../apps/web/src/server/analytics/pageView.ts", import.meta.url),
);
const { clickInteraction } = loadTs(
  new URL(
    "../apps/web/src/components/Analytics/InteractionTracker.tsx",
    import.meta.url,
  ),
);

const config = { websiteId: "site-1", saltSecret: "secret" };
const browser =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const day = new Date("2026-11-26T10:00:00Z");

function request(path, headers = {}) {
  return {
    method: "POST",
    nextUrl: new URL(path, "https://fuerst.one"),
    headers: new Headers({
      "user-agent": browser,
      "x-forwarded-for": "203.0.113.7",
      "x-vercel-ip-country": "DE",
      referer: "https://fuerst.one/en/projects?facet=ai",
      ...headers,
    }),
  };
}

test("only known click events with well-formed data are accepted", () => {
  assert.deepEqual(
    parseInteraction({
      name: "outbound",
      data: { url: "https://github.com/fuerst-one?tab=repositories#top" },
    }),
    { name: "outbound", data: { url: "https://github.com/fuerst-one" } },
  );
  assert.deepEqual(
    parseInteraction({ name: "download", data: { file: "png" } }),
    { name: "download", data: { file: "png" } },
  );
  assert.deepEqual(
    parseInteraction({ name: "explorer-used", data: { demo: "explorer" } }),
    { name: "explorer-used", data: { demo: "explorer" } },
  );
  for (const input of [
    null,
    "outbound",
    { name: "enquiry-sent" },
    { name: "outbound", data: { url: "javascript:alert(1)" } },
    { name: "outbound", data: { url: "https://x.dev/" + "a".repeat(300) } },
    { name: "download", data: { file: "../etc/passwd" } },
    { name: "explorer-used", data: { demo: "anything" } },
    { name: "outbound", data: { url: "https://github.com", extra: 1 } },
  ])
    assert.equal(parseInteraction(input), null, JSON.stringify(input));
});

test("an interaction joins the page view's session on the referring page", () => {
  const send = buildInteractionEvent(
    request("/api/analytics/events"),
    { name: "outbound", data: { url: "https://github.com/fuerst-one" } },
    config,
    day,
  );
  const pageView = buildPageView(
    {
      method: "GET",
      nextUrl: new URL("https://fuerst.one/en/projects"),
      headers: new Headers({
        "user-agent": browser,
        "x-forwarded-for": "203.0.113.7",
        "sec-fetch-dest": "document",
      }),
    },
    config,
    day,
  );
  assert.deepEqual(send.payload, {
    website: "site-1",
    hostname: "fuerst.one",
    url: "/en/projects",
    name: "outbound",
    data: { url: "https://github.com/fuerst-one" },
    salt: pageView.payload.salt,
  });
  assert.deepEqual(send.headers, {
    "user-agent": browser,
    "x-vercel-ip-country": "DE",
  });
});

test("server-side events like enquiry-sent carry no data", () => {
  const send = buildInteractionEvent(
    request("/api/enquiries", { referer: "https://fuerst.one/de/contact" }),
    { name: "enquiry-sent" },
    config,
    day,
  );
  assert.equal(send.payload.name, "enquiry-sent");
  assert.equal(send.payload.url, "/de/contact");
  assert.equal("data" in send.payload, false);
});

test("interactions are not counted without a page, a browser or with GPC", () => {
  const event = { name: "download", data: { file: "png" } };
  const built = (headers) =>
    buildInteractionEvent(
      request("/api/analytics/events", headers),
      event,
      config,
      day,
    );
  assert.equal(built({ referer: "https://evil.example/en" }), null);
  assert.equal(built({ referer: "https://fuerst.one/api/projects" }), null);
  assert.equal(built({ referer: "" }), null);
  assert.equal(built({ "user-agent": "" }), null);
  assert.equal(built({ "sec-gpc": "1" }), null);
});

test("clicks on outbound and download links become interactions", () => {
  const click = (href, download = "") =>
    clickInteraction({ href, download }, "fuerst.one");
  assert.deepEqual(click("https://github.com/fuerst-one?tab=stars"), {
    name: "outbound",
    data: { url: "https://github.com/fuerst-one" },
  });
  assert.deepEqual(click("blob:https://fuerst.one/1234", "plasma-2026.PNG"), {
    name: "download",
    data: { file: "png" },
  });
  assert.equal(click("https://fuerst.one/en/contact"), null);
  assert.equal(click("mailto:hello@example.com"), null);
  assert.equal(click("https://fuerst.one/en", "no-extension"), null);
});

test("analytics beacons use their own rate-limit budget", () => {
  const { checkRateLimit, RATE_LIMIT_PER_MINUTE } = loadTs(
    new URL("../apps/web/src/server/api/rateLimit.ts", import.meta.url),
  );
  const visitor = {
    headers: new Headers({ "x-forwarded-for": "198.51.100.9" }),
  };
  for (let i = 0; i < RATE_LIMIT_PER_MINUTE; i++)
    checkRateLimit(visitor, "analytics");
  assert.equal(checkRateLimit(visitor, "analytics").allowed, false);
  assert.equal(checkRateLimit(visitor).allowed, true);
});
