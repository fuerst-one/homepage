import assert from "node:assert/strict";
import { test } from "node:test";
import puppeteer from "puppeteer";

const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";
test("discovery keeps search suggestions below a separate project list", async () => {
  const data = await fetch(`${base}/api/projects?locale=en`).then((r) =>
    r.text(),
  );
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    let held;
    let ready = false;
    let modelCalls = 0;
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (request.url().includes("/api/projects?")) {
        if (ready)
          void request.respond({
            status: 200,
            contentType: "application/json",
            body: data,
          });
        else held = request;
      } else if (request.url().endsWith("/api/assistant")) {
        modelCalls++;
        void request.respond({ status: 503, body: "{}" });
      } else void request.continue();
    });
    await page.goto(`${base}/en`, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    await page.waitForSelector(".landing-backdrop canvas");
    await page.type("#landing-command", "ai");
    await page.waitForSelector(".landing-discovery-panel");
    assert.equal(
      await page.$eval(".landing-quick-access", (nav) => nav.inert),
      true,
    );
    assert.equal(
      await page.$eval(".landing-intro", (intro) =>
        intro.getAttribute("aria-hidden"),
      ),
      "true",
    );
    assert.match(
      await page.$eval(
        ".landing-discovery-panel",
        (panel) => panel.textContent,
      ),
      /Loading/,
    );
    assert.ok(
      held,
      "project request is held while the loading state is visible",
    );
    ready = true;
    await held.respond({
      status: 200,
      contentType: "application/json",
      body: data,
    });
    await page.waitForSelector(
      ".landing-discovery-panel a.landing-search-result",
    );
    assert.equal(
      await page.$(".landing-discovery-panel .landing-search-filter"),
      null,
    );
    assert.ok(await page.$(".landing-discovery-choices button"));
    assert.equal((await page.$$(".landing-search-results")).length, 1);
    const hrefs = await page.$$eval("a.landing-search-result", (links) =>
      links.map((link) => link.getAttribute("href")),
    );
    assert.equal(
      new Set(hrefs).size,
      hrefs.length,
      "projects are not repeated as separate suggestion chips",
    );
    const project = await page.$("a.landing-search-result");
    const exactProject = await project.evaluate((link) => ({
      name: link.querySelector(".landing-search-result-name").textContent,
      href: link.getAttribute("href"),
    }));
    await project.hover();
    await page.waitForFunction(
      () => document.querySelector(".landing-stage").dataset.project,
    );
    const previewed = await page.$eval(
      ".landing-stage",
      (stage) => stage.dataset.project,
    );
    await new Promise((resolve) => setTimeout(resolve, 3200));
    assert.equal(
      await page.$eval(".landing", (landing) => landing.dataset.shapeMounted),
      "true",
      "a hovered project keeps its sculpture mounted",
    );
    await project.focus();
    assert.equal(
      await page.$eval(".landing-stage", (stage) => stage.dataset.project),
      previewed,
    );
    await page.focus(".landing-discovery-choices button");
    await page.keyboard.press("ArrowDown");
    assert.equal(
      await page.evaluate(() =>
        document.activeElement.hasAttribute("data-discovery-choice"),
      ),
      true,
    );
    await page.focus(".landing-discovery-choices button");
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () => document.querySelector("#landing-command").value !== "ai",
    );
    await page.focus("#landing-command");
    await page.keyboard.press("Escape");
    await page.waitForFunction(
      () => !document.querySelector(".landing-discovery-panel"),
    );
    assert.equal(
      await page.$eval(".landing-quick-access", (nav) => nav.inert),
      false,
    );
    await page.type("#landing-command", "ai");
    await page.waitForSelector(".landing-discovery-choices button");
    await page.click(".landing-discovery-choices button");
    assert.equal(
      await page.$eval(
        "#landing-command",
        (input) => document.activeElement === input,
      ),
      true,
    );
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () =>
        location.pathname === "/en/projects" &&
        new URLSearchParams(location.search).size > 0 &&
        !new URLSearchParams(location.search).has("id"),
      { timeout: 90000 },
    );
    await page.goto(`${base}/en`, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    await page.waitForSelector(".landing-backdrop canvas");
    await page.type("#landing-command", exactProject.name);
    await page.waitForFunction(
      () => !document.querySelector(".landing-submit").disabled,
    );
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      (href) => location.pathname === href,
      { timeout: 90000 },
      exactProject.href,
    );
    assert.equal(
      modelCalls,
      0,
      "exact keyword and project navigation never call the model",
    );
  } finally {
    await browser.close();
  }
});
