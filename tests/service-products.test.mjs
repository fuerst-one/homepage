import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";
const origin = "https://fuerst.one";
const products = [
  ["product-interfaces", "review"],
  ["ai-automation", "assessment"],
];
const get = (path) =>
  fetch(`${base}${path}`, {
    redirect: "manual",
    signal: AbortSignal.timeout(60000),
  });

test("starting offers have localized URLs and a product-specific enquiry brief", () => {
  const { serviceProductPath, serviceProductEmail, isServiceProduct } = loadTs(
    new URL("../apps/web/src/data/serviceProducts.ts", import.meta.url),
  );
  for (const [service, product] of products) {
    assert.equal(isServiceProduct(service, product), true);
    assert.equal(isServiceProduct(service, "unknown"), false);
    for (const locale of ["en", "de"]) {
      assert.equal(
        serviceProductPath(service, locale),
        `/${locale}/services/${service}/${product}`,
      );
      const email = new URL(serviceProductEmail(service, locale));
      assert.equal(email.protocol, "mailto:");
      assert.equal(email.pathname, "alexander@fuerst.one");
      assert.ok(email.searchParams.get("subject"));
      assert.ok(email.searchParams.get("body").includes("\n"));
    }
  }
  assert.equal(isServiceProduct("product-interfaces", "assessment"), false);
  assert.equal(isServiceProduct("ai-automation", "review"), false);
});

for (const [service, product] of products) {
  for (const locale of ["en", "de"]) {
    const path = `/${locale}/services/${service}/${product}`;
    test(`${path} explains a scoped offer and links it to its service and evidence`, async () => {
      const response = await get(path);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.match(html, new RegExp(`<html[^>]*lang="${locale}"`));
      assert.ok(html.includes(`rel="canonical" href="${origin}${path}"`));
      for (const language of ["en", "de", "x-default"]) {
        const target = language === "x-default" ? "en" : language;
        assert.ok(
          html.includes(
            `hrefLang="${language}" href="${origin}/${target}/services/${service}/${product}"`,
          ),
        );
      }
      assert.match(html, /mailto:alexander@fuerst\.one\?subject=/);
      assert.ok(html.includes(`href="/${locale}/services/${service}"`));
      assert.match(html, new RegExp(`href="/${locale}/projects/`));
      assert.match(html, locale === "de" ? /Honorar/ : /fee/);
      assert.match(html, /<details/);
      const schemas = [
        ...html.matchAll(
          /<script type="application\/ld\+json">(.*?)<\/script>/gs,
        ),
      ].flatMap(([, data]) => {
        const schema = JSON.parse(data);
        return schema["@graph"] || [schema];
      });
      const schema = schemas.find((item) => item["@type"] === "Service");
      assert.equal(schema?.url, `${origin}${path}`);
      assert.equal(schema?.inLanguage, locale);
      assert.equal(schema?.offers?.price, undefined);
      const parent = await get(`/${locale}/services/${service}`);
      assert.ok((await parent.text()).includes(`href="${path}"`));
    });
  }
}

test("starting offers are included in the sitemap and AI discovery entry points", async () => {
  const sitemap = await (await get("/sitemap.xml")).text();
  const llms = await (await get("/llms.txt")).text();
  for (const [service, product] of products) {
    for (const locale of ["en", "de"]) {
      const url = `${origin}/${locale}/services/${service}/${product}`;
      assert.ok(sitemap.includes(`<loc>${url}</loc>`));
      assert.ok(llms.includes(url));
    }
  }
});

test("unknown products and mismatched service/product pairs return 404", async () => {
  for (const path of [
    "/en/services/product-interfaces/assessment",
    "/de/services/ai-automation/review",
    "/en/services/ai-automation/unknown",
    "/fr/services/product-interfaces/review",
  ]) {
    assert.equal((await get(path)).status, 404, path);
  }
});
