import assert from "node:assert/strict";
import { test } from "node:test";
import puppeteer from "puppeteer";
const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";

const settle = () => new Promise((resolve) => setTimeout(resolve, 400));
const composer = (page) =>
  page.$eval("#landing-command", (e) => ({
    placeholder: e.placeholder,
    maxLength: e.maxLength,
  }));

test("unavailable AI leaves the landing as plain search: no chat, consent prompt or request", async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    let posts = 0;
    let available = false;
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (request.url().includes("/api/projects?"))
        void request.respond({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ results: [] }),
        });
      else if (request.url().includes("/api/assistant/status"))
        void request.respond({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            eligible: true,
            eligibleUntil: Date.now() + 60000,
            available,
            verified: true,
            retryAt: available ? 0 : Date.now() + 300000,
          }),
        });
      else if (request.url().endsWith("/api/assistant")) {
        posts++;
        void request.abort();
      } else void request.continue();
    });
    await page.goto(base + "/en", {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    await page.waitForSelector(
      ".landing-console:not([inert]) #landing-command",
    );
    await page.waitForSelector(".knowledge-privacy");
    assert.deepEqual(
      await composer(page),
      { placeholder: "Search or say hello…", maxLength: 240 },
      "the input does not invite a question nobody can answer",
    );
    const question = "Tell me about your work";
    await page.type("#landing-command", question);
    await page.waitForNetworkIdle({ idleTime: 500 });
    await page.keyboard.press("Enter");
    await settle();
    assert.equal(await page.$(".knowledge-inline"), null);
    assert.equal(await page.$("[data-ai-consent]"), null);
    assert.equal(posts, 0);
    assert.equal(
      await page.$eval("#landing-command", (e) => e.value),
      question,
    );

    available = true;
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await page.waitForFunction(
      () => document.querySelector("#landing-command").maxLength === 1000,
    );
    await page.waitForFunction(
      () => !document.querySelector(".landing-submit").disabled,
    );
    await page.focus("#landing-command");
    await page.keyboard.press("Enter");
    await page.waitForSelector("[data-ai-consent]");
    available = false;
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await page.waitForFunction(
      () => !document.querySelector("[data-ai-consent]"),
    );
    await settle();
    assert.equal(
      await page.$(".knowledge-inline"),
      null,
      "an outage during the consent prompt opens no chat",
    );
    assert.equal(
      await page.$eval("#landing-command", (e) => e.value),
      question,
    );
    assert.equal(posts, 0);
  } finally {
    await browser.close();
  }
});

test("AI is opt-in; cancel, grant, optional history and withdrawal control all assistant traffic", async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    let posts = 0,
      checks = 0;
    const bodies = [];
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (request.url().includes("/api/projects?")) {
        void request.respond({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ results: [] }),
        });
      } else if (request.url().includes("/api/assistant/status")) {
        checks++;
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
      } else if (request.url().endsWith("/api/assistant")) {
        posts++;
        bodies.push(JSON.parse(request.postData()));
        void request.respond({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            answer: "Public project answer.",
            sources: [],
            actions: [],
          }),
        });
      } else void request.continue();
    });
    await page.goto(base + "/en", {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    await page.waitForSelector(".landing-backdrop canvas");
    assert.equal(
      checks,
      1,
      "one same-site availability snapshot contains no question",
    );
    assert.equal(
      await page.evaluate(() =>
        sessionStorage.getItem("fuerst-one:knowledge-chat:v1"),
      ),
      null,
    );
    await page.waitForSelector(
      ".landing-console:not([inert]) #landing-command",
    );
    const originalQuestion = "  Which work would suit my idea?  ";
    await page.type("#landing-command", originalQuestion);
    await page.waitForFunction(
      () => !document.querySelector(".landing-submit").disabled,
    );
    await page.keyboard.press("Enter");
    await page.waitForSelector("[data-ai-consent]");
    assert.equal(posts, 0);
    assert.equal(checks, 1);
    assert.equal(
      await page.$eval("#remember-ai-chat", (e) => e.checked),
      false,
    );
    await page.click("[data-ai-cancel]");
    assert.equal(await page.$("[data-ai-consent]"), null);
    assert.equal(
      await page.$eval("#landing-command", (e) => e.value),
      originalQuestion,
    );
    await page.waitForFunction(
      () => document.activeElement?.id === "landing-command",
    );
    await page.keyboard.press("Enter");
    await page.waitForSelector("[data-ai-consent]");
    await page.click("[data-ai-allow]");
    await page.waitForSelector(".knowledge-answer");
    assert.equal(posts, 1);
    assert.equal(bodies[0].consent.remember, false);
    assert.equal(
      bodies[0].message,
      originalQuestion,
      "raw field text survives consent and reaches the API",
    );
    assert.equal(
      await page.evaluate(() =>
        sessionStorage.getItem("fuerst-one:knowledge-chat:v1"),
      ),
      null,
    );
    await page.click("[data-ai-withdraw]");
    await page.waitForFunction(
      () => !document.querySelector(".knowledge-inline"),
    );
    assert.deepEqual(
      await page.evaluate(() =>
        Object.keys(sessionStorage).filter((key) =>
          key.startsWith("fuerst-one:knowledge-"),
        ),
      ),
      ["fuerst-one:knowledge-consent-asked:v1"],
      "withdrawal keeps only the marker that stops this session asking again",
    );
    const declined = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("fuerst-one:knowledge-consent:v1")),
    );
    assert.equal(declined.allowed, false);
    const askAfterRefusal = async () => {
      await page.type("#landing-command", "Tell me about design work");
      await page.waitForNetworkIdle({ idleTime: 500 });
      await page.keyboard.press("Enter");
    };
    const assertPlainSearch = async (message) => {
      await settle();
      assert.equal(await page.$("[data-ai-consent]"), null, message);
      assert.equal(await page.$(".knowledge-inline"), null, message);
      assert.equal((await composer(page)).maxLength, 240, message);
      assert.equal(posts, 1);
    };
    const reload = async () => {
      await page.reload({ waitUntil: "networkidle2" });
      await page.waitForSelector(
        ".landing-console:not([inert]) #landing-command",
      );
      await page.waitForSelector("[data-ai-preferences]");
    };
    await askAfterRefusal();
    await assertPlainSearch(
      "a refusal made in this session is not questioned again",
    );
    await reload();
    assert.deepEqual(
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem("fuerst-one:knowledge-consent:v1")),
      ),
      declined,
      "visits never renew a remembered refusal",
    );
    await askAfterRefusal();
    await assertPlainSearch("a reload stays within the same session");

    // A new browser session starts with empty session storage.
    await page.evaluate(() => sessionStorage.clear());
    await reload();
    assert.equal((await composer(page)).maxLength, 1000);
    await askAfterRefusal();
    await page.waitForSelector("[data-ai-consent]");
    assert.equal(await page.$(".knowledge-inline"), null);
    await page.click("[data-ai-cancel]");
    await page.waitForFunction(
      () => document.activeElement?.id === "landing-command",
    );
    await page.keyboard.press("Enter");
    await assertPlainSearch("a new session asks a remembered refusal once");
    assert.deepEqual(
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem("fuerst-one:knowledge-consent:v1")),
      ),
      declined,
      "asking again does not renew or discard the refusal",
    );
    await reload();
    await page.click("[data-ai-preferences]");
    await page.waitForSelector("[data-ai-consent]");
    await page.click("#remember-ai-chat");
    await page.click("[data-ai-allow]");
    await page.waitForFunction(
      () => document.activeElement?.id === "landing-command",
    );
    await page.type("#landing-command", "Tell me about design work");
    await page.keyboard.press("Enter");
    await page.waitForSelector(".knowledge-answer");
    assert.equal(posts, 2);
    assert.equal(bodies[1].consent.remember, true);
    assert.ok(
      await page.evaluate(() =>
        sessionStorage.getItem("fuerst-one:knowledge-chat:v1"),
      ),
    );
    await page.reload({ waitUntil: "networkidle2" });
    await page.waitForSelector(
      ".landing-console:not([inert]) #landing-command",
    );
    await page.click("#landing-command");
    await page.waitForSelector(".knowledge-answer");
    assert.equal(
      posts,
      2,
      "restoring selected history never resends a question",
    );
    await page.evaluate(() => {
      const now = Date.now;
      Date.now = () => now() + 181 * 24 * 60 * 60 * 1000;
      window.dispatchEvent(new Event("focus"));
      Date.now = now;
    });
    await page.waitForFunction(
      () => !document.querySelector(".knowledge-inline"),
    );
    assert.deepEqual(
      await page.evaluate(() =>
        Object.keys(sessionStorage).filter((key) =>
          key.startsWith("fuerst-one:knowledge-"),
        ),
      ),
      [],
      "expiry removes permission, chat and outage state",
    );
    assert.equal(
      await page.evaluate(() =>
        localStorage.getItem("fuerst-one:knowledge-consent:v1"),
      ),
      null,
    );
    await page.goto(base + "/de", { waitUntil: "networkidle2" });
    await page.waitForSelector(
      ".landing-console:not([inert]) #landing-command",
    );
    await page.type("#landing-command", "Welche Arbeit passt zu meiner Idee?");
    await page.waitForFunction(
      () => !document.querySelector(".landing-submit").disabled,
    );
    await page.keyboard.press("Enter");
    await page.waitForSelector("[data-ai-consent]");
    assert.match(
      await page.$eval("[data-ai-allow]", (e) => e.textContent),
      /KI erlauben/,
    );
    await page.setViewport({ width: 390, height: 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({ path: "/tmp/homepage-ai-consent-mobile.png" });
  } finally {
    await browser.close();
  }
});

test("the API rejects absent and expired consent before processing a visitor question", async () => {
  for (const consent of [
    undefined,
    { version: "old", decidedAt: Date.now(), remember: false },
  ]) {
    const result = await fetch(base + "/api/assistant", {
      method: "POST",
      headers: { Origin: base, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "A private question must not be sent",
        locale: "en",
        consent,
      }),
    });
    assert.equal(result.status, 428);
    assert.equal((await result.json()).error, "consent_required");
  }
});
