import assert from "node:assert/strict";
import { test } from "node:test";
import puppeteer from "puppeteer";
import { loadTs } from "./helpers/load-ts.mjs";

const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6894";

for (const locale of ["en", "de"]) {
  test(`${locale}: sidebar Explorer shows cluster and project hover cards with lens tabs as its only controls`, async () => {
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewport({ width: 1280, height: 900 });
      await page.goto(`${base}/${locale}/projects?tools=React.js`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await page.screenshot({
        path: `/tmp/homepage-navigation-${locale}-desktop.png`,
      });
      const preview = await page.waitForSelector(
        "aside [data-explorer-preview]",
      );
      await preview.scrollIntoView();
      const canvas = await page.waitForSelector(
        "[data-explorer-preview] canvas",
      );
      assert.deepEqual(
        await page.$$eval("[data-explorer-preview] button", (buttons) =>
          buttons.map((button) => [
            button.textContent.trim(),
            button.getAttribute("aria-pressed"),
          ]),
        ),
        locale === "de"
          ? [
              ["Produkt & Nutzen", "true"],
              ["Technologie", "false"],
              ["Mein Beitrag", "false"],
              ["Umfang & Umsetzung", "false"],
            ]
          : [
              ["Product purpose", "true"],
              ["Engineering", "false"],
              ["Contribution model", "false"],
              ["Scale & delivery", "false"],
            ],
      );
      assert.equal(
        await page.$("[data-explorer-preview] :is(select,input)"),
        null,
      );
      assert.equal(
        await page.$(`header nav a[href="/${locale}/explorer"]`),
        null,
      );
      const education = locale === "de" ? "Ausbildung" : "Education";
      assert.ok(
        !(await page.$eval("aside", (aside) => aside.textContent)).includes(
          education,
        ),
        "profile facts have moved out of the projects sidebar",
      );
      const href = await page.$eval("[data-explorer-preview] a", (link) =>
        link.getAttribute("href"),
      );
      assert.equal(href, `/${locale}/explorer`);
      assert.equal(new URL(page.url()).searchParams.get("tools"), "React.js");

      const bounds = await canvas.boundingBox();
      const found = new Set();
      for (let y = 16; y < bounds.height - 16 && found.size < 2; y += 12) {
        for (let x = 16; x < bounds.width - 16 && found.size < 2; x += 12) {
          await page.mouse.move(bounds.x + x, bounds.y + y);
          const hover = await page.evaluate(() => {
            const tooltip = document.querySelector(
              "[data-explorer-preview] [role=tooltip]",
            );
            return (
              tooltip && {
                kind: tooltip.getAttribute("data-space-tooltip"),
                text: tooltip.textContent,
              }
            );
          });
          if (hover) {
            assert.ok(hover.text.trim());
            assert.doesNotMatch(hover.text, /Click to explore|Anklicken/);
            if (!found.has(hover.kind))
              await page.screenshot({
                path: `/tmp/homepage-explorer-preview-${locale}-${hover.kind}-hover.png`,
              });
            found.add(hover.kind);
          }
        }
      }
      assert.deepEqual([...found].sort(), ["cluster", "project"]);
      await page.keyboard.press("Escape");
      await page.waitForFunction(
        () => !document.querySelector("[data-explorer-preview] [role=tooltip]"),
      );
      await page.screenshot({
        path: `/tmp/homepage-explorer-preview-${locale}-desktop.png`,
      });
      await page.setViewport({ width: 320, height: 740 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `/tmp/homepage-navigation-${locale}-mobile.png`,
      });
      await preview.scrollIntoView();
      await page.screenshot({
        path: `/tmp/homepage-explorer-preview-${locale}-mobile.png`,
      });
      await page.click("[data-explorer-preview] a");
      await page.waitForSelector("#atlas-explore-title", { timeout: 60000 });
      assert.equal(new URL(page.url()).pathname, `/${locale}/explorer`);
      await page.goto(`${base}/${locale}`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await page.waitForSelector(".home-about-heading");
      const profileText = await page.$eval(
        'section[aria-labelledby="home-about-title"]',
        (section) => section.textContent,
      );
      assert.ok(
        profileText.includes(education),
        "homepage profile includes the moved facts",
      );
      assert.ok(
        profileText.includes(locale === "de" ? "Sprachen" : "Languages"),
      );
      const profile = await page.$(
        'section[aria-labelledby="home-about-title"]',
      );
      const profileHeading = await profile.$(".home-about-heading");
      await profileHeading.evaluate((element) =>
        element.scrollIntoView({ block: "start" }),
      );
      await page.screenshot({
        path: `/tmp/homepage-profile-${locale}-mobile.png`,
      });
      await page.setViewport({ width: 1280, height: 900 });
      await profileHeading.evaluate((element) =>
        element.scrollIntoView({ block: "start" }),
      );
      await page.screenshot({
        path: `/tmp/homepage-profile-${locale}-desktop.png`,
      });
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  });
}

for (const locale of ["en", "de"]) {
  test(`${locale}: analysis box sits below the sidebar Explorer and offers chart views only`, async () => {
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewport({ width: 1280, height: 900 });
      await page.goto(`${base}/${locale}/projects?all=1`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      const views = await page.waitForSelector("aside select");
      assert.deepEqual(
        await views.$$eval("option", (options) =>
          options.map((option) => option.textContent),
        ),
        locale === "de"
          ? [
              "Branchen",
              "Projektrahmen",
              "Expertise",
              "Methoden & Prinzipien",
              "Technologien",
              "Bedarf",
              "Produktformate",
              "Umsetzungsstand",
              "Zielmarkt",
            ]
          : [
              "Industries",
              "Project setting",
              "Expertise",
              "Methods & principles",
              "Technologies",
              "Buyer needs",
              "Product formats",
              "Delivery stage",
              "Target market",
            ],
      );
      assert.equal(
        await views.evaluate((select) => select.value),
        "industries",
      );
      const analysis = await page.waitForSelector(
        "aside [role=region][aria-label]",
      );
      assert.equal(await analysis.$("button"), null);
      const preview = await page.waitForSelector(
        "aside [data-explorer-preview]",
      );
      assert.ok(
        (await preview.boundingBox()).y < (await views.boundingBox()).y,
        "the Explorer preview stays above the analysis box",
      );
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  });
}

test("analysis charts follow the list search, not only the facet filters", async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(`${base}/en/projects?all=1`, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    const analysis = await page.waitForSelector(
      "aside [role=region][aria-label]",
    );
    assert.equal(await analysis.$("[role=status]"), null);
    await page.type("#project-search", "zzzzqq no such project");
    await page.waitForFunction(
      () => !document.querySelector("[data-project-search-result]"),
    );
    await page.waitForSelector(
      "aside [role=region][aria-label] [role=status]",
      {
        timeout: 5000,
      },
    );
    await page.click("[data-project-search-clear]");
    await page.waitForFunction(
      () =>
        !document.querySelector(
          "aside [role=region][aria-label] [role=status]",
        ),
    );
  } finally {
    await browser.close();
  }
});

test("switching the sidebar Explorer's lens changes the question it answers", async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(`${base}/en/projects?all=1`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await page.waitForSelector("[data-explorer-preview] canvas");
    const pressed = () =>
      page.evaluate(() =>
        [...document.querySelectorAll("[data-explorer-preview] button")].map(
          (button) => button.getAttribute("aria-pressed"),
        ),
      );
    const question = () =>
      page.evaluate(
        () =>
          document.querySelector("[data-explorer-lens-question]").textContent,
      );
    assert.equal(await question(), "What does it help people do?");
    await page.click("[data-explorer-preview] button:nth-of-type(4)");
    assert.equal(await question(), "What scale have I worked at?");
    assert.deepEqual(await pressed(), ["false", "false", "false", "true"]);
    assert.ok(await page.waitForSelector("[data-explorer-preview] canvas"));
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test("the analysis view decides what the project cards lead with", async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(`${base}/en/projects?all=1`, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    const cardFacets = () =>
      page.$$eval("article [data-project-facet-values]", (lines) =>
        lines.map((line) => ({
          view: line.getAttribute("data-project-facet-values"),
          labels: [...line.querySelectorAll("[data-facet-value]")].map(
            (label) => label.textContent,
          ),
          more: line.querySelector("[data-facet-more]")?.textContent ?? null,
        })),
      );

    const industries = await cardFacets();
    assert.ok(industries.length > 0);
    assert.ok(industries.every(({ view }) => view === "industries"));

    await page.select("aside select", "projectType");
    await page.waitForFunction(() =>
      [
        ...document.querySelectorAll("article [data-project-facet-values]"),
      ].every(
        (line) =>
          line.getAttribute("data-project-facet-values") === "projectType",
      ),
    );
    const settings = await page.$$eval("article", (cards) =>
      cards.map((card) => ({
        header: card.querySelector("[data-project-facet-values]")?.textContent,
        meta: card
          .querySelector("header p.text-xs")
          ?.textContent.split(" · ")[0],
      })),
    );
    assert.ok(settings.every(({ header, meta }) => header === meta));

    await page.select("aside select", "tools");
    await page.waitForFunction(() =>
      [
        ...document.querySelectorAll("article [data-project-facet-values]"),
      ].every(
        (line) => line.getAttribute("data-project-facet-values") === "tools",
      ),
    );
    const tools = await cardFacets();
    assert.ok(tools.every(({ labels }) => labels.length <= 3));
    assert.ok(tools.some(({ more }) => more?.startsWith("+")));
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test("capabilities show as a full list like tools, not a capped treemap", async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(`${base}/en/projects?all=1`, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    await page.select("aside select", "capabilities");
    const analysis = "aside [role=region][aria-label]";
    await page.waitForSelector(`${analysis} [role=progressbar]`);
    assert.equal(await page.$(`${analysis} canvas`), null);
    const rows = await page.$$eval(
      `${analysis} [role=progressbar]`,
      (bars) => bars.length,
    );
    assert.ok(rows > 12, `expected every capability, got ${rows} rows`);
  } finally {
    await browser.close();
  }
});

test("German cards and charts show buyer needs in German", async () => {
  const { CASE_VOCABULARY } = loadTs(
    new URL("../packages/content/src/projectCase.ts", import.meta.url),
  );
  const german = new Set(Object.values(CASE_VOCABULARY.buyerNeeds));
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(`${base}/de/projects?all=1`, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    await page.select("aside select", "buyerNeeds");
    await page.waitForSelector(
      'article [data-project-facet-values="buyerNeeds"] [data-facet-value]',
    );
    const cardLabels = await page.$$eval(
      "article [data-facet-value]",
      (labels) => labels.map((label) => label.textContent),
    );
    assert.ok(cardLabels.length > 0);
    assert.deepEqual(
      cardLabels.filter((label) => !german.has(label)),
      [],
    );
    const chartLabels = await page.$$eval(
      "aside [role=region][aria-label] [data-facet-option]",
      (rows) => rows.map((row) => row.getAttribute("data-facet-option-label")),
    );
    assert.ok(chartLabels.length > 0);
    assert.deepEqual(
      chartLabels.filter((label) => !german.has(label)),
      [],
    );
  } finally {
    await browser.close();
  }
});

test("views with many values show a list; small ones and industries keep their chart", async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(`${base}/en/projects?all=1`, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    const analysis = "aside [role=region][aria-label]";
    for (const view of ["methods", "productTypes"]) {
      await page.select("aside select", view);
      await page.waitForSelector(`${analysis} [role=progressbar]`);
      assert.equal(await page.$(`${analysis} canvas`), null, view);
    }
    await page.select("aside select", "industries");
    await page.waitForSelector(`${analysis} canvas`);
    await page.select("aside select", "projectType");
    await page.waitForSelector(`${analysis} canvas`);
    assert.equal(await page.$(`${analysis} [role=progressbar]`), null);
  } finally {
    await browser.close();
  }
});

test("home lists every expertise and method, while industries stay a treemap", async () => {
  const data = await fetch(`${base}/api/projects?locale=en`).then((r) =>
    r.json(),
  );
  const distinct = (key) =>
    new Set(data.results.flatMap((project) => project[key] ?? [])).size;
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(`${base}/en`, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    for (const key of ["capabilities", "methods"]) {
      const rows = await page.$$eval(
        `[data-home-facet="${key}"] [data-home-facet-list] a`,
        (links) => links.map((link) => link.getAttribute("href")),
      );
      assert.equal(rows.length, distinct(key), key);
      assert.ok(rows.every((href) => href.includes(`/en/projects?${key}=`)));
      assert.equal(
        await page.$(`[data-home-facet="${key}"] .home-facet-chart`),
        null,
      );
    }
    assert.ok(await page.$('[data-home-facet="industries"] .home-facet-chart'));
  } finally {
    await browser.close();
  }
});

test("list rows show every name and count in full", async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(`${base}/en/projects?all=1`, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });
    for (const view of ["capabilities", "buyerNeeds"]) {
      await page.select("aside select", view);
      await page.waitForSelector(
        "aside [role=region][aria-label] [data-facet-option]",
      );
      const clipped = await page.$$eval(
        "aside [role=region][aria-label] [data-facet-option]",
        (rows) =>
          rows
            .filter((row) =>
              [row, ...row.querySelectorAll("*")].some(
                (element) => element.scrollWidth > element.clientWidth,
              ),
            )
            .map((row) => row.textContent),
      );
      assert.deepEqual(clipped, [], view);
    }
  } finally {
    await browser.close();
  }
});
