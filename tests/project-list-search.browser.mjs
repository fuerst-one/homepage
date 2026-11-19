import assert from "node:assert/strict";
import { test } from "node:test";
import puppeteer from "puppeteer";
import { grantKnowledgeConsent } from "./helpers/knowledge-consent.mjs";
import { loadTs } from "./helpers/load-ts.mjs";
const {
  KNOWLEDGE_CONSENT_KEY,
  KNOWLEDGE_CONSENT_VERSION,
  KNOWLEDGE_CONSENT_TTL,
  KNOWLEDGE_CONSENT_CHANGE_EVENT,
} = loadTs(new URL("../apps/web/src/lib/knowledgeConsent.ts", import.meta.url));
const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6894";

for (const locale of ["en", "de"]) {
  test(`${locale}: project search filters cards locally, composes with facets, and clears`, async () => {
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const errors = [];
      const paidRequests = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("request", (request) => {
        if (request.url().endsWith("/api/projects/search"))
          paidRequests.push(request.url());
      });
      await page.setViewport({ width: 1280, height: 900 });
      await page.goto(`${base}/${locale}/projects?all=1`, {
        waitUntil: "networkidle2",
        timeout: 90000,
      });
      assert.ok(
        await page.$("#project-search"),
        "project list includes a search field",
      );
      assert.equal(
        await page.$("[data-project-search-semantic]"),
        null,
        "visitors without opt-in only receive local search",
      );
      await page.type(
        "#project-search",
        locale === "de"
          ? "Zeig mir Projekte mit React"
          : "show me projects using React",
      );
      await page.waitForFunction(
        () =>
          document.querySelectorAll("[data-project-search-result]").length > 0,
      );
      const found = await page.$$eval("[data-project-search-result]", (cards) =>
        cards.map((card) => card.getAttribute("data-project-search-result")),
      );
      assert.ok(found.length > 0);
      await page.focus("#project-search");
      await page.keyboard.press("Enter");
      await page.evaluate(() => new Promise(requestAnimationFrame));
      assert.equal(
        await page.$("[data-ai-consent]"),
        null,
        "ordinary search does not prompt for AI permission",
      );
      assert.deepEqual(
        paidRequests,
        [],
        "typing never sends the query for embedding",
      );
      assert.ok(
        !new URL(page.url()).searchParams.has("q"),
        "free text stays out of URLs and server access logs",
      );
      await page.screenshot({
        path: `/tmp/homepage-project-search-${locale}-desktop.png`,
      });
      await page.setViewport({ width: 320, height: 740 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      await page.screenshot({
        path: `/tmp/homepage-project-search-${locale}-mobile.png`,
      });
      await page.focus("#project-search");
      await page.keyboard.press("Escape");
      assert.equal(
        await page.$eval("#project-search", (input) => input.value),
        "",
      );
      await page.goto(`${base}/${locale}/projects?tools=Vue.js`, {
        waitUntil: "networkidle2",
        timeout: 90000,
      });
      await page.type("#project-search", "React");
      await page.waitForFunction(
        () =>
          document.querySelectorAll("[data-project-search-result]").length ===
          0,
      );
      await page.focus("#project-search");
      await page.keyboard.press("Escape");
      await page.waitForFunction(
        () =>
          document.querySelectorAll("[data-project-search-result]").length > 0,
      );
      assert.equal(new URL(page.url()).searchParams.get("tools"), "Vue.js");
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  });
}

test("semantic search uses existing opt-in, withdraws immediately and falls back locally", async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await grantKnowledgeConsent(page);
    await page.setViewport({ width: 1280, height: 900 });
    const publicProjects = await fetch(`${base}/api/projects?locale=en`).then(
      (response) => response.json(),
    );
    const target = publicProjects.results[0].id;
    const sent = [];
    let unavailable = false;
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (!request.url().endsWith("/api/projects/search")) {
        void request.continue();
        return;
      }
      sent.push(JSON.parse(request.postData()));
      void request.respond({
        status: unavailable ? 503 : 200,
        contentType: "application/json",
        body: JSON.stringify(
          unavailable ? { error: "unavailable" } : { projectIds: [target] },
        ),
      });
    });
    await page.goto(`${base}/en/projects?all=1`, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    const originalQuery = "  nebulaquartz  ";
    await page.type("#project-search", originalQuery);
    await page.waitForFunction(
      () =>
        document.querySelectorAll("[data-project-search-result]").length === 0,
    );
    assert.deepEqual(sent, []);
    await page.click("[data-project-search-semantic]");
    assert.equal(await page.$("[data-ai-consent]"), null);
    await page.waitForFunction(
      (id) =>
        document
          .querySelector("[data-project-search-result]")
          ?.getAttribute("data-project-search-result") === id,
      {},
      target,
    );
    assert.equal(sent.length, 1);
    assert.equal(
      sent[0].message,
      originalQuery,
      "raw field text reaches the API",
    );
    assert.equal(sent[0].consent.allowed, true);
    await page.focus("#project-search");
    await page.keyboard.press("Enter");
    await page.evaluate(() => new Promise(requestAnimationFrame));
    assert.equal(
      sent.length,
      1,
      "resubmitting completed results does not spend another embedding request",
    );
    await page.click("[data-project-search-withdraw]");
    await page.waitForFunction(
      () =>
        document.activeElement?.id === "project-search" &&
        document.querySelectorAll("[data-project-search-result]").length === 0,
    );
    assert.equal(
      await page.$("[data-project-search-semantic]"),
      null,
      "withdrawal hides the semantic control immediately",
    );
    await page.keyboard.press("Enter");
    await page.evaluate(() => new Promise(requestAnimationFrame));
    assert.equal(await page.$("[data-ai-consent]"), null);
    assert.equal(
      sent.length,
      1,
      "withdrawal prevents further semantic requests",
    );
    await page.click("[data-project-search-clear]");
    await page.waitForFunction(
      () =>
        document.activeElement?.id === "project-search" &&
        document.querySelector("#project-search").value === "",
    );
    unavailable = true;
    await page.type("#project-search", "React");
    // Simulate an explicit permission change from another AI surface. Merely
    // changing consent must not send the text already in the search field.
    await page.evaluate(
      ({ key, version, event }) => {
        const receipt = {
          version,
          decidedAt: Date.now(),
          allowed: true,
          remember: false,
          scope: "search",
        };
        localStorage.setItem(key, JSON.stringify(receipt));
        window.dispatchEvent(new CustomEvent(event, { detail: receipt }));
      },
      {
        key: KNOWLEDGE_CONSENT_KEY,
        version: KNOWLEDGE_CONSENT_VERSION,
        event: KNOWLEDGE_CONSENT_CHANGE_EVENT,
      },
    );
    await page.waitForSelector("[data-project-search-semantic]");
    assert.equal(sent.length, 1);
    await page.click("[data-project-search-semantic]");
    await page.waitForFunction(() =>
      document
        .querySelector("#project-search-status")
        ?.textContent.includes("unavailable"),
    );
    assert.ok(
      await page.$("[data-project-search-result]"),
      "local results survive provider failure",
    );
    await page.screenshot({
      path: "/tmp/homepage-project-search-fallback.png",
    });
  } finally {
    await browser.close();
  }
});

test("declined, expired and outdated permissions never expose semantic search or prompt on Enter", async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    for (const receipt of [
      {
        version: KNOWLEDGE_CONSENT_VERSION,
        decidedAt: Date.now(),
        allowed: false,
        remember: false,
      },
      {
        version: KNOWLEDGE_CONSENT_VERSION,
        decidedAt: Date.now() - KNOWLEDGE_CONSENT_TTL - 1000,
        allowed: true,
        remember: false,
      },
      {
        version: "outdated",
        decidedAt: Date.now(),
        allowed: true,
        remember: false,
      },
    ]) {
      const page = await browser.newPage();
      let sent = 0;
      page.on("request", (request) => {
        if (request.url().endsWith("/api/projects/search")) sent++;
      });
      await page.evaluateOnNewDocument(
        ({ key, receipt }) => {
          localStorage.setItem(key, JSON.stringify(receipt));
        },
        { key: KNOWLEDGE_CONSENT_KEY, receipt },
      );
      await page.goto(`${base}/en/projects?all=1`, {
        waitUntil: "networkidle2",
        timeout: 90000,
      });
      assert.equal(await page.$("[data-project-search-semantic]"), null);
      await page.type("#project-search", "React");
      await page.keyboard.press("Enter");
      await page.evaluate(() => new Promise(requestAnimationFrame));
      assert.equal(await page.$("[data-ai-consent]"), null);
      assert.equal(sent, 0);
      assert.ok(await page.$("[data-project-search-result]"));
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test("the filter console's result count follows the search, not only the facet filters", async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(`${base}/en/projects?all=1`, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    const announced = () =>
      page.$eval('main [role=status][aria-label="Project results"]', (status) =>
        status.textContent.trim(),
      );
    await page.type("#project-search", "React");
    await page.waitForFunction(
      () => document.querySelector("#project-search-status")?.textContent,
    );
    const cards = await page.$$eval(
      "[data-project-search-result]",
      (found) => found.length,
    );
    assert.ok(cards > 0);
    assert.equal(await announced(), `${cards} results`);
    await page.type("#project-search", " zzzzqq no such project");
    await page.waitForFunction(
      () => !document.querySelector("[data-project-search-result]"),
    );
    assert.equal(await announced(), "0 results");
  } finally {
    await browser.close();
  }
});
