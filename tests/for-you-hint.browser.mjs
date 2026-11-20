import assert from "node:assert/strict";
import { test as runTest } from "node:test";
import puppeteer from "puppeteer";
import { loadTs } from "./helpers/load-ts.mjs";
const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6895";
const { FOR_YOU_ENABLED } = loadTs(
  new URL("../apps/web/src/lib/forYouEnabled.ts", import.meta.url),
);
// The switched-off state is covered by for-you-disabled.
const test = FOR_YOU_ENABLED ? runTest : runTest.skip;
const key = "fuerst-one:visitor-profile:v1";
const HINT = ".profile-for-you-hint";
const NAV_LINK = ".content-header-for-you";
const LAUNCHER = ".profile-pixel-launcher";
const DOCK_LINK = ".profile-for-you-button";
const OPEN_DIALOG = '[role="dialog"][data-state="open"]';
const READY_TOPIC = "buyerNeeds:Automate repetitive work";
const copy = {
  en: {
    start: "Start my live profile",
    topics: "Choose a search topic",
    hint: "Your profile is ready.",
    link: "See your matches",
    dismiss: "Dismiss hint",
    nav: "For you",
    enlarge: "Enlarge images ↗",
  },
  de: {
    start: "Mein Live-Profil starten",
    topics: "Thema für die Suche wählen",
    hint: "Dein Profil ist bereit.",
    link: "Vorschläge ansehen",
    dismiss: "Hinweis schließen",
    nav: "Für dich",
    enlarge: "Bilder vergrößern ↗",
  },
};
const saved = (page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "null"), key);
const exists = (page, selector) => page.$(selector).then((el) => !!el);
/** Responsive layouts can keep a hidden twin of a button, so take the visible one. */
async function clickButton(page, text) {
  const button = await page.waitForFunction(
    (text) =>
      [...document.querySelectorAll("button")].find(
        (el) => el.textContent.trim() === text && el.getClientRects().length,
      ),
    {},
    text,
  );
  await button.scrollIntoView();
  await button.click();
}
const box = (page, selector) =>
  page.$eval(selector, (el) => {
    const { x, y, width, height } = el.getBoundingClientRect();
    return [x, y + scrollY, width, height].map(Math.round).join(",");
  });
/** The link belongs under availability and languages, above the navigation. */
const linkPlacement = (page) =>
  page.evaluate((navLink) => {
    const rect = (selector) =>
      document.querySelector(selector).getBoundingClientRect();
    const link = rect(navLink);
    return {
      belowAvailability:
        link.top >= rect(".content-header-availability").bottom,
      belowLanguages: link.top >= rect(".content-header-languages").bottom,
      aboveNavigation: link.bottom <= rect(".content-header-navigation").top,
    };
  }, NAV_LINK);

for (const { locale, width, height, finish } of [
  { locale: "en", width: 1360, height: 900, finish: "dismiss" },
  { locale: "de", width: 1360, height: 900, finish: "follow" },
  { locale: "en", width: 375, height: 812, finish: "launcher" },
  { locale: "de", width: 375, height: 812, finish: "dismiss" },
])
  test(
    `${locale} at ${width}px: the ready hint and the For you link appear and ${finish} ends the hint`,
    { timeout: 240000 },
    async () => {
      const text = copy[locale];
      const browser = await puppeteer.launch({ headless: true });
      try {
        const page = await browser.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.setViewport({ width, height });
        const go = async (path) => {
          await page.goto(`${base}/${locale}${path}`, {
            waitUntil: "domcontentloaded",
            timeout: 60000,
          });
          await page.waitForSelector(".content-header");
        };
        const catalog = await fetch(`${base}/api/profile/catalog`).then((r) =>
          r.json(),
        );
        const [project] = catalog.projects;
        const listing = "/projects?all=1";

        await go("/profile");
        await page.waitForFunction(() => {
          const button = document.querySelector(
            ".profile-summary-actions button",
          );
          return button && !button.disabled;
        });
        await clickButton(page, text.start);
        await page.waitForFunction((k) => !!localStorage.getItem(k), {}, key);

        await go(listing);
        await page.waitForSelector(LAUNCHER);
        const navigationBefore = await box(page, ".content-header-navigation");
        assert.equal(await exists(page, NAV_LINK), false);
        assert.equal(await exists(page, DOCK_LINK), false);
        assert.equal(await exists(page, HINT), false);

        const closeDialog = async () => {
          await page.keyboard.press("Escape");
          await page.waitForSelector('[role="dialog"]', { hidden: true });
        };
        // One explicit choice of a buyer need passes the readiness gate.
        const topic = await page.waitForFunction(
          (label) =>
            document.querySelector(`[role="group"][aria-label="${label}"]`)
              ?.firstElementChild,
          {},
          text.topics,
        );
        await topic.scrollIntoView();
        await topic.click();
        await page.waitForFunction(
          (k, subject) =>
            JSON.parse(localStorage.getItem(k) || "null")?.profile.signals.some(
              (s) => s.kind === "topic_selected" && s.subject === subject,
            ),
          {},
          key,
          READY_TOPIC,
        );
        await page.waitForSelector(NAV_LINK);
        await page.waitForSelector(HINT);
        assert.equal(
          await page.evaluate(
            (hint) => !!document.activeElement?.closest(hint),
            HINT,
          ),
          false,
          "the hint does not take focus",
        );
        // The hint slides in, so its final position is known once it has landed.
        await page.waitForFunction(
          (hint) =>
            document
              .querySelector(hint)
              .getAnimations()
              .every((animation) => animation.playState === "finished"),
          {},
          HINT,
        );
        const hint = await page.$eval(HINT, (el) => {
          const box = el.getBoundingClientRect();
          const launcher = document
            .querySelector(".profile-pixel-launcher")
            .getBoundingClientRect();
          return {
            text: el.querySelector("p").textContent,
            link: el.querySelector("a").textContent.trim(),
            href: el.querySelector("a").getAttribute("href"),
            dismiss: el.querySelector("button").getAttribute("aria-label"),
            live: el.parentElement.getAttribute("aria-live"),
            profileUi: !!el.closest("[data-profile-ui]"),
            inViewport:
              box.left >= 0 &&
              box.top >= 0 &&
              box.right <= innerWidth &&
              box.bottom <= innerHeight,
            gapAboveLauncher: Math.round(launcher.top - box.bottom),
            notchOverLauncher:
              Math.abs(
                box.right -
                  parseFloat(getComputedStyle(el, "::after").right) -
                  parseFloat(getComputedStyle(el, "::after").width) / 2 -
                  (launcher.left + launcher.right) / 2,
              ) <= 1,
            animated: getComputedStyle(el).animationName !== "none",
          };
        });
        assert.deepEqual(hint, {
          text: text.hint,
          link: `${text.link} →`,
          href: `/${locale}/for-you`,
          dismiss: text.dismiss,
          live: "polite",
          profileUi: true,
          inViewport: true,
          gapAboveLauncher: 12,
          notchOverLauncher: true,
          animated: true,
        });
        assert.deepEqual(
          await page.$eval(NAV_LINK, (el) => ({
            text: el.textContent,
            href: el.getAttribute("href"),
            current: el.getAttribute("aria-current"),
          })),
          { text: text.nav, href: `/${locale}/for-you`, current: null },
        );
        // The same link hangs under the signature, as wide as it and on one line.
        assert.deepEqual(
          await page.$eval(DOCK_LINK, (el) => {
            const box = el.getBoundingClientRect();
            const launcher = document
              .querySelector(".profile-pixel-launcher")
              .getBoundingClientRect();
            return {
              text: el.textContent,
              href: el.getAttribute("href"),
              profileUi: !!el.closest("[data-profile-ui]"),
              asWideAsLauncher:
                Math.abs(box.left - launcher.left) < 1 &&
                Math.abs(box.right - launcher.right) < 1,
              attachedBelowLauncher: Math.abs(box.top - launcher.bottom) < 1,
              labelFits: el.scrollWidth <= el.clientWidth,
              inViewport: box.bottom <= innerHeight,
            };
          }),
          {
            text: text.nav,
            href: `/${locale}/for-you`,
            profileUi: true,
            asWideAsLauncher: true,
            attachedBelowLauncher: true,
            labelFits: true,
            inViewport: true,
          },
        );

        await go(`${listing}&focus=${encodeURIComponent(project.id)}`);
        await page.waitForSelector(OPEN_DIALOG);
        await page.waitForSelector(NAV_LINK);
        assert.equal(
          await exists(page, HINT),
          false,
          "no hint while the project dialog is open",
        );
        await closeDialog();
        await page.waitForSelector(HINT);

        // Still due after a reload, with the link in its place in the header.
        await go(listing);
        await page.waitForSelector(HINT);
        await page.waitForSelector(NAV_LINK);
        assert.deepEqual(await linkPlacement(page), {
          belowAvailability: true,
          belowLanguages: true,
          aboveNavigation: true,
        });
        // Beside the portrait there is room for it; a phone gets a row of its own.
        if (width >= 768)
          assert.equal(
            await box(page, ".content-header-navigation"),
            navigationBefore,
            "the link does not move the page",
          );
        await page.emulateMediaFeatures([
          { name: "prefers-reduced-motion", value: "reduce" },
        ]);
        assert.equal(
          await page.$eval(HINT, (el) => getComputedStyle(el).animationName),
          "none",
        );

        await go(new URL(project.href, base).pathname.replace(/^\/en/, ""));
        await page.waitForSelector(HINT);
        await clickButton(page, text.enlarge);
        await page.waitForSelector(OPEN_DIALOG);
        assert.equal(
          await exists(page, HINT),
          false,
          "no hint under the full-screen image view",
        );
        await closeDialog();
        await page.waitForSelector(HINT);

        await go("/profile");
        await page.waitForSelector(".profile-page-signature");
        await page.waitForSelector(NAV_LINK);
        assert.equal(await exists(page, HINT), false, "not on the profile");

        await go(listing);
        await page.waitForSelector(HINT);
        const before = await saved(page);
        assert.equal(before.forYouHintSeen, false);
        if (finish === "dismiss") {
          // Reached backwards from the launcher: dismiss button, then the link.
          await page.focus(LAUNCHER);
          await page.keyboard.down("Shift");
          await page.keyboard.press("Tab");
          assert.equal(
            await page.evaluate(() =>
              document.activeElement.getAttribute("aria-label"),
            ),
            text.dismiss,
          );
          await page.keyboard.press("Tab");
          await page.keyboard.up("Shift");
          assert.equal(
            await page.evaluate(() =>
              document.activeElement.getAttribute("href"),
            ),
            `/${locale}/for-you`,
          );
          await page.keyboard.press("Escape");
          await page.waitForSelector(HINT, { hidden: true });
          assert.equal(
            await page.evaluate(
              (launcher) => document.activeElement.matches(launcher),
              LAUNCHER,
            ),
            true,
            "focus continues from the launcher",
          );
        } else {
          await page.click(finish === "follow" ? `${HINT} a` : LAUNCHER);
          await page.waitForFunction(
            (path) => location.pathname === path && location.hash === "",
            {},
            finish === "follow" ? `/${locale}/for-you` : `/${locale}/profile`,
          );
          await page.waitForSelector(
            finish === "follow"
              ? '[data-for-you-state="ready"]'
              : ".profile-page-signature",
          );
          if (finish === "follow") {
            assert.equal(
              await page.$eval(NAV_LINK, (el) =>
                el.getAttribute("aria-current"),
              ),
              "page",
              "the header link marks the page it leads to",
            );
            await page.waitForSelector(LAUNCHER);
            assert.equal(
              await exists(page, DOCK_LINK),
              false,
              "no link to the page it is on",
            );
          }
        }
        const after = await saved(page);
        assert.equal(after.forYouHintSeen, true);
        assert.equal(after.orientation, before.orientation);
        // The page the hint leads to reports the suggestions it displays; the hint adds nothing.
        const added = after.profile.signals.slice(
          before.profile.signals.length,
        );
        assert.deepEqual(
          added.filter((signal) => signal.kind !== "recommendation_shown"),
          [],
        );
        if (finish === "dismiss") assert.deepEqual(added, []);
        assert.equal(after.interactions, before.interactions + added.length);

        await go(listing);
        await page.waitForSelector(NAV_LINK);
        await page.waitForSelector(LAUNCHER);
        assert.equal(await exists(page, HINT), false, "the hint stays away");
        assert.deepEqual(errors, []);
      } finally {
        await browser.close();
      }
    },
  );
