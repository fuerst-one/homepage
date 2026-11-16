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

test("mobile results keep a complete project readable after viewport changes and allow opening the last match", async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: 390,
      height: 660,
      isMobile: true,
      hasTouch: true,
    });
    await page.goto(`${base}/en`, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    await page.type("#landing-command", "Seabo");
    await page.waitForSelector("a.landing-search-result");
    // Focusing a search field and collapsing browser chrome changes the visible
    // viewport on phones. The first complete result must still be readable.
    await page.$eval("#landing-command", (input) =>
      input.scrollIntoView({ block: "center" }),
    );
    for (const viewport of [
      { width: 390, height: 520 },
      { width: 320, height: 480 },
      { width: 767, height: 540 },
    ]) {
      await page.setViewport({ ...viewport, isMobile: true, hasTouch: true });
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
      const readable = await page.$eval("a.landing-search-result", (link) => {
        const panel = link
          .closest(".landing-discovery-panel")
          .getBoundingClientRect();
        const result = link.getBoundingClientRect();
        return result.top >= panel.top && result.bottom <= panel.bottom;
      });
      assert.equal(
        readable,
        true,
        `the complete result is readable at ${viewport.width}×${viewport.height}`,
      );
    }
    await page.setViewport({
      width: 390,
      height: 520,
      isMobile: true,
      hasTouch: true,
    });
    await page.focus("#landing-command");
    await page.keyboard.press("Escape");
    await page.type("#landing-command", "ai");
    await page.waitForSelector("a.landing-search-result");
    const links = await page.$$("a.landing-search-result");
    assert.ok(links.length > 1, "exercise a scrollable set of matches");
    const last = links.at(-1);
    const href = await last.evaluate((link) => link.getAttribute("href"));
    await last.focus();
    const reachable = await last.evaluate((link) => {
      const panel = link
        .closest(".landing-discovery-panel")
        .getBoundingClientRect();
      const row = link.getBoundingClientRect();
      return row.top >= panel.top - 1 && row.bottom <= panel.bottom + 1;
    });
    assert.equal(
      reachable,
      true,
      "scrolling/focus reveals the complete last result",
    );
    await last.click();
    await page.waitForFunction(
      (path) => location.pathname === path,
      { timeout: 90000 },
      href,
    );
  } finally {
    await browser.close();
  }
});
