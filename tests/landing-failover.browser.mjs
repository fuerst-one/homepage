import assert from "node:assert/strict";
import { test } from "node:test";
import puppeteer from "puppeteer";
const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";
test("outages silently show project suggestions, bypass slow requests across pages, and recover", async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    let available = true;
    let posts = 0;
    let recovered = false;
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (request.url().includes("/api/assistant/status")) {
        void request.respond({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            available,
            verified: recovered,
            retryAt: available ? 0 : Date.now() + 100,
          }),
        });
      } else if (request.url().endsWith("/api/assistant")) {
        posts++;
        available = recovered;
        void request.respond({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            recovered
              ? {
                  answer: "Recovered answer.",
                  sources: [],
                  actions: [],
                  mode: "answer",
                  availability: { available: true, verified: true, retryAt: 0 },
                }
              : {
                  answer: "ignored static server fallback",
                  sources: [],
                  actions: [],
                  mode: "fallback",
                  availability: {
                    available: false,
                    verified: false,
                    retryAt: Date.now() + 100,
                  },
                },
          ),
        });
      } else void request.continue();
    });
    const home = async () => {
      await page.goto(`${base}/en`, {
        waitUntil: "networkidle2",
        timeout: 90000,
      });
      await page.waitForSelector(".landing-backdrop canvas");
    };
    await home();
    await page.type("#landing-command", "AI automation");
    await page.waitForSelector(".landing-discovery-panel a");
    await page.keyboard.press("Enter");
    await page.waitForSelector(".knowledge-answer");
    assert.equal(await page.$(".knowledge-error"), null);
    assert.equal(posts, 1);
    assert.ok(
      (await page.$$(".knowledge-sources a")).length > 0,
      "fallback uses locally known matching projects",
    );
    assert.doesNotMatch(
      await page.$eval(".knowledge-transcript", (e) => e.textContent),
      /unavailable|offline|error|fallback|ignored static/i,
    );
    await page.type(
      "#landing-command",
      "Tell me about browser automation work",
    );
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () => document.querySelectorAll(".knowledge-answer").length === 2,
    );
    assert.equal(posts, 1, "latched failure bypasses the assistant request");
    await page.goto(`${base}/en/privacy`, { waitUntil: "networkidle2" });
    await home();
    await page.click("#landing-command");
    await page.waitForSelector(".knowledge-answer");
    await page.type("#landing-command", "Tell me about internal tooling work");
    await page.waitForFunction(
      () => !document.querySelector(".landing-submit").disabled,
    );
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () => document.querySelectorAll(".knowledge-answer").length === 3,
    );
    assert.equal(posts, 1, "latch survives navigation");
    available = true;
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.ok(
      await page.evaluate(() =>
        sessionStorage.getItem("fuerst-one:knowledge-availability:v1"),
      ),
      "unverified new worker must not clear the latch",
    );
    recovered = true;
    available = true;
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await page.waitForFunction(
      () => !sessionStorage.getItem("fuerst-one:knowledge-availability:v1"),
    );
    await page.type(
      "#landing-command",
      "What kind of client work do you enjoy?",
    );
    await page.keyboard.press("Enter");
    await page.waitForFunction(() =>
      document
        .querySelector(".knowledge-transcript")
        .textContent.includes("Recovered answer."),
    );
    assert.equal(posts, 2);
  } finally {
    await browser.close();
  }
});

test("a stalled transport quietly falls back by its deadline, then answers locally", async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
      const original = window.fetch;
      window.assistantCalls = 0;
      window.fetch = (url, options) => {
        if (String(url) === "/api/assistant") {
          window.assistantCalls++;
          return new Promise((resolve, reject) =>
            options.signal.addEventListener(
              "abort",
              () => reject(options.signal.reason),
              { once: true },
            ),
          );
        }
        if (String(url).startsWith("/api/assistant/status"))
          return Promise.resolve(
            new Response(
              JSON.stringify({ available: true, verified: false, retryAt: 0 }),
              { status: 200 },
            ),
          );
        return original(url, options);
      };
    });
    await page.goto(`${base}/en`, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    await page.waitForSelector(".landing-backdrop canvas");
    await page.type("#landing-command", "What can you build for my team?");
    await page.waitForFunction(
      () => !document.querySelector(".landing-submit").disabled,
    );
    const started = Date.now();
    await page.keyboard.press("Enter");
    await page.waitForSelector(".knowledge-answer", { timeout: 11000 });
    assert.ok(
      Date.now() - started < 10500,
      "transport deadline must be bounded",
    );
    assert.equal(await page.$(".knowledge-error"), null);
    assert.equal((await page.$$(".knowledge-actions button")).length, 2);
    await page.type("#landing-command", "Can we talk about a different idea?");
    const latched = Date.now();
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () => document.querySelectorAll(".knowledge-answer").length === 2,
    );
    assert.ok(
      Date.now() - latched < 1000,
      "a known failure does not repeat the transport wait",
    );
    assert.equal(await page.evaluate(() => window.assistantCalls), 1);
    await page.click(".knowledge-clear");
    assert.ok(
      await page.evaluate(() =>
        sessionStorage.getItem("fuerst-one:knowledge-availability:v1"),
      ),
      "clear chat must not clear outage state",
    );
  } finally {
    await browser.close();
  }
});

test("an older completed answer carrying an outage does not clear the latch", async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    let calls = 0;
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (request.url().includes("/api/assistant/status"))
        void request.respond({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            available: true,
            verified: false,
            retryAt: 0,
          }),
        });
      else if (request.url().endsWith("/api/assistant")) {
        calls++;
        void request.respond({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            answer: "A completed answer.",
            sources: [],
            actions: [],
            mode: "answer",
            availability: {
              available: false,
              verified: false,
              retryAt: Date.now() + 30000,
            },
          }),
        });
      } else void request.continue();
    });
    await page.goto(`${base}/en`, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    await page.waitForSelector(".landing-backdrop canvas");
    await page.type("#landing-command", "What do you enjoy building?");
    await page.waitForFunction(
      () => !document.querySelector(".landing-submit").disabled,
    );
    await page.keyboard.press("Enter");
    await page.waitForSelector(".knowledge-answer");
    assert.match(
      await page.$eval(".knowledge-answer", (e) => e.textContent),
      /completed answer/,
    );
    await page.type("#landing-command", "Can we discuss another idea?");
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () => document.querySelectorAll(".knowledge-answer").length === 2,
    );
    assert.equal(calls, 1);
  } finally {
    await browser.close();
  }
});
