import assert from "node:assert/strict";
import { test } from "node:test";
import puppeteer from "puppeteer";

// Rules v3 in a real browser: a click earns credit for what the card showed,
// scaled by its time in view; a page earns credit only after a stay or an
// interaction, and its regions only once they were in view.
const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";
const key = "fuerst-one:visitor-profile:v1";
const STAY_MS = 10_000;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function startProfile(page) {
  await page.goto(`${base}/en/profile`, { waitUntil: "networkidle2" });
  await page.waitForFunction(() => {
    const button = document.querySelector(".profile-summary-actions button");
    return button && !button.disabled;
  });
  for (const button of await page.$$(".profile-summary-actions button"))
    if (
      (await button.evaluate((el) => el.textContent.trim())) ===
      "Start my live profile"
    ) {
      await button.click();
      break;
    }
  await page.waitForFunction((key) => !!localStorage.getItem(key), {}, key);
}
const signals = (page) =>
  page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) || "null").profile.signals,
    key,
  );
const signal = async (page, kind, subject) =>
  (await signals(page)).find((s) => s.kind === kind && s.subject === subject);
const waitForSignal = (page, kind, subject, timeout = 20_000) =>
  page.waitForFunction(
    (key, kind, subject) =>
      JSON.parse(localStorage.getItem(key) || "null")?.profile.signals.some(
        (s) => s.kind === kind && s.subject === subject,
      ),
    { timeout },
    key,
    kind,
    subject,
  );
async function openList(page, locale) {
  await page.goto(`${base}/${locale}/projects`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector(".profile-pixel-launcher");
  await page.waitForSelector("article[data-profile-region]");
}
async function cardIds(page) {
  return page.$$eval("article[data-profile-region^='card:']", (cards) =>
    cards.map((card) => card.dataset.profileRegion.slice("card:".length)),
  );
}
/** Bring a card fully into view, wait, and click its own link or thumbnail. */
async function clickCard(page, id, waitMs, part = "link") {
  const card = await page.$(`article[data-profile-region="card:${id}"]`);
  await card.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await pause(waitMs);
  const target =
    part === "link"
      ? "a[aria-label]:not([data-profile-proof])"
      : "button[aria-label]";
  if (part === "link")
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded" }),
      card.$eval(target, (el) => el.click()),
    ]);
  else await (await card.$(target)).click();
}

for (const locale of ["en", "de"])
  test(
    `${locale}: clicks, stays and regions earn Rules v3 credit`,
    {
      timeout: 300_000,
    },
    async () => {
      const browser = await puppeteer.launch({ headless: true });
      try {
        const page = await browser.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.setViewport({ width: 1360, height: 900 });
        await startProfile(page);
        await openList(page, locale);
        // Cards from the third on start below the fold, so their time in view
        // starts with the scroll the test makes.
        const [considered, , half, hasty, previewed, pasted] =
          await cardIds(page);

        // A hasty click earns nothing, and leaving before the stay earns nothing.
        await clickCard(page, hasty, 0);
        await page.waitForSelector(`[data-profile-project="${hasty}"]`);
        await pause(3000);
        await openList(page, locale);
        assert.equal(
          await signal(page, "project_card_clicked", hasty),
          undefined,
        );
        assert.equal(
          await signal(page, "project_details_viewed", hasty),
          undefined,
          "a bounce records no page signal",
        );

        // A considered click earns full credit, and so does the page after a stay.
        await clickCard(page, considered, 3300);
        assert.equal(
          (await signal(page, "project_card_clicked", considered))?.strength,
          1,
        );
        await page.waitForSelector(`[data-profile-project="${considered}"]`);
        await pause(STAY_MS - 3000);
        assert.equal(
          await signal(page, "project_details_viewed", considered),
          undefined,
          "no page signal before the stay",
        );
        await waitForSignal(page, "project_details_viewed", considered);
        assert.equal(
          (await signal(page, "project_details_viewed", considered)).strength,
          1,
        );
        const needs = await page.$(
          `[data-profile-region="project:${considered}|needs"]`,
        );
        await needs.evaluate((el) => el.scrollIntoView({ block: "center" }));
        await waitForSignal(
          page,
          "project_region_viewed",
          `${considered}|needs`,
        );
        assert.equal(
          await signal(page, "project_region_viewed", `${considered}|details`),
          undefined,
          "the details table was not in view yet",
        );
        const details = await page.$(
          `[data-profile-region="project:${considered}|details"]`,
        );
        await details.evaluate((el) => el.scrollIntoView({ block: "start" }));
        await waitForSignal(
          page,
          "project_region_viewed",
          `${considered}|details`,
        );
        assert.equal(
          (await signal(page, "project_region_viewed", `${considered}|details`))
            .strength,
          1,
        );

        // A half-considered click; an interaction ends the bounce window early.
        await openList(page, locale);
        await clickCard(page, half, 1200);
        assert.equal(
          (await signal(page, "project_card_clicked", half))?.strength,
          0.5,
        );
        await page.waitForSelector(`[data-profile-project="${half}"]`);
        await page.click(`[data-profile-project="${half}"] details summary`);
        await waitForSignal(page, "project_details_viewed", half, 3000);
        assert.equal(
          (await signal(page, "project_details_viewed", half)).strength,
          0.75,
        );

        // A pasted URL is an arrival without a click the profile saw.
        await openList(page, locale);
        const href = await page.$eval(
          `article[data-profile-region="card:${pasted}"] a[aria-label]:not([data-profile-proof])`,
          (a) => a.getAttribute("href"),
        );
        await page.goto(`${base}${href}`, { waitUntil: "domcontentloaded" });
        await waitForSignal(page, "project_details_viewed", pasted);
        assert.equal(
          (await signal(page, "project_details_viewed", pasted)).strength,
          0.5,
        );

        // The preview dialog: its stay and its needs block follow the same rules.
        await openList(page, locale);
        await clickCard(page, previewed, 3300, "thumbnail");
        await page.waitForSelector(
          `[role=dialog] [data-profile-region="project:${previewed}|needs"]`,
        );
        assert.equal(
          (await signal(page, "project_card_clicked", previewed))?.strength,
          1,
        );
        assert.equal(
          await signal(page, "project_opened", previewed),
          undefined,
          "opening the preview is not yet a stay",
        );
        await waitForSignal(page, "project_opened", previewed);
        assert.equal(
          (await signal(page, "project_opened", previewed)).strength,
          1,
        );
        await waitForSignal(
          page,
          "project_region_viewed",
          `${previewed}|needs`,
        );
        assert.deepEqual(errors, []);
      } finally {
        await browser.close();
      }
    },
  );

test(
  "closing the preview before the stay records nothing",
  {
    timeout: 120_000,
  },
  async () => {
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1360, height: 900 });
      await startProfile(page);
      await openList(page, "en");
      const [id] = await cardIds(page);
      await clickCard(page, id, 3300, "thumbnail");
      await page.waitForSelector('[role="dialog"][data-state="open"]');
      await pause(1000);
      await page.click(
        '[role="dialog"] button[aria-label="Close project details"]',
      );
      await page.waitForSelector('[role="dialog"]', { hidden: true });
      await pause(STAY_MS);
      assert.equal(await signal(page, "project_opened", id), undefined);
      assert.equal(
        (await signal(page, "project_card_clicked", id))?.strength,
        1,
      );
    } finally {
      await browser.close();
    }
  },
);

test(
  "a project selected in the explorer follows the stay rule",
  {
    timeout: 120_000,
  },
  async () => {
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1360, height: 900 });
      await startProfile(page);
      await page.goto(`${base}/en/explorer`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".profile-pixel-launcher");
      // Locators wait for a clickable node; the explorer re-renders as it loads.
      await page.locator(".vs-cluster-trigger").click();
      const selectMember = async (index) => {
        await page
          .locator(`.vs-members li:nth-child(${index + 1}) button`)
          .click();
        await page.waitForSelector(".vs-selected");
        return page.evaluate(() =>
          new URL(location.href).searchParams.get("project"),
        );
      };

      // Clicking through: a selection left before the stay records nothing.
      const passed = await selectMember(0);
      await pause(1000);
      await page.locator(".vs-back-cluster").click();
      const stayed = await selectMember(1);
      assert.notEqual(stayed, passed);
      assert.equal(
        await signal(page, "project_opened", stayed),
        undefined,
        "selecting a project is not yet a stay",
      );
      await waitForSignal(page, "project_opened", stayed);
      assert.equal((await signal(page, "project_opened", stayed)).strength, 1);
      assert.equal(await signal(page, "project_opened", passed), undefined);

      // A selection the profile saw no click for arrives like a pasted URL.
      await page.goto(`${base}/en/explorer?project=${passed}`, {
        waitUntil: "domcontentloaded",
      });
      await waitForSignal(page, "project_opened", passed);
      assert.equal(
        (await signal(page, "project_opened", passed)).strength,
        0.5,
      );
    } finally {
      await browser.close();
    }
  },
);
