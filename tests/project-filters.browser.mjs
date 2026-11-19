import assert from "node:assert/strict";
import { test } from "node:test";
import puppeteer from "puppeteer";
const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";

for (const locale of ["en", "de"]) {
  test(`${locale}: exact presets hide the active-filter summary and custom filters restore it`, async () => {
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });
      await page.goto(`${base}/${locale}/projects`, {
        waitUntil: "networkidle2",
        timeout: 90000,
      });
      await page.waitForSelector("main button[aria-pressed=true]");
      const presetCount = await page.$$eval(
        "main button[aria-pressed]",
        (buttons) => buttons.length,
      );
      assert.equal(presetCount, 6);
      for (let index = 0; index < presetCount; index++) {
        const presets = await page.$$("main button[aria-pressed]");
        await presets[index].click();
        await page.waitForFunction(
          (index) =>
            document
              .querySelectorAll("main button[aria-pressed]")
              [index]?.getAttribute("aria-pressed") === "true",
          {},
          index,
        );
        assert.equal(
          await page.$(".filter-active-summary"),
          null,
          "the selected preset already describes the filters",
        );
        assert.ok(
          await page.$('main [role="status"]'),
          "result-count announcements remain available when the visual summary is hidden",
        );
      }
      await page.goto(
        `${base}/${locale}/projects?capabilities=AI+Engineering&tools=React.js`,
        { waitUntil: "domcontentloaded", timeout: 90000 },
      );
      await page.waitForSelector(".filter-active-summary");
      assert.equal(
        await page.$$eval(
          "main button[aria-pressed=true]",
          (buttons) => buttons.length,
        ),
        0,
      );
      assert.equal(
        await page.$$eval(
          '.filter-active-summary button[aria-label^="Remove"], .filter-active-summary button[aria-label^="Entfernen"]',
          (buttons) => buttons.length,
        ),
        2,
      );
      await page.click(".filter-active-summary [data-clear-filters]");
      await page.waitForFunction(
        () => !document.querySelector(".filter-active-summary"),
      );
      assert.ok(await page.$("main button[aria-pressed=true]"));
      // Restoring this exact preset through the URL has the same compact state.
      await page.goto(`${base}/${locale}/projects?featured=true`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await page.waitForSelector("main button[aria-pressed=true]");
      assert.equal(await page.$(".filter-active-summary"), null);
    } finally {
      await browser.close();
    }
  });
}

test("named filters remain visible and removable with the filter console collapsed", async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const data = await fetch(`${base}/api/projects?locale=en`).then(
      (response) => response.json(),
    );
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(`${base}/en/projects?capabilities=AI+Engineering`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await page.waitForSelector(".filter-active-summary", { timeout: 5000 });
    assert.match(
      await page.$eval(".filter-active-summary", (e) => e.textContent),
      /AI Engineering/,
    );
    assert.equal(
      await page.$eval(".filter-active-summary", (e) =>
        e.parentElement
          .querySelector("button[aria-expanded]")
          .getAttribute("aria-expanded"),
      ),
      "false",
    );
    assert.ok(
      await page.$(
        '.filter-active-summary button[aria-label="Remove Capabilities: AI Engineering"]',
      ),
    );
    await page.click(
      '.filter-active-summary button[aria-label="Remove Capabilities: AI Engineering"]',
    );
    await page.waitForFunction(
      () => !new URLSearchParams(location.search).has("capabilities"),
    );
    assert.equal(
      await page.$('.filter-active-summary button[aria-label^="Remove"]'),
      null,
    );
    await page.goto(
      `${base}/en/projects?capabilities=AI+Engineering&tools=React.js`,
      { waitUntil: "domcontentloaded", timeout: 90000 },
    );
    await page.waitForFunction(
      () =>
        document.querySelectorAll(
          '.filter-active-summary button[aria-label^="Remove"]',
        ).length === 2,
    );
    await page.click(".filter-active-summary button[data-clear-filters]");
    await page.waitForFunction(
      () => new URLSearchParams(location.search).get("all") === "1",
    );
    assert.equal(
      await page.$('.filter-active-summary button[aria-label^="Remove"]'),
      null,
    );
    const legacyProject = data.results[0];
    await page.goto(`${base}/en/projects?id=${legacyProject.id}`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await page.waitForFunction(
      (name) =>
        document
          .querySelector(".filter-active-summary")
          ?.textContent.includes(name),
      {},
      legacyProject.name,
    );
    assert.equal(
      await page.$eval(
        ".filter-active-summary",
        (element, id) => element.textContent.includes(id),
        legacyProject.id,
      ),
      false,
    );
    await page.goto(`${base}/en/projects?buyerNeeds=Add+AI+capabilities`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    const matching = data.results.filter((project) =>
      project.matching?.buyerNeeds.includes("Add AI capabilities"),
    ).length;
    assert.ok(matching > 0);
    await page.waitForFunction(
      (expected) =>
        document
          .querySelector('main [role=status][aria-label="Project results"]')
          ?.textContent.trim() === `${expected} results`,
      {},
      matching,
    );
    assert.match(
      await page.$eval(
        ".filter-active-summary",
        (element) => element.textContent,
      ),
      /Buyer need:.*Add AI capabilities/,
    );
    await page.screenshot({ path: "/tmp/homepage-active-filters-desktop.png" });
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${base}/de/projects?capabilities=AI+Engineering`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await page.waitForSelector(".filter-active-summary");
    assert.match(
      await page.$eval(".filter-active-summary", (e) => e.textContent),
      /Aktive Filter/,
    );
    assert.ok(
      await page.$(
        '.filter-active-summary button[aria-label="Entfernen Kompetenzen: AI Engineering"]',
      ),
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.screenshot({ path: "/tmp/homepage-active-filters-mobile.png" });
  } finally {
    await browser.close();
  }
});

for (const query of ["?all=1", "?tools=React.js"]) {
  test(`opening the project list with ${query} never rewrites the URL to other filters`, async () => {
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const visited = [];
      page.on("framenavigated", (frame) => {
        if (frame === page.mainFrame())
          visited.push(new URL(frame.url()).search);
      });
      await page.goto(`${base}/en/projects${query}`, {
        waitUntil: "networkidle2",
        timeout: 90000,
      });
      await page.waitForSelector("[data-project-search-result]");
      await new Promise((resolve) => setTimeout(resolve, 1500));
      assert.deepEqual([...new Set(visited)], [query]);
    } finally {
      await browser.close();
    }
  });
}
