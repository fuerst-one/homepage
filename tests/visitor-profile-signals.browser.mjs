import assert from "node:assert/strict";
import { test } from "node:test";
import puppeteer from "puppeteer";
const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6895";
const key = "fuerst-one:visitor-profile:v1";
const read = (page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "null"), key);
async function clickText(page, text, scope = "body") {
  const buttons = await page.$$(`${scope} button`);
  for (const button of buttons) {
    if (
      (await button.evaluate((el) => el.textContent.trim())) === text ||
      (await button.evaluate((el) => el.getAttribute("aria-label"))) === text
    ) {
      await button.scrollIntoView();
      await button.click();
      return;
    }
  }
  throw new Error(`Button not found: ${text}`);
}
const hasSignal = (page, kind) =>
  page.waitForFunction(
    (key, kind) =>
      JSON.parse(localStorage.getItem(key) || "null")?.profile.signals.some(
        (s) => s.kind === kind,
      ),
    {},
    key,
    kind,
  );

test(
  "rich profile signals work through real browsing and remain under visitor control",
  { timeout: 240000 },
  async () => {
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewport({ width: 1360, height: 900 });
      const go = async (path) => {
        console.log(`visit ${path}`);
        await page.goto(base + path, {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });
        await page.waitForSelector("main");
        if (await page.evaluate((key) => !!localStorage.getItem(key), key))
          await page.waitForSelector(
            path.endsWith("/profile")
              ? ".profile-page-signature"
              : ".profile-pixel-launcher",
          );
      };
      await go("/en/projects/konfig-product-design-configurator");
      assert.equal(
        await read(page),
        null,
        "ordinary browsing never opts into profiling",
      );
      await clickText(page, "Next image");
      assert.equal(
        await read(page),
        null,
        "gallery browsing before opt-in is not saved",
      );
      await go("/en/profile");
      await page.waitForFunction(() => {
        const button = document.querySelector(
          ".profile-summary-actions button",
        );
        return button && !button.disabled;
      });
      await clickText(page, "Start my live profile");
      await page.waitForFunction((key) => !!localStorage.getItem(key), {}, key);
      await go("/en/projects/konfig-product-design-configurator");
      await hasSignal(page, "project_details_viewed");
      await go("/en/projects?all=1");
      assert.equal(
        await page.$("[data-project-search-result] [data-project-save]"),
        null,
        "project cards have no save buttons",
      );
      const previewButton = await page.$(
        'button[aria-label*="View images for Konfig"]',
      );
      assert.ok(previewButton);
      await previewButton.scrollIntoView();
      await previewButton.click();
      await page.waitForSelector('[role="dialog"] button[data-project-save]');
      await page.waitForFunction(() =>
        document
          .querySelector('[role="dialog"]')
          ?.getAnimations()
          .every((a) => a.playState === "finished"),
      );
      assert.equal(
        await page.$('[role="dialog"] button[aria-label*="Less like"]'),
        null,
      );
      await page.locator('[role="dialog"] [data-project-save]').click();
      await page.waitForFunction(
        () =>
          document
            .querySelector('[role="dialog"] button[data-project-save]')
            ?.getAttribute("aria-pressed") === "true",
      );
      console.log("heart saved");
      const moreHref = await page.$eval(
        '[role="dialog"] [data-project-more]',
        (el) => el.getAttribute("href"),
      );
      assert.ok(moreHref.endsWith("#related-projects"));
      await page.locator('[role="dialog"] [data-project-more]').click();
      await page.waitForFunction(() => location.hash === "#related-projects");
      console.log("more like this navigated");
      await page.waitForSelector("#related-projects a[data-profile-related]");
      await page.waitForSelector('[role="dialog"]', { hidden: true });
      const projectId = await page.$eval(
        "[data-profile-project]",
        (el) => el.dataset.profileProject,
      );
      assert.deepEqual((await read(page)).profile.projectChoices[projectId], {
        saved: true,
        feedback: "more",
      });
      await clickText(page, "Next image");
      await clickText(page, "Next image");
      await hasSignal(page, "gallery_explored");
      const inlineImage = await page.$eval('img[aria-hidden="false"]', (el) =>
        el.getAttribute("src"),
      );
      await clickText(page, "Enlarge images ↗");
      await page.waitForSelector('[role="dialog"]');
      assert.equal(
        await page.$eval('[role="dialog"] img[aria-hidden="false"]', (el) =>
          el.getAttribute("src"),
        ),
        inlineImage,
      );
      await page.keyboard.press("Escape");
      const architecture = await page.$(
        '[data-profile-section$="|architecture"]',
      );
      assert.ok(architecture);
      await architecture.scrollIntoView();
      await page.click("#project-facts-title");
      await hasSignal(page, "project_section_read");
      assert.ok(
        (await read(page)).profile.signals.some(
          (s) =>
            s.kind === "project_section_read" &&
            s.subject.endsWith("|architecture"),
        ),
      );
      await page.screenshot({
        path: "/tmp/profile-signals-project-desktop.png",
      });
      const caseLink = await page.$('a[href$="/case-study"]');
      assert.ok(caseLink);
      await caseLink.scrollIntoView();
      await Promise.all([
        page.waitForNavigation({ waitUntil: "domcontentloaded" }),
        caseLink.click(),
      ]);
      await hasSignal(page, "case_study_viewed");
      await go("/en/services/ai-automation/collaboration");
      await hasSignal(page, "service_collaboration_viewed");
      const serviceSection = await page.$(
        '[data-profile-service-section$="|collaboration"]',
      );
      assert.ok(serviceSection);
      await serviceSection.scrollIntoView();
      await page.click("#engagements-heading");
      await hasSignal(page, "service_section_read");
      await go("/en/services/ai-automation/assessment");
      await hasSignal(page, "service_offer_viewed");
      await go("/en/projects?all=1");
      await clickText(page, "React.js", '[aria-label="Choose a search topic"]');
      await hasSignal(page, "topic_selected");
      assert.equal(
        await page.$eval("#project-search", (el) => el.value),
        "React.js",
      );
      assert.ok(
        (await read(page)).profile.signals.some(
          (s) => s.kind === "topic_selected" && s.subject === "tools:React.js",
        ),
      );
      await go("/en/explorer");
      await page.waitForSelector(".vs-recipes button");
      const lenses = await page.$$(".vs-recipes button");
      await lenses[1].click();
      await hasSignal(page, "explorer_lens_selected");
      await page.waitForSelector(".vs-cluster-trigger");
      // If the browsing above made the profile ready, its hint sits over the
      // first cluster at this viewport until the visitor dismisses it.
      if (await page.$('button[aria-label="Dismiss hint"]'))
        await clickText(page, "Dismiss hint");
      await page.click(".vs-cluster-trigger");
      await hasSignal(page, "explorer_cluster_selected");
      await go("/en/projects/konfig-product-design-configurator");
      const related = await page.$("a[data-profile-related]");
      assert.ok(
        related,
        "published project includes related-project navigation",
      );
      await related.scrollIntoView();
      await Promise.all([
        page.waitForNavigation({ waitUntil: "domcontentloaded" }),
        related.click(),
      ]);
      await hasSignal(page, "related_project_opened");
      await go("/en/profile");
      await page.waitForSelector(".profile-choice-list article");
      await page.waitForSelector(".profile-recommendation-card");
      const savedCount = await page.$$(".profile-choice-list article");
      assert.equal(savedCount.length, 1);
      assert.equal(
        await page.$(".profile-recommendation-card [data-project-save]"),
        null,
      );
      await page.screenshot({
        path: "/tmp/profile-signals-en-desktop.png",
        fullPage: true,
      });
      await page.setViewport({ width: 375, height: 667 });
      await page.screenshot({
        path: "/tmp/profile-signals-en-mobile.png",
        fullPage: true,
      });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await go("/de/profile");
      // go() returns on the loading placeholder; the list needs the restore.
      await page.waitForSelector(".profile-choice-list");
      assert.ok(
        (
          await page.$eval(".profile-choice-list", (el) => el.textContent)
        ).includes("Konfig"),
      );
      await page.screenshot({
        path: "/tmp/profile-signals-de-mobile.png",
        fullPage: true,
      });
      await page.click(".profile-choice-list [data-project-save]");
      await page.waitForFunction(
        () => document.activeElement?.id === "profile-choices-title",
      );
      assert.equal(await page.$(".profile-choice-list article"), null);
      await clickText(page, "Interessen zurücksetzen");
      await page.waitForFunction(
        (key) =>
          JSON.parse(localStorage.getItem(key) || "null")?.profile.signals
            .length === 0,
        {},
        key,
      );
      assert.deepEqual((await read(page)).profile.projectChoices ?? {}, {});
      await clickText(page, "Profil stoppen & löschen");
      await page.waitForFunction((key) => !localStorage.getItem(key), {}, key);
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  },
);
