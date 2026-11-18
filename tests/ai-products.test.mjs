import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const load = (path) => loadTs(new URL(`../${path}`, import.meta.url));

test("AI products is a localized service with its own metadata", () => {
  const { isServiceSlug, servicePath } = load("apps/web/src/data/services.ts");
  assert.equal(isServiceSlug("ai-products"), true);
  const { serviceMetadata, serviceSchema } = load(
    "apps/web/src/components/Services/serviceMetadata.ts",
  );
  for (const locale of ["en", "de"]) {
    const path = `/${locale}/services/ai-products`;
    assert.equal(servicePath("ai-products", locale), path);
    const metadata = serviceMetadata("ai-products", locale);
    assert.equal(metadata.alternates.canonical, `https://fuerst.one${path}`);
    assert.equal(
      serviceSchema("ai-products", locale).url,
      `https://fuerst.one${path}`,
    );
    assert.equal(serviceSchema("ai-products", locale).inLanguage, locale);
  }
});

test("AI-products enquiry links preserve the service through parsing", () => {
  const { enquiryPath, enquiryContext } = load(
    "packages/content/src/enquiry.ts",
  );
  for (const locale of ["en", "de"]) {
    const href = enquiryPath(
      { source: "service", service: "ai-products", intent: "explore" },
      locale,
    );
    const url = new URL(href, "https://fuerst.one");
    assert.equal(url.pathname, `/${locale}/contact`);
    assert.equal(url.searchParams.get("service"), "ai-products");
    assert.equal(url.searchParams.get("intent"), "explore");
    assert.deepEqual(enquiryContext(Object.fromEntries(url.searchParams)), {
      source: "service",
      service: "ai-products",
    });
  }
  assert.equal(
    enquiryContext({ service: "ai-products", offer: "assessment" }).offer,
    undefined,
  );
});

test("AI-products cases keep the agreed order and only expose public display data", () => {
  const { isServiceSlug } = load("apps/web/src/data/services.ts");
  assert.equal(isServiceSlug("ai-products"), true);
  const { selectServiceEvidence } = load(
    "apps/web/src/components/Services/serviceEvidence.ts",
  );
  const ids = [
    "35486514-f736-803d-ae01-dc666a99d11c",
    "15b86514-f736-803e-b9b7-e47ebc2406d1",
    "11d86514-f736-80ed-935c-e6fe30b59d42",
    "35486514-f736-8020-bde8-e0f741a1a77a",
  ];
  const make = (id) => ({
    id,
    name: id,
    screenshots: ["/public-product.png"],
    tools: [],
    clients: [{ name: "Public name", email: "private@example.com" }],
    projectType: "Hobby",
    kpis: { rich_text: [] },
    localCodePaths: "private path",
  });
  const result = selectServiceEvidence(
    [make("unrelated"), ...ids.toReversed().map(make)],
    "ai-products",
    (p) => `/en/projects/${p.id}`,
  );
  assert.deepEqual(
    result.map((p) => p.id),
    ids,
  );
  assert.ok(!JSON.stringify(result).includes("private@example.com"));
  assert.ok(!JSON.stringify(result).includes("private path"));
  assert.deepEqual(
    selectServiceEvidence([], "ai-products", (p) => p.id),
    [],
  );
});

test("AI products has no invented paid starting-offer route", () => {
  const { isServiceProduct } = load("apps/web/src/data/serviceProducts.ts");
  assert.equal(isServiceProduct("ai-products", "assessment"), false);
  assert.equal(isServiceProduct("ai-products", "review"), false);
});
