import assert from "node:assert/strict";
import { test } from "node:test";

const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";

test("retired CV PDF and print URLs do not expose public documents", async () => {
  for (const path of [
    "/cv.pdf",
    "/en/cv.pdf?preset=all",
    "/de/cv.pdf",
    "/pdf-content",
    "/en/pdf-content",
    "/de/pdf-content",
  ]) {
    const response = await fetch(`${base}${path}`);
    assert.equal(response.status, 410, path);
    assert.match(response.headers.get("x-robots-tag"), /noindex/);
  }
});

test("contact provides an enquiry flow and no public CV gate", async () => {
  for (const locale of ["en", "de"]) {
    const response = await fetch(
      `${base}/${locale}/contact?intent=team&source=hire`,
    );
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.ok(html.includes('id="enquiry-flow"'));
    assert.ok(html.includes("mailto:alexander@fuerst.one"));
    assert.doesNotMatch(html, /Pick a CV preset|Get PDF CV|Lebenslauf als PDF/);
  }
});

test("valid multilingual description lengths reach field validation rather than a transport error", async () => {
  const response = await fetch(`${base}/api/enquiries`, {
    method: "POST",
    headers: { origin: base, "content-type": "application/json" },
    body: JSON.stringify({
      situation: "漢".repeat(4000),
      outcome: "語".repeat(4000),
    }),
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "invalid_brief");
});

test("enquiry API rejects untrusted origins, invalid data and large bodies without writing", async () => {
  for (const [headers, body, status] of [
    [
      {
        origin: "https://unrelated.example",
        "content-type": "application/json",
      },
      "{}",
      403,
    ],
    [{ origin: base, "content-type": "application/json" }, "{}", 400],
    [{ origin: base, "content-type": "text/plain" }, "{}", 415],
    [
      { origin: base, "content-type": "application/json" },
      "x".repeat(100001),
      413,
    ],
  ]) {
    const response = await fetch(`${base}/api/enquiries`, {
      method: "POST",
      headers,
      body,
    });
    assert.equal(response.status, status);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});
