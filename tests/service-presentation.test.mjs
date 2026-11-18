import assert from "node:assert/strict";
import { test } from "node:test";

const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";

test("service introductions include a named motion control alongside readable content", async () => {
  for (const locale of ["en", "de"])
    for (const service of [
      "product-interfaces",
      "ai-automation",
      "ai-products",
    ]) {
      const path = `/${locale}/services/${service}`;
      const response = await fetch(`${base}${path}`);
      assert.equal(response.status, 200);
      const html = (await response.text()).replace(
        /<script\b[^>]*>[\s\S]*?<\/script>/g,
        "",
      );
      const hero = html.match(
        /<article\b[^>]*>[\s\S]*?<header\b[^>]*>([\s\S]*?)<\/header>/,
      )?.[1];
      assert.ok(
        hero,
        `${path}: introduction is present without client rendering`,
      );
      assert.match(hero, /<h1\b[^>]*>[^<]+<\/h1>/);
      assert.ok(hero.includes(`href="${path}/collaboration"`));
      assert.match(
        hero,
        locale === "de"
          ? /<button\b[^>]*aria-label="Animation pausieren"/
          : /<button\b[^>]*aria-label="Pause animation"/,
        `${path}: visitors can pause the decorative animation`,
      );
      assert.match(
        hero,
        locale === "de" ? /Ziehen zum Drehen/ : /Drag to orbit/,
        `${path}: visitors can discover how to rotate the model`,
      );
      assert.match(
        hero,
        locale === "de" ? /Umschalt.*Pfeiltasten/ : /Shift.*arrow keys/,
        `${path}: keyboard rotation instructions are available`,
      );
    }
});
