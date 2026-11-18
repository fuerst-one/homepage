import assert from "node:assert/strict";
import { test } from "node:test";
import puppeteer from "puppeteer";

const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6894";
const project = "/projects/konfig-product-design-configurator";

for (const locale of ["en", "de"]) {
  test(`${locale}: header identifies the current section on pages and subpages`, async () => {
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 390, height: 844 });
      const activeLinks = () =>
        page.$$eval(".content-header-navigation a[aria-current]", (links) =>
          links.map((link) => ({
            href: link.getAttribute("href"),
            current: link.getAttribute("aria-current"),
          })),
        );
      const cases = [
        ["/projects?featured=true", "/projects", "page"],
        [project, "/projects", "location"],
        [`${project}/case-study`, "/projects", "location"],
        ["/contact", "/contact", "page"],
        ["/hire", "/hire", "page"],
        [
          "/services/product-interfaces",
          "/services/product-interfaces",
          "page",
        ],
        [
          "/services/product-interfaces/review",
          "/services/product-interfaces",
          "location",
        ],
        [
          "/services/ai-automation/assessment",
          "/services/ai-automation",
          "location",
        ],
        [locale === "de" ? "/impressum" : "/legal-notice", null, null],
      ];
      for (const [path, href, current] of cases) {
        const response = await page.goto(`${base}/${locale}${path}`, {
          // Optional image descriptions can keep loading after the header is usable.
          waitUntil: "domcontentloaded",
          timeout: 90000,
        });
        assert.equal(response.status(), 200, path);
        await page.waitForSelector(".content-header-navigation");
        assert.deepEqual(
          await activeLinks(),
          href ? [{ href: `/${locale}${href}`, current }] : [],
          path,
        );
      }

      // The active section follows client navigation without a full reload.
      await page.click(
        `.content-header-navigation a[href="/${locale}/contact"]`,
      );
      await page.waitForFunction(
        (href) =>
          document
            .querySelector(`.content-header-navigation a[href="${href}"]`)
            ?.getAttribute("aria-current") === "page",
        {},
        `/${locale}/contact`,
      );
      assert.deepEqual(await activeLinks(), [
        { href: `/${locale}/contact`, current: "page" },
      ]);

      // A shared word prefix is not a subpage of the linked section.
      await page.evaluate((locale) => {
        history.pushState(null, "", `/${locale}/contact-other`);
      }, locale);
      await page.waitForFunction(
        () =>
          !document.querySelector(".content-header-navigation a[aria-current]"),
      );
      assert.deepEqual(await activeLinks(), []);
    } finally {
      await browser.close();
    }
  });
}
