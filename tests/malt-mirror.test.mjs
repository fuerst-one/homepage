import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const { parseMaltProfile, maltMirrorView, readMaltMirror, MALT_PROFILE_URL } =
  loadTs(new URL("../packages/content/src/maltMirror.ts", import.meta.url));
const { refreshMaltMirror } = loadTs(
  new URL("../packages/database/src/refreshMaltMirror.ts", import.meta.url),
);
const now = Date.parse("2026-11-15T10:00:00Z");
const at = new Date(now).toISOString();
const html = (price = 750, currency = "EUR", url = MALT_PROFILE_URL) =>
  `<script type="application/ld+json">${JSON.stringify({ "@type": "ProfilePage", mainEntity: { "@type": "Person", name: "Alexander Fuerst", url, makesOffer: { price, priceCurrency: currency, availability: "https://schema.org/InStock", priceValidUntil: "2027-11-15" } } })}</script><span data-testid="profile-price">€${price}/day</span>`;
const observed = () => parseMaltProfile(html(), at, "browser-verified");
const state = () => ({
  version: 1,
  profileUrl: MALT_PROFILE_URL,
  observation: observed(),
  lastAttempt: { at, status: "ok" },
});

test("the Malt rate requires the intended profile, matching visible price and explicit day unit", () => {
  const result = observed();
  assert.equal(result.rate.amount, 750);
  assert.equal(result.rate.currency, "EUR");
  assert.equal(result.rate.unit, "day");
  for (const source of [
    html(750, "USD"),
    html(750, "EUR", "https://www.malt.com/profile/someone-else"),
    html().replace("€750/day", "€900/day"),
    html().replace("/day", "/hour"),
    "<html>Checking your browser</html>",
  ])
    assert.throws(() => parseMaltProfile(source, at, "public-fetch"));
});

test("InStock and a price-valid-until date never become freelancer availability or owner confirmation", () => {
  assert.equal(observed().availability.status, "unknown");
  assert.equal(observed().availability.confirmedAt, null);
  const view = maltMirrorView(state(), now);
  assert.equal(view.available, null);
  assert.equal(view.rate.amount, 750);
  assert.equal(view.observedAt, at);
});

test("a valid unpublished rate clears the numeric rate instead of resurrecting an older value", () => {
  const source = `<script type="application/ld+json">${JSON.stringify({ "@type": "ProfilePage", mainEntity: { "@type": "Person", name: "Alexander Fuerst", url: MALT_PROFILE_URL } })}</script>`;
  const result = parseMaltProfile(source, at, "public-fetch");
  assert.equal(result.rate, null);
});

test("stale, future, malformed and missing observations cannot display a current rate", () => {
  assert.equal(maltMirrorView(state(), now + 8 * 86400000).rate, null);
  assert.equal(maltMirrorView(state(), now - 1000).rate, null);
  assert.equal(maltMirrorView(null, now).available, null);
  assert.equal(readMaltMirror('{"version":9}'), null);
  assert.equal(
    readMaltMirror(
      JSON.stringify({ ...state(), profileUrl: "https://evil.example" }),
    ),
    null,
  );
});

test("a blocked refresh preserves the last verified observation and does not renew freshness", async () => {
  const original = state();
  let saved;
  const result = await refreshMaltMirror(
    {
      read: async () => original,
      write: async (value) => {
        saved = value;
      },
    },
    async () => ({ status: 403, html: "challenge" }),
    now + 86400000,
  );
  assert.deepEqual(saved.observation, original.observation);
  assert.equal(saved.lastAttempt.status, "blocked");
  assert.equal(result.status, "blocked");
  assert.equal(maltMirrorView(saved, now + 8 * 86400000).rate, null);
});

test("transport and markup failures remain distinct and never overwrite a verified rate", async () => {
  for (const [fetcher, status] of [
    [
      async () => {
        throw new Error("network");
      },
      "error",
    ],
    [
      async () => ({ status: 200, html: "<h1>Changed markup</h1>" }),
      "parse-error",
    ],
  ]) {
    let saved;
    await refreshMaltMirror(
      {
        read: async () => state(),
        write: async (value) => {
          saved = value;
        },
      },
      fetcher,
      now + 86400000,
    );
    assert.equal(saved.lastAttempt.status, status);
    assert.equal(saved.observation.rate.amount, 750);
  }
});

test("a successful refresh persists a new source observation and clears an old error", async () => {
  let saved;
  const result = await refreshMaltMirror(
    {
      read: async () => state(),
      write: async (value) => {
        saved = value;
      },
    },
    async () => ({ status: 200, html: html(800) }),
    now + 86400000,
  );
  assert.equal(result.status, "ok");
  assert.equal(saved.observation.rate.amount, 800);
  assert.equal(saved.observation.method, "public-fetch");
  assert.equal(
    saved.observation.observedAt,
    new Date(now + 86400000).toISOString(),
  );
});

test("availability requires a recent explicit confirmation as well as a fresh observation", () => {
  const value = state();
  value.observation.availability = { status: "available", confirmedAt: at };
  assert.equal(maltMirrorView(value, now).available, true);
  assert.equal(maltMirrorView(value, now + 2 * 86400000).available, null);
  value.observation.availability = { status: "unavailable", confirmedAt: at };
  assert.equal(maltMirrorView(value, now).available, false);
  value.observation.availability = { status: "available", confirmedAt: null };
  assert.equal(maltMirrorView(value, now).available, null);
});

test("a failed in-flight refresh preserves an observation imported while it was fetching", async () => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  let current = state();
  const job = refreshMaltMirror(
    {
      read: async () => structuredClone(current),
      write: async (value) => {
        current = value;
      },
    },
    async () => {
      await gate;
      return { status: 403, html: "" };
    },
    now + 1000,
  );
  await new Promise((resolve) => setImmediate(resolve));
  current = {
    ...state(),
    observation: {
      ...observed(),
      observedAt: new Date(now + 2000).toISOString(),
      rate: { amount: 800, currency: "EUR", unit: "day" },
    },
  };
  release();
  await job;
  assert.equal(current.observation.rate.amount, 800);
});
