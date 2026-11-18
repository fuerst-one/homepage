import assert from "node:assert/strict";
import { test } from "node:test";
import puppeteer from "puppeteer";

const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6894";

for (const locale of ["en", "de"]) {
  test(`${locale}: sidebar Explorer shows cluster and project hover cards without controls`, async () => {
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewport({ width: 1280, height: 900 });
      await page.goto(`${base}/${locale}/projects?tools=React.js`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await page.screenshot({
        path: `/tmp/homepage-navigation-${locale}-desktop.png`,
      });
      const preview = await page.waitForSelector(
        "aside [data-explorer-preview]",
      );
      await preview.scrollIntoView();
      const canvas = await page.waitForSelector(
        "[data-explorer-preview] canvas",
      );
      assert.equal(
        await page.$("[data-explorer-preview] :is(button,select,input)"),
        null,
      );
      assert.equal(
        await page.$(`header nav a[href="/${locale}/explorer"]`),
        null,
      );
      const education = locale === "de" ? "Ausbildung" : "Education";
      assert.ok(
        !(await page.$eval("aside", (aside) => aside.textContent)).includes(
          education,
        ),
        "profile facts have moved out of the projects sidebar",
      );
      const href = await page.$eval("[data-explorer-preview] a", (link) =>
        link.getAttribute("href"),
      );
      assert.equal(href, `/${locale}/explorer`);
      assert.equal(new URL(page.url()).searchParams.get("tools"), "React.js");

      const bounds = await canvas.boundingBox();
      const found = new Set();
      for (let y = 16; y < bounds.height - 16 && found.size < 2; y += 12) {
        for (let x = 16; x < bounds.width - 16 && found.size < 2; x += 12) {
          await page.mouse.move(bounds.x + x, bounds.y + y);
          const hover = await page.evaluate(() => {
            const tooltip = document.querySelector(
              "[data-explorer-preview] [role=tooltip]",
            );
            return (
              tooltip && {
                kind: tooltip.getAttribute("data-space-tooltip"),
                text: tooltip.textContent,
              }
            );
          });
          if (hover) {
            assert.ok(hover.text.trim());
            assert.doesNotMatch(hover.text, /Click to explore|Anklicken/);
            if (!found.has(hover.kind))
              await page.screenshot({
                path: `/tmp/homepage-explorer-preview-${locale}-${hover.kind}-hover.png`,
              });
            found.add(hover.kind);
          }
        }
      }
      assert.deepEqual([...found].sort(), ["cluster", "project"]);
      await page.keyboard.press("Escape");
      await page.waitForFunction(
        () => !document.querySelector("[data-explorer-preview] [role=tooltip]"),
      );
      await page.screenshot({
        path: `/tmp/homepage-explorer-preview-${locale}-desktop.png`,
      });
      await page.setViewport({ width: 320, height: 740 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `/tmp/homepage-navigation-${locale}-mobile.png`,
      });
      await preview.scrollIntoView();
      await page.screenshot({
        path: `/tmp/homepage-explorer-preview-${locale}-mobile.png`,
      });
      await page.click("[data-explorer-preview] a");
      await page.waitForSelector("#atlas-explore-title", { timeout: 60000 });
      assert.equal(new URL(page.url()).pathname, `/${locale}/explorer`);
      await page.goto(`${base}/${locale}`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await page.waitForSelector(".home-about-heading");
      const profileText = await page.$eval(
        'section[aria-labelledby="home-about-title"]',
        (section) => section.textContent,
      );
      assert.ok(
        profileText.includes(education),
        "homepage profile includes the moved facts",
      );
      assert.ok(
        profileText.includes(locale === "de" ? "Sprachen" : "Languages"),
      );
      const profile = await page.$(
        'section[aria-labelledby="home-about-title"]',
      );
      const profileHeading = await profile.$(".home-about-heading");
      await profileHeading.evaluate((element) =>
        element.scrollIntoView({ block: "start" }),
      );
      await page.screenshot({
        path: `/tmp/homepage-profile-${locale}-mobile.png`,
      });
      await page.setViewport({ width: 1280, height: 900 });
      await profileHeading.evaluate((element) =>
        element.scrollIntoView({ block: "start" }),
      );
      await page.screenshot({
        path: `/tmp/homepage-profile-${locale}-desktop.png`,
      });
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  });
}
