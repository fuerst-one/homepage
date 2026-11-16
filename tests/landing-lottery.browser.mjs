import assert from "node:assert/strict";
import { test } from "node:test";
import puppeteer from "puppeteer";
import { grantKnowledgeConsent } from "./helpers/knowledge-consent.mjs";
const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";

for (const locale of ["en", "de"]) {
  test(`${locale}: pending and excluded visitors see original search without AI UI or consent`, async () => {
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await grantKnowledgeConsent(page);
      let resolveStatus;
      let posts = 0;
      await page.setRequestInterception(true);
      page.on("request", (request) => {
        if (request.url().includes("/api/assistant/status")) {
          resolveStatus = () =>
            request.respond({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({
                eligible: false,
                available: false,
                verified: false,
                retryAt: Date.now() + 60000,
              }),
            });
        } else if (request.url().endsWith("/api/assistant")) {
          posts++;
          void request.abort();
        } else void request.continue();
      });
      await page.goto(`${base}/${locale}`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await page.waitForSelector(".landing-backdrop canvas");
      await page.waitForFunction(() =>
        document.querySelector("#landing-command"),
      );
      assert.equal(
        await page.$(".knowledge-privacy"),
        null,
        "no AI flash before eligibility resolves",
      );
      assert.equal(
        await page.$eval("#landing-command", (e) => e.maxLength),
        240,
      );
      assert.ok(
        await page.evaluate(() =>
          localStorage.getItem("fuerst-one:knowledge-consent:v1"),
        ),
        "pending selection preserves saved permission",
      );
      await resolveStatus();
      await page.waitForFunction(
        () => !localStorage.getItem("fuerst-one:knowledge-consent:v1"),
      );
      assert.equal(await page.$(".knowledge-privacy"), null);
      await page.type("#landing-command", "AI automation");
      await page.waitForSelector(".landing-discovery-panel a");
      await page.keyboard.press("Enter");
      await page.waitForFunction(
        () => !location.pathname.match(/^\/(en|de)\/?$/),
      );
      assert.equal(await page.$("[data-ai-consent]"), null);
      assert.equal(posts, 0);
    } finally {
      await browser.close();
    }
  });
}

test("selected visitor gets AI controls; later exclusion removes them", async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    let eligible = true;
    page.on("request", (request) => {
      if (request.url().includes("/api/assistant/status"))
        void request.respond({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            eligible,
            eligibleUntil: Date.now() + 60000,
            available: eligible,
            verified: eligible,
            retryAt: Date.now() + 60000,
          }),
        });
      else void request.continue();
    });
    await page.goto(`${base}/en`, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    await page.waitForSelector(".knowledge-privacy");
    assert.equal(
      await page.$eval("#landing-command", (e) => e.maxLength),
      1000,
    );
    eligible = false;
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await page.waitForFunction(
      () => !document.querySelector(".knowledge-privacy"),
    );
    assert.equal(await page.$eval("#landing-command", (e) => e.maxLength), 240);
  } finally {
    await browser.close();
  }
});

test("a paid-request admission rejection closes existing AI UI", async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await grantKnowledgeConsent(page);
    let selected = true;
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (request.url().includes("/api/assistant/status"))
        void request.respond({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            eligible: selected,
            eligibleUntil: Date.now() + 60000,
            available: selected,
            verified: selected,
            retryAt: Date.now() + 60000,
          }),
        });
      else if (request.url().endsWith("/api/assistant")) {
        selected = false;
        void request.respond({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            mode: "fallback",
            answer: "Ignored",
            sources: [],
            actions: [],
            availability: {
              eligible: false,
              available: false,
              verified: false,
              retryAt: Date.now() + 60000,
            },
          }),
        });
      } else void request.continue();
    });
    await page.goto(`${base}/en`, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    await page.waitForSelector(".knowledge-privacy");
    await page.type("#landing-command", "Tell me about your recent work");
    await page.waitForFunction(
      () => !document.querySelector(".landing-submit").disabled,
    );
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () => !document.querySelector(".knowledge-privacy"),
    );
    assert.equal(await page.$(".knowledge-inline"), null);
    assert.equal(await page.$("[data-ai-consent]"), null);
    assert.equal(await page.$eval("#landing-command", (e) => e.maxLength), 240);
  } finally {
    await browser.close();
  }
});

test("eligibility refreshes at the lottery boundary even while AI is healthy", async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    let checks = 0;
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (request.url().includes("/api/assistant/status")) {
        checks++;
        const eligible = checks === 1;
        void request.respond({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            eligible,
            eligibleUntil: Date.now() + 2000,
            available: eligible,
            verified: eligible,
            retryAt: eligible ? 0 : Date.now() + 60000,
          }),
        });
      } else void request.continue();
    });
    await page.goto(`${base}/en`, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    await page.waitForSelector(".knowledge-privacy");
    await page.waitForFunction(
      () => !document.querySelector(".knowledge-privacy"),
      { timeout: 8000 },
    );
    assert.equal(checks, 2);
  } finally {
    await browser.close();
  }
});

for (const status of [
  { available: true, verified: true, retryAt: 0 },
  { eligible: true, available: true, verified: true, retryAt: 0 },
]) {
  test(`incomplete eligibility snapshot keeps AI hidden (${"eligible" in status})`, async () => {
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setRequestInterception(true);
      page.on("request", (request) => {
        if (request.url().includes("/api/assistant/status"))
          void request.respond({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(status),
          });
        else void request.continue();
      });
      await page.goto(`${base}/en`, {
        waitUntil: "networkidle2",
        timeout: 90000,
      });
      assert.equal(await page.$(".knowledge-privacy"), null);
      assert.equal(
        await page.$eval("#landing-command", (e) => e.maxLength),
        240,
      );
    } finally {
      await browser.close();
    }
  });
}
