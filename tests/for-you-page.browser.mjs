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
