import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import puppeteer from "puppeteer";

const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6895";
const folder = new URL(
  "../packages/content/src/data/for-you-plans/",
  import.meta.url,
);
const examples = readdirSync(folder)
  .filter((file) => file.endsWith(".json"))
  .map((file) => ({
    name: file.replace(/\.json$/, ""),
    ...JSON.parse(readFileSync(new URL(file, folder), "utf8")),
  }));

let browser;
let catalog;
before(async () => {
  browser = await puppeteer.launch({ headless: true });
  catalog = await fetch(`${base}/api/profile/catalog`).then((r) => r.json());
});
after(() => browser?.close());

async function open(path, { width = 1360, reducedMotion = true } = {}) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewport({ width, height: 900 });
  await page.emulateMediaFeatures([
    {
      name: "prefers-reduced-motion",
      value: reducedMotion ? "reduce" : "no-preference",
    },
  ]);
  const response = await page.goto(`${base}${path}`, {
    waitUntil: "networkidle0",
    timeout: 120_000,
  });
  assert.equal(response.status(), 200, path);
  await page.waitForSelector(".for-you-page");
  return { page, errors };
}

const projectHrefs = (locale) =>
  new Set(
    catalog.projects.flatMap((project) => [
      project.href,
      project.href.replace(/^\/en\//, `/${locale}/`),
    ]),
  );
/** Every target a For you page may link to, in the plan's language. */
function allowedTarget(href, locale) {
  const url = new URL(href, base);
  if (url.protocol === "mailto:")
    return url.pathname === "alexander@fuerst.one";
  if (url.origin !== new URL(base).origin) return false;
  const path = url.pathname;
  return (
    projectHrefs(locale).has(path) ||
    path === `/${locale}/contact` ||
    path === `/${locale}/hire` ||
    path === `/${locale}/explorer` ||
    path === `/${locale}/profile` ||
    (path === `/${locale}/projects` && url.searchParams.has("buyerNeeds")) ||
    /^\/(en|de)\/services\/(product-interfaces\/review|ai-automation\/assessment)$/.test(
      path,
    )
  );
}

test("the review examples together show every section type", () => {
  const types = new Set(
    examples.flatMap((example) =>
      example.plan.sections.map((section) => section.type),
    ),
  );
  assert.deepEqual([...types].sort(), [
    "approach",
    "bridge",
    "closing",
    "hero",
    "offer",
    "proofGrid",
    "questions",
    "secondNeed",
    "spotlight",
  ]);
});

for (const example of examples) {
  const locale = example.plan.locale;
  const expected = example.plan.sections.map((section) => section.type);

  for (const width of [1360, 375])
    test(`${example.name} at ${width}px renders the plan in order with allowed links`, async () => {
      const { page, errors } = await open(
        `/${locale}/for-you?example=${example.name}`,
        { width },
      );
      const state = await page.evaluate(() => {
        const article = document.querySelector(".for-you-page");
        return {
          sections: [...article.querySelectorAll("[data-for-you-section]")].map(
            (el) => el.dataset.forYouSection,
          ),
          lang: article.lang,
          links: [...article.querySelectorAll("a[href]")].map((a) => ({
            href: a.getAttribute("href"),
            name: a.textContent.trim(),
            project: a.hasAttribute("data-for-you-project"),
            profileUi: !!a.closest("[data-profile-ui]"),
          })),
          dropped: [...document.querySelectorAll("[data-for-you-dropped]")].map(
            (el) => el.dataset.forYouDropped,
          ),
          overflow: document.documentElement.scrollWidth - innerWidth,
          robots: document.querySelector('meta[name="robots"]')?.content,
          h1: document.querySelectorAll("h1").length,
        };
      });
      assert.deepEqual(state.sections, expected);
      assert.deepEqual(state.dropped, [], "every example section is valid");
      assert.equal(state.lang, locale);
      assert.equal(state.h1, 1);
      assert.ok(state.links.length > 0);
      for (const link of state.links) {
        assert.ok(allowedTarget(link.href, locale), link.href);
        assert.ok(link.name, `${link.href} has a name`);
        assert.ok(link.profileUi, `${link.href} credits no interest points`);
      }
      assert.ok(state.links.some((link) => link.project));
      assert.equal(state.overflow, 0);
      assert.match(state.robots, /noindex/);
      assert.deepEqual(errors, []);
      await page.close();
    });

  test(`${example.name}: every link target answers`, async () => {
    const { page } = await open(`/${locale}/for-you?example=${example.name}`);
    const hrefs = await page.$$eval(".for-you-page a[href^='/']", (links) => [
      ...new Set(links.map((a) => a.getAttribute("href"))),
    ]);
    await page.close();
    for (const href of hrefs) {
      const response = await fetch(`${base}${href}`, { redirect: "follow" });
      assert.equal(response.status, 200, href);
    }
  });
}

test("both language routes render an example in the plan's language", async () => {
  const example = examples.find((entry) => entry.plan.locale === "de");
  for (const route of ["en", "de"]) {
    const { page } = await open(`/${route}/for-you?example=${example.name}`);
    assert.equal(await page.$eval(".for-you-page", (el) => el.lang), "de");
    assert.equal(
      await page.$eval("html", (el) => el.lang),
      route,
      "the site around the page keeps the route's language",
    );
    await page.close();
  }
});

test("an unknown example falls back to the first one", async () => {
  const { page } = await open("/en/for-you?example=missing");
  assert.equal(
    await page.$eval("[data-for-you-review] [aria-current=page]", (el) =>
      el.getAttribute("href"),
    ),
    "/en/for-you?example=complex-interface",
  );
  await page.close();
});

test("mid-stream, the received sections show and a placeholder marks the next", async () => {
  const { page } = await open("/en/for-you?example=ai-minimal&shown=2");
  const state = await page.evaluate(() => ({
    sections: [...document.querySelectorAll("[data-for-you-section]")].map(
      (el) => el.dataset.forYouSection,
    ),
    busy: document.querySelector(".for-you-page").getAttribute("aria-busy"),
    placeholder: !!document.querySelector(
      '.for-you-placeholder[role="status"]',
    ),
  }));
  assert.deepEqual(state, {
    sections: ["hero", "proofGrid"],
    busy: "true",
    placeholder: true,
  });
  await page.close();
});

test("sections enter with motion unless reduced motion is asked for", async () => {
  const animation = async (reducedMotion) => {
    const { page } = await open("/en/for-you?example=ai-minimal", {
      reducedMotion,
    });
    const name = await page.$eval(
      ".for-you-section",
      (el) => getComputedStyle(el).animationName,
    );
    await page.close();
    return name;
  };
  assert.equal(await animation(false), "for-you-enter");
  assert.equal(await animation(true), "none");
});

test("the page is absent from the sitemap", async () => {
  const sitemap = await fetch(`${base}/sitemap.xml`).then((r) => r.text());
  assert.ok(sitemap.includes("<urlset"));
  assert.equal(sitemap.includes("for-you"), false);
});

// The real page: three states, decided in the browser from the saved profile.
const PROFILE_KEY = "fuerst-one:visitor-profile:v1";
const LEAD = {
  en: "Automate repetitive work",
  de: "Wiederkehrende Arbeit automatisieren",
};
const READY_SIGNALS = [
  ["topic_selected", "buyerNeeds:Automate repetitive work"],
  ["explorer_term_selected", "buyerNeeds:Make data actionable"],
];
const NOT_READY_SIGNALS = [
  ["explorer_term_selected", "buyerNeeds:Make data actionable"],
];
function savedProfile(signals, { unlocked, hintSeen = true }) {
  const now = Date.now();
  const at = now - 60_000;
  return {
    version: 1,
    profile: {
      version: 1,
      startedAt: now - 600_000,
      updatedAt: at + signals.length,
      signals: signals.map(([kind, subject], index) => ({
        id: crypto.randomUUID(),
        kind,
        subject,
        at: at + index,
      })),
      preferences: {},
    },
    orientation: null,
    interactions: signals.length,
    forYouHintSeen: hintSeen,
    forYouUnlocked: unlocked,
    token: "",
    sharing: false,
    consentAt: now - 600_000,
    pending: [],
  };
}
const STATE = (name) => `[data-for-you-state="${name}"]`;

/** Seeds the profile once per tab and watches every frame for the no-profile state. */
async function openReal(path, { width = 1360, saved = null } = {}) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewport({ width, height: 900 });
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "reduce" },
  ]);
  await page.evaluateOnNewDocument(
    (key, value) => {
      if (!sessionStorage.getItem("for-you-seeded")) {
        if (value) localStorage.setItem(key, value);
        else localStorage.removeItem(key);
        sessionStorage.setItem("for-you-seeded", "1");
      }
      window.__noProfileShown = false;
      const watch = () => {
        const none = document.querySelector('[data-for-you-state="none"]');
        if (none?.getClientRects().length) window.__noProfileShown = true;
        requestAnimationFrame(watch);
      };
      requestAnimationFrame(watch);
    },
    PROFILE_KEY,
    saved && JSON.stringify(saved),
  );
  const response = await page.goto(`${base}${path}`, {
    waitUntil: "networkidle0",
    timeout: 120_000,
  });
  assert.equal(response.status(), 200, path);
  return { page, errors };
}
const visible = (page, selector) =>
  page.waitForSelector(selector, { visible: true, timeout: 30_000 });
const pageLinks = (page, selector) =>
  page.$$eval(`${selector} a[href]`, (links) =>
    links.map((a) => a.getAttribute("href")),
  );
const layout = (page) =>
  page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    h1: [...document.querySelectorAll("h1")].filter(
      (h) => h.getClientRects().length,
    ).length,
    robots: document.querySelector('meta[name="robots"]')?.content,
  }));
const savedSignals = (page) =>
  page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) || "null")?.profile.signals,
    PROFILE_KEY,
  );

for (const locale of ["en", "de"])
  for (const width of [1360, 375]) {
    test(`${locale} at ${width}px without a profile: what For you is and where to start`, async () => {
      const { page, errors } = await openReal(`/${locale}/for-you`, { width });
      await visible(page, STATE("none"));
      const links = await pageLinks(page, STATE("none"));
      assert.ok(links.includes(`/${locale}/profile`), links.join());
      assert.ok(links.includes(`/${locale}/projects`), links.join());
      assert.equal(
        await page.$$eval(STATE("loading"), (els) =>
          els.some((el) => el.getClientRects().length),
        ),
        false,
        "no loading state without a saved profile",
      );
      assert.deepEqual(await layout(page), {
        overflow: 0,
        h1: 1,
        robots: "noindex, nofollow",
      });
      assert.deepEqual(errors, []);
      await page.close();
    });

    test(`${locale} at ${width}px with a profile that is not ready: no scores, a way on`, async () => {
      const { page, errors } = await openReal(`/${locale}/for-you`, {
        width,
        saved: savedProfile(NOT_READY_SIGNALS, { unlocked: false }),
      });
      await visible(page, STATE("notReady"));
      const links = await pageLinks(page, STATE("notReady"));
      assert.ok(links.includes(`/${locale}/projects`), links.join());
      assert.ok(links.includes(`/${locale}/explorer`), links.join());
      const text = await page.$eval(STATE("notReady"), (el) => el.innerText);
      assert.doesNotMatch(text, /\d/, "no scores or counts");
      assert.equal(await page.evaluate(() => window.__noProfileShown), false);
      assert.equal((await layout(page)).overflow, 0);
      assert.deepEqual(errors, []);
      await page.close();
    });

    test(`${locale} at ${width}px with a ready profile: the preview, without a flash of the start state`, async () => {
      const { page, errors } = await openReal(`/${locale}/for-you`, {
        width,
        saved: savedProfile(READY_SIGNALS, { unlocked: true }),
      });
      await visible(page, `${STATE("ready")} [data-for-you-section="hero"]`);
      assert.equal(await page.evaluate(() => window.__noProfileShown), false);
      const state = await page.evaluate(() => ({
        sections: [...document.querySelectorAll("[data-for-you-section]")].map(
          (el) => el.dataset.forYouSection,
        ),
        headline: document.querySelector("h1").textContent,
        lang: document.querySelector(".for-you-page").lang,
        proofImages: [
          ...document.querySelectorAll('[data-for-you-section="proofGrid"] li'),
        ].map((card) => !!card.querySelector("img")),
        links: [...document.querySelectorAll(".for-you-page a[href]")].map(
          (a) => ({
            href: a.getAttribute("href"),
            profileUi: !!a.closest("[data-profile-ui]"),
          }),
        ),
      }));
      assert.equal(state.sections[0], "hero");
      assert.equal(state.sections.at(-1), "closing");
      assert.ok(state.sections.includes("proofGrid"));
      assert.match(state.headline, new RegExp(LEAD[locale]));
      assert.equal(state.lang, locale);
      assert.ok(state.proofImages.length >= 2);
      assert.ok(
        state.proofImages.every(Boolean),
        "every proof card has a screenshot",
      );
      for (const link of state.links) {
        assert.ok(allowedTarget(link.href, locale), link.href);
        assert.ok(link.profileUi, link.href);
      }
      assert.deepEqual(await layout(page), {
        overflow: 0,
        h1: 1,
        robots: "noindex, nofollow",
      });
      assert.deepEqual(errors, []);
      await page.close();
    });
  }

test("a project opened from the preview is recorded and leaves the proof grid", async () => {
  const { page } = await openReal("/en/for-you", {
    saved: savedProfile(READY_SIGNALS, { unlocked: true }),
  });
  const card = '[data-for-you-section="proofGrid"] [data-for-you-project]';
  await visible(page, card);
  const id = await page.$eval(card, (el) => el.dataset.forYouProject);
  await page.$eval(card, (el) => el.scrollIntoView({ block: "center" }));
  await page.waitForFunction(
    (key, id) =>
      JSON.parse(localStorage.getItem(key)).profile.signals.some(
        (s) => s.kind === "recommendation_shown" && s.subject === id,
      ),
    {},
    PROFILE_KEY,
    id,
  );
  await Promise.all([page.waitForNavigation(), page.click(card)]);
  assert.notEqual(new URL(page.url()).pathname, "/en/for-you");
  const signals = await savedSignals(page);
  assert.ok(
    signals.some((s) => s.kind === "recommendation_opened" && s.subject === id),
  );
  await page.goto(`${base}/en/for-you`, { waitUntil: "networkidle0" });
  await visible(page, card);
  const ids = await page.$$eval(card, (links) =>
    links.map((el) => el.dataset.forYouProject),
  );
  assert.equal(ids.includes(id), false);
  await page.close();
});

for (const locale of ["en", "de"])
  test(`${locale}: the header link and the ready hint lead to For you, where the hint stays away`, async () => {
    const { page } = await openReal(`/${locale}/projects?all=1`, {
      saved: savedProfile(READY_SIGNALS, { unlocked: true, hintSeen: false }),
    });
    const NAV_LINK = ".content-header-for-you";
    const HINT = ".profile-for-you-hint";
    await page.waitForSelector(NAV_LINK);
    await page.waitForSelector(HINT);
    assert.equal(
      await page.$eval(NAV_LINK, (el) => el.getAttribute("href")),
      `/${locale}/for-you`,
    );
    assert.equal(
      await page.$eval(`${HINT} a`, (el) => el.getAttribute("href")),
      `/${locale}/for-you`,
    );
    await page.goto(`${base}/${locale}/for-you`, { waitUntil: "networkidle0" });
    await visible(page, `${STATE("ready")} [data-for-you-section="hero"]`);
    await page.waitForSelector(NAV_LINK);
    assert.equal(await page.$(HINT), null, "no hint on the page it points to");
    await page.close();
  });
