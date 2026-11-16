import assert from "node:assert/strict";
import { test } from "node:test";
import puppeteer from "puppeteer";
import { grantKnowledgeConsent } from "./helpers/knowledge-consent.mjs";
const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";
test("chat resumes after closing, navigation and reload, and can be cleared", async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await grantKnowledgeConsent(page);
    let calls = 0;
    let failSearch = false;
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (request.url().includes("/api/assistant/status")) {
        void request.respond({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ available: true, verified: true, retryAt: 0 }),
        });
      } else if (request.url().endsWith("/api/assistant")) {
        calls++;
        void request.respond({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            answer: "Remember this answer.",
            sources: [
              {
                id: "s1",
                projectId: "p1",
                title: "A case study",
                href: "/en/projects/page-control-ai-website-assistant/case-study",
              },
            ],
            actions: [],
          }),
        });
      } else if (failSearch && request.url().includes("/api/projects?"))
        void request.respond({ status: 503, body: "{}" });
      else void request.continue();
    });
    const home = async () => {
      await page.goto(`${base}/en`, {
        waitUntil: "networkidle2",
        timeout: 90000,
      });
      await page.waitForSelector(".landing-backdrop canvas");
    };
    await home();
    await page.type("#landing-command", "What kind of work do you enjoy?");
    await page.waitForFunction(
      () => !document.querySelector(".landing-submit").disabled,
    );
    await page.keyboard.press("Enter");
    await page.waitForSelector(".knowledge-answer");
    await page.click(".knowledge-back");
    await page.waitForFunction(
      () => !document.querySelector(".knowledge-inline"),
    );
    await page.click("#landing-command");
    await page.waitForSelector(".knowledge-answer", { timeout: 3000 });
    assert.equal(calls, 1, "reopening must not repeat a paid request");
    await page.goto(`${base}/en/privacy`, { waitUntil: "domcontentloaded" });
    await home();
    assert.equal(
      await page.$(".knowledge-inline"),
      null,
      "return to the normal landing until the input is clicked",
    );
    await page.click("#landing-command");
    await page.waitForSelector(".knowledge-answer");
    assert.match(
      await page.$eval(".knowledge-answer", (e) => e.textContent),
      /Remember this answer/,
    );
    await page.reload({ waitUntil: "networkidle2" });
    await page.waitForSelector(".landing-backdrop canvas");
    await page.click("#landing-command");
    await page.waitForSelector(".knowledge-answer");
    await page.click(".knowledge-clear");
    await page.waitForFunction(
      () => !document.querySelector(".knowledge-inline"),
    );
    await page.click("#landing-command");
    assert.equal(await page.$(".knowledge-inline"), null);
    assert.equal(calls, 1);
    failSearch = true;
    await home();
    await page.type(
      "#landing-command",
      "What can you tell me about your work?",
    );
    await page.waitForFunction(() =>
      document
        .querySelector(".landing-discovery-panel")
        ?.textContent.includes("unavailable"),
    );
    await page.waitForFunction(
      () => !document.querySelector(".landing-submit").disabled,
    );
    await page.keyboard.press("Enter");
    await page.waitForSelector(".knowledge-answer");
    assert.equal(
      calls,
      2,
      "chat works when the separate discovery index is unavailable",
    );
  } finally {
    await browser.close();
  }
});
