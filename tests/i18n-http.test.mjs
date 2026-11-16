import assert from "node:assert/strict";
import { test } from "node:test";
const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";
const get = async (path) => {
  const response = await fetch(`${base}${path}`, { redirect: "manual" });
  return { response, body: await response.text() };
};
test("both locale homepages render their language, canonical and reciprocal alternatives", async () => {
  for (const locale of ["en", "de"]) {
    const { response, body } = await get(`/${locale}`);
    assert.equal(response.status, 200, `/${locale} must render`);
    assert.match(body, new RegExp(`<html[^>]*lang="${locale}"`));
    assert.ok(
      body.includes(`rel="canonical" href="https://fuerst.one/${locale}"`),
    );
    for (const language of ["en", "de"])
      assert.ok(
        body.includes(
          `hrefLang="${language}" href="https://fuerst.one/${language}"`,
        ),
      );
    assert.ok(body.includes(`href="/${locale}/contact"`));
    if (locale === "de") assert.match(body, /komplexe|Komplexe/);
  }
});
test("legacy URLs permanently redirect to the matching English page and preserve query filters", async () => {
  for (const [path, destination] of [
    ["/", "/en"],
    ["/cv?tools=React", "/en/projects?tools=React"],
    [
      "/en/cv?id=project-a&focus=project-a",
      "/en/projects?id=project-a&focus=project-a",
    ],
    ["/de/cv?all=1&tools=React", "/de/projects?all=1&tools=React"],
    ["/projects", "/en/projects"],
    ["/contact", "/en/contact"],
  ]) {
    const { response } = await get(path);
    assert.equal(response.status, 308);
    assert.equal(
      new URL(response.headers.get("location"), base).pathname +
        new URL(response.headers.get("location"), base).search,
      destination,
    );
  }
});
test("unsupported locales do not create indexable English copies", async () => {
  assert.equal((await get("/fr/cv")).response.status, 404);
});
test("localized projects pages expose the interactive portfolio at their canonical URLs", async () => {
  for (const locale of ["en", "de"]) {
    const { response, body } = await get(`/${locale}/projects`);
    assert.equal(response.status, 200);
    assert.ok(
      body.includes(
        `rel="canonical" href="https://fuerst.one/${locale}/projects"`,
      ),
    );
    for (const language of ["en", "de"])
      assert.ok(
        body.includes(
          `hrefLang="${language}" href="https://fuerst.one/${language}/projects"`,
        ),
      );
    assert.match(body, /<article\b/);
    assert.ok(body.includes(`href="/${locale}/projects"`));
    assert.ok(!body.includes(`href="/${locale}/cv"`));
  }
});
test("sitemap advertises only locale-prefixed public pages and both published languages", async () => {
  const { response, body } = await get("/sitemap.xml");
  assert.equal(response.status, 200);
  const urls = [...body.matchAll(/<loc>(.*?)<\/loc>/g)].map(
    (match) => match[1],
  );
  assert.ok(urls.includes("https://fuerst.one/en"));
  assert.ok(urls.includes("https://fuerst.one/de"));
  assert.ok(
    urls.every((url) => /^https:\/\/fuerst\.one\/(en|de)(\/|$)/.test(url)),
  );
  assert.ok(body.includes('hreflang="de"'));
  assert.ok(
    !urls.some((url) => /\/cv(?:$|[/?])|cv\.pdf|pdf-content/.test(url)),
  );
});

test("German API results retain their locale in detail links and do not expose translation drafts", async () => {
  const list = await fetch(`${base}/api/projects?locale=de`).then((response) =>
    response.json(),
  );
  assert.ok(list.results.length > 0);
  const url = new URL(list.results[0].url);
  assert.equal(url.searchParams.get("locale"), "de");
  const detail = await fetch(`${base}${url.pathname}${url.search}`).then(
    (response) => response.json(),
  );
  assert.equal(detail.contentLocale, "de");
  assert.ok(detail.webUrl.startsWith("https://fuerst.one/de/projects/"));
  assert.equal(detail.descriptionDe, undefined);
  assert.equal(detail.kpisDe, undefined);
  assert.equal(detail.germanReady, undefined);
});
