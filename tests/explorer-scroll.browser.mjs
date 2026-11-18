import assert from "node:assert/strict";
import { test } from "node:test";
import puppeteer from "puppeteer";

const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6894";

async function readyChart(page, path) {
  await page.setViewport({ width: 1280, height: 1000 });
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "reduce" },
  ]);
  await page.goto(`${base}${path}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  const embedded = await page.$("#home-explorer");
  if (embedded)
    await embedded.evaluate((element) =>
      element.scrollIntoView({ block: "start" }),
    );
  const chart = await page.waitForSelector(".vs-canvas", { timeout: 30000 });
  await chart.evaluate((element) =>
    element.scrollIntoView({ block: "center" }),
  );
  await page.waitForSelector(".vs-canvas canvas", { timeout: 30000 });
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 300)));
  await page.evaluate(() => {
    window.explorerWheelEvents = [];
    document.addEventListener(
      "wheel",
      (event) => {
        setTimeout(
          () =>
            window.explorerWheelEvents.push({
              shift: event.shiftKey,
              prevented: event.defaultPrevented,
            }),
          0,
        );
      },
      { capture: true, passive: true },
    );
  });
  return chart;
}

async function wheel(page, chart, shift) {
  await chart.evaluate((element) =>
    element.scrollIntoView({ block: "center" }),
  );
  const box = await chart.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.evaluate(() => {
    window.explorerWheelEvents = [];
  });
  const start = await page.evaluate(() => scrollY);
  if (shift) await page.keyboard.down("Shift");
  try {
    await page.mouse.wheel({ deltaY: 180 });
    await page.waitForFunction(() => window.explorerWheelEvents.length > 0);
    await page.evaluate(
      () => new Promise((resolve) => setTimeout(resolve, 150)),
    );
    return await page.evaluate(
      (start) => ({
        start,
        end: scrollY,
        ...window.explorerWheelEvents.at(-1),
      }),
      start,
    );
  } finally {
    if (shift) await page.keyboard.up("Shift");
  }
}

for (const view of ["3d", "network"]) {
  test(`homepage ${view}: wheel scrolls the page, while Shift+wheel zooms the map`, async () => {
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const chart = await readyChart(page, `/en?view=${view}`);
      const ordinary = await wheel(page, chart, false);
      assert.equal(
        ordinary.prevented,
        false,
        "ordinary wheel remains available to the page",
      );
      assert.ok(
        ordinary.end > ordinary.start + 50,
        "wheel over the map scrolls down the homepage",
      );
      const zoom = await wheel(page, chart, true);
      assert.equal(zoom.shift, true);
      assert.equal(
        zoom.prevented,
        true,
        "Shift+wheel reaches the map zoom handler",
      );
      assert.ok(
        Math.abs(zoom.end - zoom.start) < 2,
        "zooming keeps the page in place",
      );
      const released = await wheel(page, chart, false);
      assert.equal(
        released.prevented,
        false,
        "releasing Shift restores normal scrolling immediately",
      );
      assert.ok(released.end > released.start + 50);
    } finally {
      await browser.close();
    }
  });
}

test("standalone Explorer still zooms without a modifier", async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const chart = await readyChart(page, "/en/explorer");
    const zoom = await wheel(page, chart, false);
    assert.equal(zoom.prevented, true);
    assert.ok(Math.abs(zoom.end - zoom.start) < 2);
  } finally {
    await browser.close();
  }
});
