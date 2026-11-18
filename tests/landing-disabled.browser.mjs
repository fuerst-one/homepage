import assert from "node:assert/strict";
import { test } from "node:test";
import puppeteer from "puppeteer";
const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6889";
const secret = process.env.VERCEL_AUTOMATION_BYPASS;
test("disabled public AI performs no background checks or storage writes and preserves navigation", async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    const errors = [];
    let assistantPosts = 0;
    let assistantStatusReads = 0;
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (request.url().includes("/api/assistant/status"))
        assistantStatusReads++;
      if (
        request.url().endsWith("/api/assistant") &&
        request.method() === "POST"
      )
        assistantPosts++;
      const headers = { ...request.headers() };
      if (secret && new URL(request.url()).origin === base)
        headers["x-vercel-protection-bypass"] = secret;
      void request.continue({ headers });
    });
    await page.goto(base + "/en", {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    await page.waitForSelector(".landing-backdrop canvas");
    assert.equal(
      await page.$(".knowledge-privacy"),
      null,
      "public AI UI stays disabled",
    );
    assert.equal(await page.$(".knowledge-inline"), null);
    assert.equal(
      assistantStatusReads,
      0,
      "disabled AI must not start background availability polling or tab storage",
    );
    assert.equal(
      await page.evaluate(() =>
        sessionStorage.getItem("fuerst-one:knowledge-availability:v1"),
      ),
      null,
    );
    const status = await page.evaluate(async () => ({
      get: await (await fetch("/api/assistant/status")).json(),
      post: (
        await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "Deployment verification",
            locale: "en",
          }),
        })
      ).status,
    }));
    assert.equal(status.get.available, false);
    assert.equal(status.post, 503);
    await page.type("#landing-command", "AI Engineering");
    await page.waitForFunction(
      () => !document.querySelector(".landing-submit").disabled,
      { timeout: 90000 },
    );
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () =>
        location.pathname === "/en/projects" &&
        new URLSearchParams(location.search).get("capabilities") ===
          "AI Engineering",
      { timeout: 60000 },
    );
    assert.equal(
      assistantPosts,
      1,
      "only the explicit disabled-endpoint check issued a POST",
    );
    await page.goto(base + "/de", {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    await page.waitForSelector(".landing-backdrop canvas");
    assert.equal(await page.$eval("html", (e) => e.lang), "de");
    await page.setViewport({ width: 390, height: 844 });
    assert.equal(
      assistantStatusReads,
      1,
      "only the explicit status probe should run across navigation",
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "mobile has no horizontal overflow",
    );
    assert.deepEqual(errors, []);
    const result = {
      stage: base,
      AI_UI_disabled: true,
      endpoint_disabled: true,
      named_filter_navigation: true,
      locales: ["en", "de"],
      mobile_overflow: false,
      page_errors: errors,
    };
    console.log(JSON.stringify(result));
  } finally {
    await browser.close();
  }
});
