import assert from "node:assert/strict";
import { test } from "node:test";

const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";
const fetchPage = (url) => fetch(url, { signal: AbortSignal.timeout(60000) });
const offers = [
  {
    slug: "product-interfaces",
    en: "Complex product interfaces",
    de: "Komplexe Produktinterfaces",
    project: "konfig-product-design-configurator",
  },
  {
    slug: "ai-automation",
    en: "AI automation &amp; prototypes",
    de: "KI-Automatisierung &amp; Prototypen",
    project: "conversion-y-ai-powered-surveys-for-b2b",
  },
];

for (const offer of offers) {
  for (const lang of ["en", "de"]) {
    const path = `/${lang}/services/${offer.slug}`;
    test(`${path} serves a localized offer, verifiable evidence and direct enquiry`, async () => {
      const response = await fetchPage(`${base}${path}`);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.ok(html.includes(offer[lang]));
      const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/)?.[1];
      assert.ok(article);
      assert.doesNotMatch(
        article,
        /<nav\b[^>]*aria-label="(?:Page language|Seitensprache)"/,
        "The shared page header provides language navigation",
      );
      const hero = article.match(/<header\b[^>]*>([\s\S]*?)<\/header>/)?.[1];
      const preHeadline = hero?.match(/<p\b[^>]*>([\s\S]*?)<\/p>/)?.[1];
      assert.ok(
        preHeadline?.includes(offer[lang]),
        "Service label introduces its headline",
      );
      assert.match(html, new RegExp(`<html[^>]*lang="${lang}"`));
      assert.ok(
        html.includes(`rel="canonical" href="https://fuerst.one${path}"`),
      );
      for (const [locale, prefix] of [
        ["en", "/en"],
        ["de", "/de"],
        ["x-default", "/en"],
      ]) {
        assert.ok(
          html.includes(
            `hrefLang="${locale}" href="https://fuerst.one${prefix}/services/${offer.slug}"`,
          ),
        );
      }
      const email = html.match(/href="(mailto:alexander@fuerst\.one\?[^"]+)"/);
      assert.ok(email, "Service enquiry must bypass the gated CV flow");
      assert.ok(
        new URL(email[1].replaceAll("&amp;", "&")).searchParams.get("subject"),
      );
      const schemas = [
        ...html.matchAll(
          /<script type="application\/ld\+json">(.*?)<\/script>/gs,
        ),
      ].map((m) => JSON.parse(m[1]));
      const service = schemas
        .flatMap((s) => s["@graph"] || [s])
        .find((s) => s["@type"] === "Service");
      assert.equal(service?.inLanguage, lang);
      assert.equal(service?.url, `https://fuerst.one${path}`);
      assert.ok(
        html.includes(`/projects/${offer.project}`),
        "Real case study must be linked",
      );
      assert.match(html, /<details/);
      if (offer.slug === "ai-automation")
        assert.match(
          html,
          lang === "en" ? /Personal project/ : /Eigenes Projekt/,
        );
      assert.ok(
        !html.includes('"email":'),
        "Client contact data must not be serialized",
      );
    });
  }
}

test("unknown services return 404 rather than an unrelated offer", async () => {
  for (const path of [
    "/en/services/unknown-offer",
    "/de/services/unknown-offer",
    "/fr/services/product-interfaces",
  ]) {
    assert.equal((await fetchPage(`${base}${path}`)).status, 404);
  }
});

test("service evidence is explicitly selected, ordered and strips unrelated client data", async () => {
  const { loadTs } = await import("./helpers/load-ts.mjs");
  const { selectServiceEvidence } = loadTs(
    new URL(
      "../apps/web/src/components/Services/serviceEvidence.ts",
      import.meta.url,
    ),
  );
  const make = (id, name) => ({
    id,
    name,
    screenshots: ["/api/image/example/Screenshots"],
    tools: ["React.js"],
    clients: [
      { name: "Example", email: "private@example.com", contacts: ["secret"] },
    ],
    projectType: "Freelance",
    kpis: { rich_text: [] },
    description: "unused",
  });
  const konfig = make("15b86514-f736-803e-b9b7-e47ebc2406d1", "Konfig");
  const seabo = make("153f6668-f4d6-490a-8345-0b999b35305a", "Seabo");
  const link = (project) => `/en/projects/${project.id}`;
  const evidence = selectServiceEvidence(
    [seabo, make("unrelated", "Unrelated"), konfig],
    "product-interfaces",
    link,
  );
  assert.deepEqual(
    evidence.map((p) => p.name),
    ["Konfig", "Seabo"],
  );
  assert.equal(evidence[0].href, `/en/projects/${konfig.id}`);
  assert.deepEqual(evidence[0].clients, ["Example"]);
  assert.ok(!JSON.stringify(evidence).includes("private@example.com"));
  assert.ok(!JSON.stringify(evidence).includes("secret"));
  assert.deepEqual(selectServiceEvidence([], "product-interfaces", link), []);
  assert.deepEqual(
    selectServiceEvidence([konfig, seabo], "ai-automation", link),
    [],
  );
});

test("services are discoverable and their sitemap entries expose translation pairs", async () => {
  const html = await fetchPage(`${base}/hire`).then((r) => r.text());
  const xml = await fetchPage(`${base}/sitemap.xml`).then((r) => r.text());
  for (const offer of offers) {
    assert.ok(html.includes(`href="/en/services/${offer.slug}"`));
    for (const prefix of ["/en", "/de"]) {
      const entry = xml.match(
        new RegExp(
          `<url>\\s*<loc>https://fuerst.one${prefix}/services/${offer.slug}</loc>[\\s\\S]*?</url>`,
        ),
      )?.[0];
      assert.ok(
        entry,
        `Missing sitemap entry ${prefix}/services/${offer.slug}`,
      );
      assert.ok(entry.includes('hreflang="en"'));
      assert.ok(entry.includes('hreflang="de"'));
    }
  }
});
