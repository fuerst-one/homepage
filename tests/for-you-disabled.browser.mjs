import assert from "node:assert/strict";
import { after, before, test as runTest } from "node:test";
import puppeteer from "puppeteer";
import { loadTs } from "./helpers/load-ts.mjs";

const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6895";
const { FOR_YOU_ENABLED } = loadTs(
  new URL("../apps/web/src/lib/forYouEnabled.ts", import.meta.url),
);
// The released state is covered by for-you-hint and for-you-page.
const test = FOR_YOU_ENABLED ? runTest.skip : runTest;

const PROFILE_KEY = "fuerst-one:visitor-profile:v1";
const LAUNCHER = ".profile-pixel-launcher";
const ENTRIES = {
  "header link": ".content-header-for-you",
  "ready hint": ".profile-for-you-hint",
  "dock button": ".profile-for-you-button",
};

function readyProfile() {
  const now = Date.now();
  const at = now - 60_000;
  const signals = [
    ["topic_selected", "buyerNeeds:Automate repetitive work"],
    ["explorer_term_selected", "buyerNeeds:Make data actionable"],
  ];
  return {
    version: 1,
    profile: {
      version: 1,
      startedAt: now - 600_000,
      updatedAt: at + signals.length,
      signals: signals.map(([kind, subject], index) => ({
        id: crypto.randomUUID(),
        kind,
        subject,
        at: at + index,
      })),
      preferences: {},
    },
    orientation: null,
    interactions: signals.length,
    forYouHintSeen: false,
    forYouUnlocked: true,
    token: "",
    sharing: false,
    consentAt: now - 600_000,
    pending: [],
  };
}

let browser;
before(async () => {
  browser = await puppeteer.launch({ headless: true });
});
after(() => browser?.close());

for (const [locale, width] of [
  ["en", 1360],
  ["de", 375],
])
  test(`${locale} at ${width}px: a ready profile gets no entry to For you and stays ready`, async () => {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900 });
    await page.evaluateOnNewDocument(
      (key, value) => localStorage.setItem(key, value),
      PROFILE_KEY,
      JSON.stringify(readyProfile()),
    );
    await page.goto(`${base}/${locale}/projects?all=1`, {
      waitUntil: "networkidle0",
      timeout: 120_000,
    });
    await page.waitForSelector(LAUNCHER, { timeout: 30_000 });
    // The entries would arrive with the launcher; give a late one time to show.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    for (const [name, selector] of Object.entries(ENTRIES))
      assert.equal(await page.$(selector), null, name);
    await page.click(LAUNCHER);
    await page.waitForFunction(
      (locale) => location.pathname === `/${locale}/profile`,
      {},
      locale,
    );
    const saved = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)),
      PROFILE_KEY,
    );
    assert.equal(saved.forYouUnlocked, true, "readiness is kept for release");
    assert.equal(saved.forYouHintSeen, false, "the hint is still due then");
    await page.close();
  });
