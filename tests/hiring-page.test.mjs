import assert from "node:assert/strict";
import { test } from "node:test";

const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";

test("the hiring directory exposes the owner's confirmed profiles without JavaScript", async () => {
  const response = await fetch(`${base}/en/hire`);
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.match(body, /<h1[^>]*>Work with me<\/h1>/);
  for (const href of [
    "https://www.malt.com/profile/alexanderfuerst",
    "https://www.freelancermap.de/profil/alexander-fuerst",
    "https://www.linkedin.com/in/fuerst-one/",
    "mailto:alexander@fuerst.one",
  ])
    assert.ok(
      body.includes(`href="${href}"`),
      `Missing confirmed profile: ${href}`,
    );
  assert.match(body, /rel="canonical" href="https:\/\/fuerst.one\/en\/hire"/);
});
