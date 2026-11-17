import assert from "node:assert/strict";
import { test } from "node:test";
import puppeteer from "puppeteer";
import { grantKnowledgeConsent } from "./helpers/knowledge-consent.mjs";

const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6894";

test("one shared localized footer replaces the landing, sidebar and playground footers", async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    for (const locale of ["en", "de"]) {
      for (const route of [
        "",
        "/projects",
        "/contact",
        "/plasma",
        locale === "de" ? "/datenschutz" : "/privacy",
      ]) {
        await page.goto(`${base}/${locale}${route}`, {
          waitUntil: "domcontentloaded",
          timeout: 90000,
        });
        await page.waitForSelector("footer");
        assert.equal(
          await page.$$eval("footer", (elements) => elements.length),
          1,
          `${locale}${route}: one footer`,
        );
        const footer = await page.$(
          "body > * footer[data-site-footer], body > footer[data-site-footer]",
        );
        assert.ok(footer, "the footer belongs to the shared page shell");
        const links = await footer.$$eval("a", (elements) =>
          elements.map((element) => element.getAttribute("href")),
        );
        assert.equal(
          new Set(links).size,
          links.length,
          "no repeated footer destinations",
        );
        assert.ok(
          links.includes(
            `/${locale}/${locale === "de" ? "impressum" : "legal-notice"}`,
          ),
        );
        assert.ok(
          links.includes(
            `/${locale}/${locale === "de" ? "datenschutz" : "privacy"}`,
          ),
        );
        assert.ok(
          !links.some((href) =>
            href.startsWith(locale === "en" ? "/de/" : "/en/"),
          ),
        );
        if (!route) {
          for (const profile of [
            "https://github.com/fuerst-one",
            "https://www.linkedin.com/in/fuerst-one/",
          ]) {
            assert.equal(
              await page.$$eval(
                `a[href="${profile}"]`,
                (elements) => elements.length,
              ),
              1,
              "homepage social links appear once",
            );
          }
        }
      }
    }
  } finally {
    await browser.close();
  }
});

test("footer privacy settings withdraw permission in the active page without sending a question", async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await grantKnowledgeConsent(page);
    let questions = 0;
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (request.url().includes("/api/assistant/status")) {
        void request.respond({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            eligible: true,
            eligibleUntil: Date.now() + 60000,
            available: true,
            verified: true,
            retryAt: 0,
          }),
        });
      } else if (
        request.url().endsWith("/api/assistant") &&
        request.method() === "POST"
      ) {
        questions++;
        void request.abort();
      } else void request.continue();
    });
    await page.goto(`${base}/en`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await page.waitForSelector("[data-ai-withdraw]");
    await page.click("[data-privacy-settings]");
    await page.waitForSelector('[role="dialog"]');
    await page.click("[data-privacy-withdraw]");
    await page.waitForFunction(
      () => !document.querySelector("[data-ai-withdraw]"),
    );
    assert.equal(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("fuerst-one:knowledge-consent:v1"))
            .allowed,
      ),
      false,
    );
    assert.equal(
      await page.evaluate(() =>
        sessionStorage.getItem("fuerst-one:knowledge-chat:v1"),
      ),
      null,
    );
    assert.equal(questions, 0);
    await page.keyboard.press("Escape");
    assert.equal(await page.$('[role="dialog"]'), null);
    assert.equal(
      await page.$eval(
        "[data-privacy-settings]",
        (element) => element === document.activeElement,
      ),
      true,
      "closing restores footer keyboard focus",
    );
  } finally {
    await browser.close();
  }
});

test("opening privacy settings preserves memory-only permission when storage is blocked", async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new Error("Storage blocked");
        },
      });
    });
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (request.url().includes("/api/assistant/status")) {
        void request.respond({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            eligible: true,
            eligibleUntil: Date.now() + 60000,
            available: true,
            verified: true,
            retryAt: 0,
          }),
        });
      } else if (
        request.url().endsWith("/api/assistant") &&
        request.method() === "POST"
      ) {
        void request.respond({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            answer: "A local test answer.",
            sources: [],
            actions: [],
          }),
        });
      } else void request.continue();
    });
    await page.goto(`${base}/en`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await page.waitForSelector(".knowledge-privacy");
    await page.type("#landing-command", "Which work would suit my idea?");
    await page.keyboard.press("Enter");
    await page.waitForSelector("[data-ai-consent]");
    await page.click("[data-ai-allow]");
    await page.waitForSelector("[data-ai-withdraw]");
    await page.click("[data-privacy-settings]");
    await page.waitForSelector('[role="dialog"]');
    assert.ok(
      await page.$("[data-ai-withdraw]"),
      "opening the settings panel does not revoke active permission",
    );
    await page.click("[data-privacy-withdraw]");
    await page.waitForFunction(
      () => !document.querySelector("[data-ai-withdraw]"),
    );
  } finally {
    await browser.close();
  }
});
