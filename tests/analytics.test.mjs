import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { buildPageView } = loadTs(
  new URL("../apps/web/src/server/analytics/pageView.ts", import.meta.url),
);
const { buildProfileSignalEvents } = loadTs(
  new URL(
    "../apps/web/src/server/analytics/profileSignals.ts",
    import.meta.url,
  ),
);

const config = { websiteId: "site-1", saltSecret: "secret" };
const browser =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const day = new Date("2026-11-24T10:00:00Z");

function request(path, headers = {}, method = "GET") {
  return {
    method,
    nextUrl: new URL(path, "https://fuerst.one"),
    headers: new Headers({
      "user-agent": browser,
      "sec-fetch-dest": "document",
      "x-forwarded-for": "203.0.113.7, 10.0.0.1",
      ...headers,
    }),
  };
}

test("a document navigation becomes a minimal Umami page view", () => {
  const view = buildPageView(
    request("/en/projects?utm_source=newsletter&ref=x&_rsc=abc", {
      referer: "https://www.google.com/search?q=fuerst",
      "accept-language": "de-DE,de;q=0.9,en;q=0.8",
      "x-vercel-ip-country": "DE",
      "x-vercel-ip-city": "Berlin",
    }),
    config,
    day,
  );
  assert.deepEqual(view.payload, {
    website: "site-1",
    hostname: "fuerst.one",
    url: "/en/projects?utm_source=newsletter",
    referrer: "https://www.google.com/",
    language: "de-DE",
    salt: view.payload.salt,
  });
  assert.match(view.payload.salt, /^[0-9a-f]{64}$/);
  assert.deepEqual(view.headers, {
    "user-agent": browser,
    "x-vercel-ip-country": "DE",
  });
});

test("client navigations count, prefetches and other requests do not", () => {
  const counted = (path, headers, method) =>
    buildPageView(request(path, headers, method), config, day) !== null;
  assert.equal(counted("/de", { "sec-fetch-dest": "", rsc: "1" }), true);
  assert.equal(
    counted("/en/hire", { rsc: "1", "next-router-prefetch": "1" }),
    false,
  );
  assert.equal(counted("/en", { "sec-purpose": "prefetch" }), false);
  assert.equal(counted("/en", { "sec-fetch-dest": "image" }), false);
  assert.equal(counted("/en", {}, "POST"), false);
  assert.equal(counted("/api/projects/search"), false);
  assert.equal(counted("/fr/projects"), false);
  assert.equal(counted("/english"), false);
  assert.equal(counted("/en/opengraph-image.png"), false);
  assert.equal(counted("/en", { "sec-gpc": "1" }), false);
  assert.equal(counted("/en", { "user-agent": "" }), false);
});

test("own-site and non-web referrers and odd languages are dropped", () => {
  const view = buildPageView(
    request("/en/contact", {
      referer: "https://fuerst.one/en/projects",
      "accept-language": "*",
      "x-vercel-ip-country": "XX1",
    }),
    config,
    day,
  );
  assert.equal(view.payload.referrer, undefined);
  assert.equal(view.payload.language, undefined);
  assert.deepEqual(view.headers, { "user-agent": browser });
  const app = buildPageView(
    request("/en", { referer: "android-app://com.slack/" }),
    config,
    day,
  );
  assert.equal(app.payload.referrer, undefined);
});

test("the visitor salt holds for a day and changes with the date and visitor", () => {
  const salt = (headers, at) =>
    buildPageView(request("/en", headers), config, at).payload.salt;
  const first = salt({}, day);
  assert.equal(salt({}, new Date("2026-11-24T23:59:00Z")), first);
  assert.notEqual(salt({}, new Date("2026-11-25T00:01:00Z")), first);
  assert.notEqual(salt({ "x-forwarded-for": "198.51.100.2" }, day), first);
  assert.notEqual(
    buildPageView(request("/en"), { ...config, saltSecret: "other" }, day)
      .payload.salt,
    first,
  );
});

test("shared profile signals become anonymous Umami events", () => {
  const sends = buildProfileSignalEvents(
    [
      {
        id: "0b6c3f8e-2f4a-4a51-9a52-2f1d6b0c7e11",
        kind: "filter_selected",
        subject: "need:automation",
        strength: 0.5,
      },
      {
        id: "1b6c3f8e-2f4a-4a51-9a52-2f1d6b0c7e12",
        kind: "preference_changed",
        subject: "method:rag",
        preference: "exclude",
        previous: "auto",
        inferredScore: 7,
        basis: { project_opened: 2 },
      },
    ],
    { websiteId: "site-1", hostname: "fuerst.one", userAgent: browser },
    "batch-salt",
  );
  assert.deepEqual(
    sends.map((send) => send.payload),
    [
      {
        website: "site-1",
        hostname: "fuerst.one",
        url: "/profile-signals",
        name: "profile_filter_selected",
        data: { subject: "need:automation", strength: 0.5 },
        salt: "batch-salt",
      },
      {
        website: "site-1",
        hostname: "fuerst.one",
        url: "/profile-signals",
        name: "profile_preference_changed",
        data: {
          subject: "method:rag",
          preference: "exclude",
          previous: "auto",
        },
        salt: "batch-salt",
      },
    ],
  );
  assert.deepEqual(sends[0].headers, { "user-agent": browser });
});
