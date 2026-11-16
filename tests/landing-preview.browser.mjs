import assert from "node:assert/strict";
import { test } from "node:test";
import puppeteer from "puppeteer";

const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";
test("rapid keyboard navigation updates rendered geometry before navigation stops", async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.evaluateOnNewDocument(() => {
      window.shapeDraws = [];
      for (const context of [
        window.WebGLRenderingContext,
        window.WebGL2RenderingContext,
      ]) {
        if (!context) continue;
        for (const method of ["drawElements", "drawArrays"]) {
          const draw = context.prototype[method];
          context.prototype[method] = function (...args) {
            const result = draw.apply(this, args);
            const count = args[method === "drawElements" ? 1 : 2];
            if (count > 6)
              window.shapeDraws.push({ count, at: performance.now() });
            return result;
          };
        }
      }
    });
    await page.goto(`${base}/en`, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    await page.waitForSelector(".landing-backdrop canvas");
    await page.type("#landing-command", "ai");
    await page.waitForSelector(
      ".landing-discovery-panel a.landing-search-result",
    );
    await page.focus("#landing-command");
    await page.keyboard.press("ArrowDown");
    await page.waitForFunction(
      () =>
        document.querySelector(".landing").dataset.hero === "shape" &&
        window.shapeDraws.length > 0,
    );
    const initial = await page.evaluate(() => window.shapeDraws.at(-1).count);
    await page.keyboard.press("ArrowDown");
    await page.waitForFunction(
      (count) => window.shapeDraws.at(-1)?.count !== count,
      {},
      initial,
    );
    const second = await page.evaluate(() => window.shapeDraws.at(-1).count);
    await page.keyboard.press("ArrowUp");
    await page.waitForFunction(
      (count) => window.shapeDraws.at(-1)?.count === count,
      {},
      initial,
    );
    // Let the baseline transition finish, then keep changing the focused result
    // faster than the transition midpoint. Observe real WebGL geometry draws,
    // rather than only the selected row or its requested icon ID.
    await new Promise((resolve) => setTimeout(resolve, 750));
    const draws = await page.evaluate(async () => {
      window.shapeDraws = [];
      for (let index = 0; index < 18; index++) {
        document.activeElement.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: index % 2 === 0 ? "ArrowDown" : "ArrowUp",
            bubbles: true,
          }),
        );
        await new Promise((resolve) => setTimeout(resolve, 80));
      }
      return window.shapeDraws;
    });
    assert.ok(
      draws.some((draw) => draw.count === second),
      `the second project's geometry must render during rapid navigation (initial=${initial}, second=${second}, drawn=${[...new Set(draws.map((draw) => draw.count))]})`,
    );
  } finally {
    await browser.close();
  }
});
