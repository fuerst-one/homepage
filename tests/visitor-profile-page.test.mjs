import assert from "node:assert/strict";
import { test } from "node:test";
const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";
for (const [locale, title, start, rules] of [
  [
    "en",
    "Your interests, taking shape.",
    "Start my live profile",
    "How signals become interests",
  ],
  [
    "de",
    "Deine Interessen nehmen Form an.",
    "Mein Live-Profil starten",
    "Wie aus Signalen Interessen werden",
  ],
]) {
  test(`${locale} profile page explains consent and scoring in the shared site layout`, async () => {
    const response = await fetch(`${base}/${locale}/profile`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes(title));
    assert.ok(html.includes(start));
    assert.ok(html.includes(rules));
    assert.match(html, /name="robots" content="[^"]*noindex/);
    assert.ok(html.includes("content-page"));
    assert.ok(html.includes(`href="/${locale}/projects"`));
  });
}
