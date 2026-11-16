import assert from "node:assert/strict";
import { test } from "node:test";
import puppeteer from "puppeteer";
import { grantKnowledgeConsent } from "./helpers/knowledge-consent.mjs";

const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";
test("the shared input previews search, submits chat, and returns to search", async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await grantKnowledgeConsent(page);
    await page.setViewport({ width: 1280, height: 900 });
    await page.evaluateOnNewDocument(() => {
      const original = window.fetch;
      window.fetch = (url, options) => {
        if (
          String(url) === "/api/assistant" &&
          JSON.parse(options?.body || "{}").message === "Slow question"
        ) {
          return new Promise((_, reject) => {
            options.signal.addEventListener(
              "abort",
              () => reject(new DOMException("Aborted", "AbortError")),
              { once: true },
            );
          });
        }
        return original(url, options);
      };
    });
    let paidRequests = 0;
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (request.url().includes("/api/assistant/status")) {
        void request.respond({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ available: true, verified: true, retryAt: 0 }),
        });
      } else if (request.url().endsWith("/api/assistant")) {
        paidRequests++;
        const body = JSON.parse(request.postData());
        if (body.message === "Retry this question") {
          void request.respond({
            status: 429,
            contentType: "application/json",
            body: "{}",
          });
          return;
        }
        void request.respond({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            answer: "A grounded answer about AI automation.",
            sources: [],
            actions: [],
          }),
        });
      } else void request.continue();
    });
    await page.goto(`${base}/en`, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    await page.waitForSelector("#landing-command");
    await page.waitForSelector(".landing-backdrop canvas");
    await page.screenshot({
      path: "/tmp/homepage-inline-discovery-desktop.png",
    });
    await page.type("#landing-command", "AI automation");
    await page.waitForSelector(".landing-discovery-panel");
    await page.waitForFunction(
      () => !document.querySelector(".landing-submit")?.disabled,
    );
    assert.equal(paidRequests, 0, "typing must never start a paid request");
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () =>
        document
          .querySelector(".knowledge-answer")
          ?.textContent.includes("grounded answer"),
      { timeout: 8000 },
    );
    assert.equal(paidRequests, 1);
    await page.screenshot({ path: "/tmp/homepage-inline-chat-desktop.png" });
    await page.setViewport({ width: 390, height: 844 });
    await page.screenshot({ path: "/tmp/homepage-inline-chat-mobile.png" });
    await page.setViewport({ width: 1280, height: 900 });
    await page.click("#landing-command", { clickCount: 3 });
    await page.type("#landing-command", "Retry this question");
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () => document.querySelectorAll(".knowledge-answer").length === 2,
    );
    assert.equal(
      await page.$(".knowledge-error"),
      null,
      "quota failures silently show public links",
    );
    assert.equal(
      await page.$eval("#landing-command", (input) => input.value),
      "",
    );
    assert.equal(await page.$(".knowledge-open"), null);
    assert.equal(await page.$(".knowledge-panel"), null);
    assert.equal(
      await page.$(".landing-discovery-panel"),
      null,
      "chat replaces live suggestions",
    );
    assert.equal(await page.$("#landing-projects"), null);
    assert.equal(
      await page.$eval(".landing-quick-access", (nav) => nav.inert),
      true,
    );
    assert.equal(
      (await page.$$(".landing-console input, .landing-console textarea"))
        .length,
      1,
    );
    await page.click(".knowledge-back");
    assert.equal(await page.$(".knowledge-inline"), null);
    assert.equal(
      await page.$eval(".landing-quick-access", (nav) => nav.inert),
      false,
    );
    assert.equal(
      await page.$eval(
        "#landing-command",
        (input) => document.activeElement === input,
      ),
      true,
    );
    await page.click("#landing-command", { clickCount: 3 });
    await page.keyboard.press("Backspace");
    await page.type("#landing-command", "AI automation");
    await page.waitForSelector(".knowledge-inline");
    assert.equal(
      (await page.$$(".knowledge-answer")).length,
      2,
      "clicking the input resumes the earlier conversation",
    );
    assert.equal(paidRequests, 2);
    await page.click("#landing-command", { clickCount: 3 });
    await page.type("#landing-command", "Slow question");
    await page.keyboard.press("Enter");
    await page.waitForSelector('.landing-submit[aria-label="Stop answer"]');
    await page.focus('.landing-submit[aria-label="Stop answer"]');
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () =>
        document.querySelector("#landing-command")?.value === "Slow question",
      { timeout: 8000 },
    );
    assert.equal(
      await page.$eval("#landing-command", (input) => input.readOnly),
      false,
    );
    await page.click(".knowledge-back");
    await page.click("#landing-command", { clickCount: 3 });
    await page.type("#landing-command", "zzzzzz-no-project");
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () => document.querySelectorAll(".knowledge-answer").length === 3,
    );
    assert.equal(
      paidRequests,
      3,
      "an unmatched search can still be submitted to chat",
    );
    await page.type("#landing-command", "Slow question");
    await page.keyboard.press("Enter");
    await page.waitForSelector('.landing-submit[aria-label="Stop answer"]');
    assert.match(
      await page.$eval(".knowledge-back", (button) => button.textContent),
      /Close chat/,
    );
    await page.click(".knowledge-back");
    await page.waitForFunction(
      () =>
        document.querySelector("#landing-search").getAttribute("aria-busy") ===
        "false",
    );
    assert.equal(
      await page.$eval("#landing-command", (input) => input.value),
      "",
      "closing a pending request restores default discovery instead of restoring its question",
    );
    assert.equal(await page.$(".landing-discovery-panel"), null);
  } finally {
    await browser.close();
  }
});
