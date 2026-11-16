import assert from "node:assert/strict";
import { test } from "node:test";
import puppeteer from "puppeteer";
const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";
test("named filters remain visible and removable with the filter console collapsed", async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const data = await fetch(`${base}/api/projects?locale=en`).then(
      (response) => response.json(),
    );
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(`${base}/en/projects?experiences=AI+Engineering`, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    await page.waitForSelector(".filter-active-summary", { timeout: 5000 });
    assert.match(
      await page.$eval(".filter-active-summary", (e) => e.textContent),
      /AI Engineering/,
    );
    assert.equal(
      await page.$eval(".filter-active-summary", (e) =>
        e.parentElement
          .querySelector("button[aria-expanded]")
          .getAttribute("aria-expanded"),
      ),
      "false",
    );
    assert.ok(
      await page.$(
        '.filter-active-summary button[aria-label="Remove Areas of expertise: AI Engineering"]',
      ),
    );
    await page.click(
      '.filter-active-summary button[aria-label="Remove Areas of expertise: AI Engineering"]',
    );
    await page.waitForFunction(
      () => !new URLSearchParams(location.search).has("experiences"),
    );
    assert.equal(
      await page.$('.filter-active-summary button[aria-label^="Remove"]'),
      null,
    );
    await page.goto(
      `${base}/en/projects?experiences=AI+Engineering&tools=React.js`,
      { waitUntil: "networkidle2", timeout: 90000 },
    );
    await page.waitForFunction(
      () =>
        document.querySelectorAll(
          '.filter-active-summary button[aria-label^="Remove"]',
        ).length === 2,
    );
    await page.click(".filter-active-summary button[data-clear-filters]");
    await page.waitForFunction(
      () => new URLSearchParams(location.search).get("all") === "1",
    );
    assert.equal(
      await page.$('.filter-active-summary button[aria-label^="Remove"]'),
      null,
    );
    const legacyProject = data.results[0];
    await page.goto(`${base}/en/projects?id=${legacyProject.id}`, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    await page.waitForFunction(
      (name) =>
        document
          .querySelector(".filter-active-summary")
          ?.textContent.includes(name),
      {},
      legacyProject.name,
    );
    assert.equal(
      await page.$eval(
        ".filter-active-summary",
        (element, id) => element.textContent.includes(id),
        legacyProject.id,
      ),
      false,
    );
    await page.goto(`${base}/en/projects?buyerNeeds=Add+AI+capabilities`, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    const matching = data.results.filter((project) =>
      project.matching?.buyerNeeds.includes("Add AI capabilities"),
    ).length;
    assert.ok(matching > 0);
    await page.waitForFunction(
      (expected) =>
        document
          .querySelector(".filter-active-summary [role=status]")
          ?.textContent.trim() === `${expected} results`,
      {},
      matching,
    );
    assert.match(
      await page.$eval(
        ".filter-active-summary",
        (element) => element.textContent,
      ),
      /Buyer need:.*Add AI capabilities/,
    );
    await page.screenshot({ path: "/tmp/homepage-active-filters-desktop.png" });
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${base}/de/projects?experiences=AI+Engineering`, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    await page.waitForSelector(".filter-active-summary");
    assert.match(
      await page.$eval(".filter-active-summary", (e) => e.textContent),
      /Aktive Filter/,
    );
    assert.ok(
      await page.$(
        '.filter-active-summary button[aria-label="Entfernen Fachgebiete: AI Engineering"]',
      ),
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.screenshot({ path: "/tmp/homepage-active-filters-mobile.png" });
  } finally {
    await browser.close();
  }
});
