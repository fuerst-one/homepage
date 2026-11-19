import assert from "node:assert/strict";
import { test } from "node:test";
import puppeteer from "puppeteer";
const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6895",
  key = "fuerst-one:visitor-profile:v1";
const state = (page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "null"), key);
async function activate(page, text, keyboard = false) {
  const buttons = await page.$$("button");
  for (const button of buttons)
    if ((await button.evaluate((el) => el.textContent.trim())) === text) {
      await button.scrollIntoView();
      if (keyboard) {
        await button.focus();
        await page.keyboard.press("Enter");
      } else await button.click();
      return;
    }
  throw Error(`Missing button: ${text}`);
}
test(
  "a deliberate activation seeds one remembered angle after opt-in, including keyboard and reset",
  { timeout: 120000 },
  async () => {
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1360, height: 900 });
      await page.goto(base + "/en/profile", { waitUntil: "networkidle2" });
      await page.waitForFunction(
        () =>
          document.querySelector(".profile-summary-actions button")
            ?.disabled === false,
      );
      await activate(page, "Start my live profile");
      assert.equal((await state(page)).orientation, null);
      await page.mouse.move(1200, 100);
      await page.keyboard.press("a");
      assert.equal((await state(page)).orientation, null);
      // Actual pointer activation at the right side of the viewport, without navigation.
      await page.evaluate(() => {
        const b = document.createElement("button");
        b.id = "orientation-action";
        b.textContent = "Explore";
        b.style.cssText = "position:fixed;right:40px;top:440px;z-index:99999";
        document.body.append(b);
      });
      await page.click("#orientation-action");
      assert.equal((await state(page)).orientation, 0);
      assert.equal(
        await page.$eval(
          "[data-profile-grid]",
          (el) => el.dataset.gridOrientation,
        ),
        "0",
      );
      await page.reload({ waitUntil: "networkidle2" });
      await page.waitForSelector("[data-profile-grid]");
      assert.equal((await state(page)).orientation, 0);
      await activate(page, "Reset interests");
      assert.equal((await state(page)).orientation, null);
      await page.evaluate(() => {
        const b = document.createElement("button");
        b.id = "keyboard-action";
        b.textContent = "Explore";
        b.style.cssText = "position:fixed;left:50%;top:30px;z-index:99999";
        document.body.append(b);
      });
      await page.focus("#keyboard-action");
      await page.keyboard.press("Enter");
      assert.equal((await state(page)).orientation, 270);
      await page.click("#keyboard-action");
      assert.equal((await state(page)).orientation, 270);
      await activate(page, "Stop & clear profile");
      assert.equal(await state(page), null);
    } finally {
      await browser.close();
    }
  },
);

async function priorityProfile() {
  const catalog = await fetch(base + "/api/profile/catalog").then((r) =>
    r.json(),
  );
  const preferences = {};
  for (const name of [
    "Add AI capabilities",
    "Frontend-Development",
    "User Research",
    "Launch a new product",
  ]) {
    const term = catalog.terms.find((t) => t.value === name);
    assert.ok(term, `Missing ${name}`);
    preferences[term.id] = "priority";
  }
  const expected = Object.fromEntries(
    catalog.terms.map((t) => [t.id, preferences[t.id] ? 127 : 0]),
  );
  return { catalog, preferences, expected };
}
async function seedProfile(page, preferences, interactions = 0) {
  await page.goto(base + "/en/profile", { waitUntil: "networkidle2" });
  const now = Date.now();
  await page.evaluate(
    (key, profile) => localStorage.setItem(key, JSON.stringify(profile)),
    key,
    {
      version: 1,
      profile: {
        version: 1,
        startedAt: now,
        updatedAt: now,
        signals: [],
        preferences,
      },
      orientation: 135,
      interactions,
      sharing: false,
      token: "",
      consentAt: 0,
      pending: [],
    },
  );
}
async function profileCodec() {
  const { loadTs } = await import("./helpers/load-ts.mjs");
  return loadTs(
    new URL("../packages/content/src/profilePixels.ts", import.meta.url),
  );
}
/** The frame the codec paints for the scores and count a picture carries. */
function restingProfileFrame(codec, catalog, pixels) {
  const scores = codec.decodeProfilePixels(pixels, catalog.terms);
  return codec.encodeProfilePixels(
    catalog.terms,
    catalog.terms.map((t) => ({ id: t.id, score: (scores[t.id] * 12) / 127 })),
    135,
    codec.decodeProfileInteractions(pixels, catalog.terms),
  ).pixels;
}
/** Waits until the signature has not changed for 400 ms. */
const signatureAtRest = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        const read = () =>
          [...document.querySelectorAll("[data-profile-grid] rect")]
            .map((rect) => rect.getAttribute("fill"))
            .join();
        let last = read(),
          since = performance.now();
        const check = () => {
          const fills = read();
          if (fills !== last) {
            last = fills;
            since = performance.now();
          }
          if (performance.now() - since >= 400) resolve();
          else requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      }),
  );

test(
  "each interaction plays one short step and the signature rests on the same frame after a reload",
  { timeout: 120000 },
  async () => {
    const codec = await profileCodec();
    const { catalog, preferences, expected } = await priorityProfile();
    const restingFrame = (pixels) =>
      restingProfileFrame(codec, catalog, pixels);
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1360, height: 900 });
      await seedProfile(page, preferences, 7);
      const open = async () => {
        await page.goto(base + "/en/profile", { waitUntil: "networkidle2" });
        await page.waitForSelector("[data-profile-grid]");
        await signatureAtRest(page);
      };
      const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const frame = () =>
        page.$eval("[data-profile-grid]", (grid) =>
          [...grid.querySelectorAll("rect")].map((rect) =>
            parseInt(rect.getAttribute("fill").slice(1), 16),
          ),
        );
      const count = () =>
        page.$eval("[data-profile-grid]", (grid) =>
          Number(grid.dataset.gridInteractions),
        );
      // Collects every distinct frame painted while one preference changes.
      const framesDuring = async (value) => {
        await page.evaluate(() => {
          const grid = document.querySelector("[data-profile-grid]");
          const read = () =>
            [...grid.querySelectorAll("rect")]
              .map((rect) => rect.getAttribute("fill"))
              .join();
          window.profileFrames = [{ at: performance.now(), fills: read() }];
          const sample = () => {
            const fills = read();
            if (fills !== window.profileFrames.at(-1).fills)
              window.profileFrames.push({ at: performance.now(), fills });
            window.profileSampler = requestAnimationFrame(sample);
          };
          window.profileSampler = requestAnimationFrame(sample);
        });
        await page.select('select[aria-label^="Preference for"]', value);
        await pause(1500);
        return page.evaluate(() => {
          cancelAnimationFrame(window.profileSampler);
          return window.profileFrames.map(({ at, fills }) => ({
            at,
            pixels: fills.split(",").map((fill) => parseInt(fill.slice(1), 16)),
          }));
        });
      };

      await open();
      assert.equal(await count(), 7);
      const loaded = await frame();
      assert.deepEqual(
        codec.decodeProfilePixels(loaded, catalog.terms),
        expected,
      );
      assert.equal(codec.decodeProfileInteractions(loaded, catalog.terms), 7);
      assert.deepEqual(loaded, restingFrame(loaded));
      await pause(1200);
      assert.deepEqual(
        await frame(),
        loaded,
        "the signature rests without an interaction",
      );

      const step = await framesDuring("interested");
      assert.equal(await count(), 8);
      assert.deepEqual(step[0].pixels, loaded);
      const settled = step.at(-1).pixels;
      assert.equal(codec.decodeProfileInteractions(settled, catalog.terms), 8);
      assert.deepEqual(settled, restingFrame(settled));
      assert.ok(step.length > 2, `${step.length} frames: the step is animated`);
      const duration = step.at(-1).at - step[1].at;
      assert.ok(duration < 600, `the step took ${Math.round(duration)}ms`);
      for (const { pixels } of step.slice(1))
        assert.equal(codec.decodeProfileInteractions(pixels, catalog.terms), 8);

      await open();
      assert.deepEqual(await frame(), settled, "a reload shows the same frame");

      await page.emulateMediaFeatures([
        { name: "prefers-reduced-motion", value: "reduce" },
      ]);
      await open();
      const jump = await framesDuring("exclude");
      assert.equal(await count(), 9);
      assert.equal(
        jump.length,
        2,
        "reduced motion skips the in-between frames",
      );
      assert.deepEqual(jump[1].pixels, restingFrame(jump[1].pixels));
    } finally {
      await browser.close();
    }
  },
);

test(
  "the copy button puts a text code on the clipboard that says what the picture says",
  { timeout: 120000 },
  async () => {
    const { loadTs } = await import("./helpers/load-ts.mjs");
    const codec = loadTs(
      new URL("../packages/content/src/profilePixels.ts", import.meta.url),
    );
    const { catalog, preferences, expected } = await priorityProfile();
    const browser = await puppeteer.launch({ headless: true });
    try {
      await browser
        .defaultBrowserContext()
        .overridePermissions(new URL(base).origin, [
          "clipboard-read",
          "clipboard-sanitized-write",
        ]);
      const page = await browser.newPage();
      await page.setViewport({ width: 1360, height: 900 });
      await seedProfile(page, preferences, 7);
      await page.goto(base + "/en/profile", { waitUntil: "networkidle2" });
      await page.waitForSelector("[data-profile-grid]");
      await page.bringToFront();
      const button = await page.waitForSelector("[data-profile-copy-code]");
      assert.equal(
        await button.evaluate((el) => el.textContent.trim()),
        "Copy profile code",
      );
      const stats = await page.$eval(".profile-summary-actions", (el) =>
        el.textContent.replace(/\s+/g, " "),
      );
      assert.match(stats, /Copy profile code.*active interests/);
      await button.click();
      await page.waitForFunction(
        () =>
          document
            .querySelector("[data-profile-copy-code]")
            .textContent.trim() === "Copied",
      );
      // A second copy restarts the two seconds the label stays up.
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await button.click();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      assert.equal(
        await button.evaluate((el) => el.textContent.trim()),
        "Copied",
      );
      const text = await page.evaluate(() => navigator.clipboard.readText());
      assert.deepEqual(codec.decodeProfileText(text, catalog.terms), {
        scores: expected,
        interactions: 7,
      });
      const pixels = await page.$eval("[data-profile-grid]", (grid) =>
        [...grid.querySelectorAll("rect")].map((rect) =>
          parseInt(rect.getAttribute("fill").slice(1), 16),
        ),
      );
      assert.deepEqual(codec.decodeProfileText(text, catalog.terms).scores, {
        ...codec.decodeProfilePixels(pixels, catalog.terms),
      });
    } finally {
      await browser.close();
    }
  },
);

test(
  "actual 192px and 60px SVG screenshots preserve every profile score",
  { timeout: 120000 },
  async () => {
    const { loadTs } = await import("./helpers/load-ts.mjs");
    const codec = loadTs(
      new URL("../packages/content/src/profilePixels.ts", import.meta.url),
    );
    const { catalog, preferences, expected } = await priorityProfile();
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1360, height: 900 });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await seedProfile(page, preferences);
      const verify = async (path, width) => {
        await page.goto(base + path, { waitUntil: "networkidle2" });
        await page.waitForSelector("[data-profile-grid]");
        const grid = await page.$("[data-profile-grid]");
        await grid.evaluate((el) =>
          el.scrollIntoView({ block: "center", behavior: "instant" }),
        );
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
        );
        const bounds = await grid.boundingBox();
        assert.equal(bounds.width, width);
        const size = await grid.evaluate((el) => Number(el.dataset.gridSize));
        const shot = await page.screenshot({
          path: process.env.PROFILE_SCREENSHOT_DIR
            ? `${process.env.PROFILE_SCREENSHOT_DIR}/${path.startsWith("/de") ? "mobile" : "desktop"}-${width}.png`
            : undefined,
        });
        const pixels = await page.evaluate(
          async (base64, bounds, size) => {
            const image = new Image();
            image.src = "data:image/png;base64," + base64;
            await image.decode();
            const canvas = document.createElement("canvas");
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(image, 0, 0);
            return Array.from({ length: size * size }, (_, at) => {
              const x = Math.floor(
                  bounds.x + (((at % size) + 0.5) * bounds.width) / size,
                ),
                y = Math.floor(
                  bounds.y +
                    ((Math.floor(at / size) + 0.5) * bounds.height) / size,
                );
              const c = ctx.getImageData(x, y, 1, 1).data;
              return (c[0] << 16) | (c[1] << 8) | c[2];
            });
          },
          Buffer.from(shot).toString("base64"),
          bounds,
          size,
        );
        assert.deepEqual(
          codec.decodeProfilePixels(pixels, catalog.terms),
          expected,
        );
        assert.equal(
          await grid.evaluate((el) => el.dataset.gridOrientation),
          "135",
        );
      };
      await verify("/en/profile", 192);
      await verify("/en/projects?all=1", 60);
      await page.setViewport({ width: 390, height: 844 });
      await verify("/de/profile", 192);
      await verify("/de/projects?all=1", 60);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  },
);

/** Samples what the profile page shows on every animation frame of the next load. */
async function recordFrames(page) {
  await page.evaluateOnNewDocument(() => {
    const frames = (window.profileFrames = []);
    const visible = (el) => !!el && el.getClientRects().length > 0;
    const sample = () => {
      const root = document.querySelector(".profile-page");
      // Streamed HTML sits in a hidden container until it is moved into place.
      if (visible(root))
        frames.push({
          idle: visible(root.querySelector(".profile-page-off")),
          loading: visible(root.querySelector(".profile-signature-loading")),
          grid: visible(root.querySelector("[data-profile-grid]")),
          summaries: [...root.querySelectorAll(".profile-summary")].filter(
            visible,
          ).length,
          navTop: Math.round(
            root.querySelector(".profile-page-nav").getBoundingClientRect().top,
          ),
          emptyInterests: visible(
            root.querySelector("#interests .profile-empty"),
          ),
        });
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}
test(
  "a saved profile shows a loading state from the first frame and the summary keeps its place",
  { timeout: 120000 },
  async () => {
    const { preferences } = await priorityProfile();
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1360, height: 900 });
      await seedProfile(page, preferences, 3);
      await recordFrames(page);
      await page.reload({ waitUntil: "networkidle2" });
      await page.waitForSelector("[data-profile-grid]");
      await page.evaluate(
        () => new Promise((done) => requestAnimationFrame(() => done())),
      );
      const frames = await page.evaluate(() => window.profileFrames);
      assert.ok(frames.length > 2);
      assert.equal(frames[0].loading, true);
      assert.equal(frames.at(-1).grid, true);
      assert.equal(frames.at(-1).loading, false);
      assert.deepEqual(
        frames.filter((f) => f.idle || f.emptyInterests || f.summaries !== 1),
        [],
      );
      assert.deepEqual([...new Set(frames.map((f) => f.navTop))].length, 1);
      assert.equal(
        await page.$eval(".profile-page", (el) =>
          el.hasAttribute("data-profile-loading"),
        ),
        false,
      );
    } finally {
      await browser.close();
    }
  },
);
test(
  "without a saved profile the page shows the start state at once and never a loading state",
  { timeout: 120000 },
  async () => {
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1360, height: 900 });
      await recordFrames(page);
      await page.goto(base + "/en/profile", { waitUntil: "networkidle2" });
      await page.waitForFunction(
        () =>
          document.querySelector(".profile-summary-actions button")
            ?.disabled === false,
      );
      const frames = await page.evaluate(() => window.profileFrames);
      assert.ok(frames.length > 2);
      assert.deepEqual(
        frames.filter((f) => !f.idle || f.loading || f.summaries !== 1),
        [],
      );
      assert.deepEqual([...new Set(frames.map((f) => f.navTop))].length, 1);
    } finally {
      await browser.close();
    }
  },
);

test(
  "beside an open project dialog the launcher stays in view; where it does not fit it stays behind",
  { timeout: 180000 },
  async () => {
    const { catalog, preferences } = await priorityProfile();
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1360, height: 900 });
      await seedProfile(page, preferences, 3);
      const openDialog = async (width, height) => {
        await page.setViewport({ width, height });
        await page.goto(
          `${base}/en/projects?all=1&focus=${encodeURIComponent(catalog.projects[0].id)}`,
          { waitUntil: "networkidle2" },
        );
        await page.waitForSelector('[role="dialog"][data-state="open"]');
        await page.waitForSelector(".profile-pixel-launcher");
        await page.waitForFunction(() =>
          document
            .querySelector('[role="dialog"]')
            .getAnimations()
            .every((animation) => animation.playState === "finished"),
        );
        return page.evaluate(() => {
          const launcher = document.querySelector(".profile-pixel-launcher");
          const dialog = document.querySelector('[role="dialog"]');
          const a = launcher.getBoundingClientRect(),
            b = dialog.getBoundingClientRect();
          // The page is inert under a dialog, so the hit test that reads the
          // paint order needs pointer events switched on for the launcher.
          launcher.style.pointerEvents = "auto";
          const top = document.elementFromPoint(
            a.left + a.width / 2,
            a.top + a.height / 2,
          );
          launcher.style.pointerEvents = "";
          return {
            paintedOnTop: launcher.contains(top),
            overlapsDialog:
              a.left < b.right &&
              b.left < a.right &&
              a.top < b.bottom &&
              b.top < a.bottom,
          };
        });
      };
      assert.deepEqual(await openDialog(1360, 900), {
        paintedOnTop: true,
        overlapsDialog: false,
      });
      // Under an open dialog a click on the launcher is a click on the backdrop.
      await page.click(".profile-pixel-launcher");
      await page.waitForSelector('[role="dialog"]', { hidden: true });
      assert.equal(
        await page.evaluate(() => location.pathname),
        "/en/projects",
      );
      await page.click(".profile-pixel-launcher");
      await page.waitForFunction(() => location.pathname === "/en/profile");
      assert.equal((await openDialog(1100, 900)).paintedOnTop, false);
      assert.equal((await openDialog(390, 800)).paintedOnTop, false);
    } finally {
      await browser.close();
    }
  },
);

/** Records every distinct picture the given signature paints from the next load on. */
async function recordSignature(page, selector) {
  await page.evaluateOnNewDocument((selector) => {
    const frames = (window.signatureFrames = []);
    const sample = () => {
      const fills = [...document.querySelectorAll(`${selector} rect`)]
        .map((rect) => rect.getAttribute("fill"))
        .join();
      if (fills && fills !== frames.at(-1)?.fills)
        frames.push({ at: performance.now(), fills });
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }, selector);
}
const recordedSignature = (page) =>
  page.evaluate(() =>
    window.signatureFrames.map(({ at, fills }) => ({
      at,
      pixels: fills.split(",").map((fill) => parseInt(fill.slice(1), 16)),
    })),
  );
test(
  "a saved profile restored on the profile page runs in and comes to rest on the counted frame; arriving by navigation does not",
  { timeout: 180000 },
  async () => {
    const codec = await profileCodec();
    const { catalog, preferences, expected } = await priorityProfile();
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1360, height: 900 });
      await seedProfile(page, preferences, 7);
      await recordSignature(page, ".profile-page [data-profile-grid]");
      await page.reload({ waitUntil: "networkidle2" });
      await page.waitForSelector("[data-profile-grid]");
      await signatureAtRest(page);
      const runIn = await recordedSignature(page);
      assert.ok(runIn.length >= 5, `${runIn.length} frames: it is animated`);
      const rest = runIn.at(-1).pixels;
      assert.deepEqual(rest, restingProfileFrame(codec, catalog, rest));
      assert.notDeepEqual(runIn[0].pixels, rest);
      const duration = runIn.at(-1).at - runIn[0].at;
      assert.ok(
        duration > 400 && duration < 1000,
        `the run-in took ${Math.round(duration)}ms`,
      );
      for (const { pixels } of runIn) {
        assert.deepEqual(
          codec.decodeProfilePixels(pixels, catalog.terms),
          expected,
        );
        assert.equal(codec.decodeProfileInteractions(pixels, catalog.terms), 7);
      }

      // Arriving from another page, the profile is already there: no run-in.
      await page.goto(base + "/en/projects", { waitUntil: "networkidle2" });
      await page.waitForSelector(".profile-pixel-launcher");
      await page.click(".profile-pixel-launcher");
      await page.waitForSelector(".profile-page [data-profile-grid]");
      await signatureAtRest(page);
      const navigated = await recordedSignature(page);
      assert.equal(navigated.length, 1, "navigation shows the resting frame");
      assert.deepEqual(navigated[0].pixels, rest);

      await page.emulateMediaFeatures([
        { name: "prefers-reduced-motion", value: "reduce" },
      ]);
      await page.goto(base + "/en/profile", { waitUntil: "networkidle2" });
      await page.waitForSelector("[data-profile-grid]");
      await signatureAtRest(page);
      const still = await recordedSignature(page);
      assert.equal(still.length, 1, "reduced motion shows the resting frame");
      assert.deepEqual(still[0].pixels, rest);
    } finally {
      await browser.close();
    }
  },
);
test(
  "the launcher shows a saved profile at rest without a run-in",
  { timeout: 120000 },
  async () => {
    const { preferences } = await priorityProfile();
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1360, height: 900 });
      await seedProfile(page, preferences, 7);
      await recordSignature(
        page,
        ".profile-pixel-launcher [data-profile-grid]",
      );
      await page.goto(base + "/en/projects", { waitUntil: "networkidle2" });
      await page.waitForSelector(".profile-pixel-launcher [data-profile-grid]");
      await signatureAtRest(page);
      assert.equal((await recordedSignature(page)).length, 1);
    } finally {
      await browser.close();
    }
  },
);
