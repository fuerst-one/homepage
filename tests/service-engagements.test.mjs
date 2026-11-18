import assert from "node:assert/strict";
import { test } from "node:test";

const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";
const origin = "https://fuerst.one";
const services = ["product-interfaces", "ai-automation", "ai-products"];
const get = (path) =>
  fetch(`${base}${path}`, {
    redirect: "manual",
    signal: AbortSignal.timeout(60000),
  });
const visible = (html) =>
  html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");

for (const service of services) {
  for (const locale of ["en", "de"]) {
    const parent = `/${locale}/services/${service}`;
    const path = `${parent}/collaboration`;
    test(`${path} offers project and team collaboration with contextual enquiries`, async () => {
      const response = await get(path);
      assert.equal(response.status, 200);
      const html = await response.text();
      const body = visible(html);
      assert.ok(html.includes(`rel="canonical" href="${origin}${path}"`));
      for (const language of ["en", "de", "x-default"]) {
        const target = language === "x-default" ? "en" : language;
        assert.ok(
          html.includes(
            `hrefLang="${language}" href="${origin}/${target}/services/${service}/collaboration"`,
          ),
        );
      }
      const links = [...body.matchAll(/href="([^"]+)"/g)].map(
        ([, href]) => new URL(href.replaceAll("&amp;", "&"), origin),
      );
      for (const intent of [null, "team"]) {
        const enquiry = links.find(
          (url) =>
            url.pathname === `/${locale}/contact` &&
            url.searchParams.get("service") === service &&
            url.searchParams.get("intent") === intent,
        );
        assert.ok(
          enquiry,
          `${intent ?? "project"} should retain the service choice without assuming a delivery stage`,
        );
        assert.equal(enquiry.searchParams.get("source"), "service");
        assert.equal(enquiry.searchParams.has("offer"), false);
      }
      assert.ok(links.some((url) => url.pathname === parent));
      assert.match(body, /<details\b/);
      assert.match(body, /handover|Übergabe/i);
      assert.match(body, /maintenance|Wartung|Betreuung/i);
      const schemas = [
        ...html.matchAll(
          /<script type="application\/ld\+json">(.*?)<\/script>/gs,
        ),
      ].flatMap(([, text]) => {
        const data = JSON.parse(text);
        return data["@graph"] || [data];
      });
      const schema = schemas.find((data) => data["@type"] === "Service");
      assert.equal(schema?.url, `${origin}${path}`);
      assert.equal(schema?.inLanguage, locale);
      assert.equal(schema?.offers?.price, undefined);
      const parentHtml = visible(await (await get(parent)).text());
      assert.ok(parentHtml.includes(`href="${path}"`));
      assert.ok(
        parentHtml.includes(`/${locale}/contact?`),
        "Direct enquiries remain available on the overview",
      );
    });
  }
}

test("bounded offers link to optional implementation and answer handover questions", async () => {
  for (const [service, offer] of [
    ["product-interfaces", "review"],
    ["ai-automation", "assessment"],
  ]) {
    for (const locale of ["en", "de"]) {
      const html = visible(
        await (await get(`/${locale}/services/${service}/${offer}`)).text(),
      );
      assert.ok(
        html.includes(`href="/${locale}/services/${service}/collaboration"`),
      );
      assert.match(html, /handover|Übergabe/i);
      assert.match(html, /participat|involvement|mitwirk|Ansprechperson/i);
    }
  }
});

test("collaboration pages are discoverable and unsupported routes return 404", async () => {
  const sitemap = await (await get("/sitemap.xml")).text();
  const discovery = await (await get("/llms.txt")).text();
  for (const service of services)
    for (const locale of ["en", "de"]) {
      const url = `${origin}/${locale}/services/${service}/collaboration`;
      assert.ok(sitemap.includes(`<loc>${url}</loc>`));
      assert.ok(discovery.includes(url));
    }
  for (const path of [
    "/fr/services/ai-products/collaboration",
    "/en/services/unknown/collaboration",
    "/en/services/ai-products/assessment",
  ]) {
    assert.equal((await get(path)).status, 404);
  }
});

test("flagship case briefs introduce the work and keep personal work distinct", async () => {
  for (const locale of ["en", "de"])
    for (const slug of ["konfig-product-design-configurator", "test-flow"]) {
      const html = visible(
        await (await get(`/${locale}/projects/${slug}/case-study`)).text(),
      );
      const brief = html.match(
        /<section\b[^>]*aria-labelledby="case-brief-heading"[^>]*>([\s\S]*?)<\/section>/,
      )?.[1];
      assert.ok(brief, `${locale}/${slug} needs an opening brief`);
      assert.match(brief, /<dl\b/);
      if (slug === "test-flow") {
        assert.match(brief, /personal|eigenes/i);
        assert.match(brief, /internal|intern/i);
        assert.doesNotMatch(brief, /\d+%/);
      } else {
        assert.match(brief, /3 days|3 Tage/);
        assert.match(brief, /reported|eigener Angabe/i);
      }
    }
});

test("Konfig's public overview and API agree on the owner-confirmed three-day pattern", async () => {
  const id = "15b86514-f736-803e-b9b7-e47ebc2406d1";
  for (const locale of ["en", "de"]) {
    const project = await (
      await get(`/api/projects/${id}?locale=${locale}`)
    ).json();
    assert.equal(project.scale.workingPattern, "3 days/week");
    const html = visible(
      await (
        await get(`/${locale}/projects/konfig-product-design-configurator`)
      ).text(),
    );
    assert.doesNotMatch(html, /4 days\/week/);
    assert.match(html, /3 days\/week|3 Tage\/Woche/);
  }
});

test("case brief copy stays server-side rather than shipping a complete registry to every visitor", async () => {
  const html = await (await get("/en/projects")).text();
  const scripts = [
    ...new Set(
      [...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(([, src]) => src),
    ),
  ];
  assert.ok(scripts.length > 0);
  for (const src of scripts) {
    const javascript = await (await get(src)).text();
    assert.doesNotMatch(
      javascript,
      /Let riders design motorcycle decals in the browser and produce a correctly scaled production PDF/,
    );
    assert.doesNotMatch(
      javascript,
      /Explore whether an agent can complete a browser task without a prescribed sequence of clicks/,
    );
  }
});
