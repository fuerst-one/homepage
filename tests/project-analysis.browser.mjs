import assert from "node:assert/strict";
import { test } from "node:test";
import puppeteer from "puppeteer";

const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6894";

for (const locale of ["en", "de"]) {
  test(`${locale}: sidebar view selector switches analysis and keeps chart filters connected`, async () => {
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 390, height: 844 });
      await page.goto(`${base}/${locale}/projects?experiences=AI+Engineering`, {
        waitUntil: "networkidle2",
        timeout: 90000,
      });
      const selector = "aside select";
      await page.waitForSelector(selector, { timeout: 3000 });
      assert.deepEqual(
        await page.$$eval(`${selector} option`, (options) =>
          options.map((option) => option.value),
        ),
        ["graph", "experiences", "industries", "projectType", "tools"],
      );
      assert.equal(
        await page.$eval(selector, (select) => select.value),
        "graph",
      );
      const panelId = await page.$eval(selector, (select) =>
        select.getAttribute("aria-controls"),
      );
      assert.ok(panelId);
      await page.select(selector, "tools");
      const tool = await page.waitForSelector(
        "aside [role=region] [role=progressbar]",
      );
      assert.equal(
        await page.$eval("aside [role=region]", (panel) => panel.id),
        panelId,
      );
      const toolRow = await tool.evaluateHandle(
        (element) => element.parentElement,
      );
      await toolRow.asElement().click();
      await page.waitForFunction(() =>
        new URLSearchParams(location.search).has("tools"),
      );
      assert.equal(
        new URL(page.url()).searchParams.get("experiences"),
        "AI Engineering",
      );
      await page.select(selector, "graph");
      await page.waitForFunction(() =>
        document
          .querySelector("aside [role=region]")
          ?.getAttribute("aria-label")
          .endsWith(": 3D Scatter"),
      );
      await page.waitForSelector("aside [role=region] canvas");
      assert.ok(await page.$("main .filter-active-summary"));
      assert.equal(
        await page.$$eval("aside select", (elements) => elements.length),
        1,
      );
    } finally {
      await browser.close();
    }
  });
}
