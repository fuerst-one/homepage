import assert from "node:assert/strict";
import { test } from "node:test";
const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";
const get = (path) =>
  fetch(`${base}${path}`, { signal: AbortSignal.timeout(60000) });

for (const locale of ["en", "de"]) {
  test(`${locale} automation page presents Test Flow and data-pipeline work with honest scope`, async () => {
    const response = await get(`/${locale}/services/ai-automation`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes(`/${locale}/projects/test-flow`));
    assert.ok(
      html.includes(`/${locale}/projects/numobility-mobility-database-blog`),
    );
    assert.ok(
      html.includes(
        `/${locale}/projects/conversion-y-ai-powered-surveys-for-b2b`,
      ),
    );
    assert.ok(
      html.includes(`href="#case-35686514-f736-8019-921c-e5d8d77e7f23"`),
    );
    assert.match(
      html,
      locale === "en"
        ? /occasional internal use/
        : /gelegentlich intern genutzt/,
    );
    assert.match(
      html,
      locale === "en" ? /historical implementation/ : /historische Umsetzung/,
    );
    assert.doesNotMatch(
      html,
      /Dropped manual QA|12 agents running|50% less time|in half/,
    );
    assert.ok(
      html.includes(
        `/${locale}/contact?source=service&amp;service=ai-automation&amp;intent=explore`,
      ),
    );
    assert.ok(html.includes(`/${locale}/services/ai-automation/assessment`));
    assert.match(
      html,
      locale === "en"
        ? /Where%20the%20result%20should%20go/
        : /Hier%20soll%20das%20Ergebnis%20ankommen/,
    );
  });
  test(`${locale} assessment keeps Test Flow context and the existing enquiry destination`, async () => {
    const response = await get(`/${locale}/services/ai-automation/assessment`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes(`/${locale}/projects/test-flow`));
    assert.match(
      html,
      locale === "en"
        ? /Workflow &amp; automation assessment/
        : /Workflow- und Automatisierungs-Assessment/,
    );
    assert.ok(
      html.includes(
        `/${locale}/contact?source=service&amp;service=ai-automation&amp;offer=assessment&amp;intent=improve`,
      ),
    );
  });
}

test("featured case links resolve to actual public project pages", async () => {
  for (const slug of [
    "test-flow",
    "numobility-mobility-database-blog",
    "conversion-y-ai-powered-surveys-for-b2b",
    "build-manager",
  ]) {
    assert.equal((await get(`/en/projects/${slug}`)).status, 200, slug);
  }
});
