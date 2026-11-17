import assert from "node:assert/strict";
import { test } from "node:test";
import puppeteer from "puppeteer";

const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6894";

const observeIntro = () => {
  window.introFrames = {};
  const selectors = {
    background: ".landing-backdrop",
    brand: ".landing-brand",
    controls: ".landing-header",
  };
  const sample = (now) => {
    for (const [name, selector] of Object.entries(selectors)) {
      const element = document.querySelector(selector);
      if (!element) continue;
      const style = getComputedStyle(element);
      const opacity = Number(style.opacity);
      if (style.visibility !== "visible" || opacity <= 0) continue;
      window.introFrames[name] ??= { start: now };
      if (opacity >= 0.99) window.introFrames[name].end ??= now;
    }
    requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
};

const brandPosition = (page) =>
  page.$eval(".landing-brand a", (brand) => {
    const label = brand.getBoundingClientRect();
    const stage = brand.closest(".landing-stage").getBoundingClientRect();
    return {
      x: label.left + label.width / 2 - stage.left - stage.width / 2,
      y: label.top + label.height / 2 - stage.top - stage.height / 2,
      cellSize: label.width / brand.textContent.length,
      href: brand.getAttribute("href"),
      hidden: getComputedStyle(brand).visibility === "hidden",
    };
  });

for (const width of [390, 1440]) {
  test(`${width}px: the landing wordmark is revealed only after its position is ready`, async () => {
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width, height: 900 });
      await page.evaluateOnNewDocument(observeIntro);
      for (const locale of ["en", "de"]) {
        await page.setJavaScriptEnabled(false);
        await page.goto(`${base}/${locale}`, {
          waitUntil: "networkidle2",
          timeout: 90000,
        });
        const firstPaint = await brandPosition(page);
        assert.equal(
          firstPaint.hidden,
          true,
          "Unpositioned wordmark stays hidden",
        );
        assert.equal(firstPaint.href, `/${locale}/projects`);
        assert.equal(
          await page.$eval(
            ".landing-header",
            (header) => getComputedStyle(header).visibility,
          ),
          "hidden",
          "Surrounding UI waits for the plasma and wordmark",
        );

        await page.setJavaScriptEnabled(true);
        await page.reload({ waitUntil: "networkidle2", timeout: 90000 });
        await page.waitForSelector(".landing-backdrop canvas");
        await page.waitForFunction(() => {
          const brand = document.querySelector(".landing-brand");
          return (
            getComputedStyle(brand).visibility === "visible" &&
            parseFloat(getComputedStyle(brand).opacity) > 0
          );
        });
        const hydrated = await brandPosition(page);
        assert.ok(
          Math.abs(hydrated.x) <= hydrated.cellSize / 2 + 1 &&
            Math.abs(hydrated.y) <= hydrated.cellSize / 2 + 1,
          `Hydration only aligns the centered wordmark to the nearest plasma cell: ${JSON.stringify(hydrated)}`,
        );
        assert.equal(hydrated.href, firstPaint.href);
        await page.waitForFunction(() => window.introFrames?.controls?.end);
        const frames = await page.evaluate(() => window.introFrames);
        assert.ok(frames.background.start < frames.brand.start);
        assert.ok(
          frames.controls.start - frames.brand.start >= 500,
          "Controls pause after the wordmark appears",
        );
        assert.ok(
          frames.controls.end - frames.controls.start >= 500,
          "Controls enter with a gradual fade",
        );
      }
    } finally {
      await browser.close();
    }
  });
}

for (const graphics of ["2d", "unavailable"]) {
  test(`${graphics}: navigation remains available with reduced motion`, async () => {
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.emulateMediaFeatures([
        { name: "prefers-reduced-motion", value: "reduce" },
      ]);
      await page.evaluateOnNewDocument((graphics) => {
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
          if (graphics === "unavailable" || kind === "webgl2") return null;
          return getContext.call(this, kind, ...args);
        };
      }, graphics);
      await page.goto(`${base}/en`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector('.landing[data-intro="ready"]', {
        timeout: graphics === "2d" ? 3000 : 7000,
      });
      assert.equal(
        await page.$eval(".landing-console", (console) => console.inert),
        false,
      );
      assert.equal(
        await page.$eval(".landing-header", (header) => {
          const style = getComputedStyle(header);
          return style.visibility === "visible" && Number(style.opacity) === 1;
        }),
        true,
      );
    } finally {
      await browser.close();
    }
  });
}
