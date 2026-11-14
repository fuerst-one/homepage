import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const moduleUrl = new URL("../src/lib/i18n.ts", import.meta.url);
const getI18n = () => {
  assert.ok(existsSync(moduleUrl), "Locale routing must be available");
  return loadTs(moduleUrl);
};

test("language links change the prefix while preserving filters and anchors", () => {
  const { localizedPath } = getI18n();
  assert.equal(localizedPath("/", "en"), "/en");
  assert.equal(
    localizedPath("/en/cv?tools=React#projects", "de"),
    "/de/cv?tools=React#projects",
  );
  assert.equal(
    localizedPath("/de/projects/konfig", "en"),
    "/en/projects/konfig",
  );
});

test("API endpoints, assets and external destinations are not localized", () => {
  const { localizedPath } = getI18n();
  for (const path of [
    "/api/projects?limit=10",
    "/sitemap.xml",
    "/robots.txt",
    "/llms.txt",
    "/opengraph-image",
    "/images/avatar.png",
    "https://github.com/fuerst-one",
    "mailto:alexander@fuerst.one",
    "#projects",
  ]) {
    assert.equal(localizedPath(path, "de"), path);
  }
  assert.equal(
    localizedPath("/cv.pdf?preset=all", "de"),
    "/de/cv.pdf?preset=all",
  );
});

test("unsupported language codes are rejected", () => {
  const { isLocale } = getI18n();
  assert.ok(isLocale("en"));
  assert.ok(isLocale("de"));
  assert.equal(isLocale("fr"), false);
  assert.equal(isLocale("constructor"), false);
});

test("legal language links point directly to the corresponding written page", () => {
  const { localizedPath } = getI18n();
  assert.equal(localizedPath("/en/privacy", "de"), "/de/datenschutz");
  assert.equal(localizedPath("/de/impressum", "en"), "/en/legal-notice");
});

test("German landing commands resolve to localized destinations", () => {
  const commands = loadTs(
    new URL("../src/components/PlasmaLanding/commands.ts", import.meta.url),
  );
  assert.equal(
    commands.resolveExplicitCommand("Kontakt", "de")?.href,
    "/de/contact",
  );
  assert.equal(
    commands.resolveExplicitCommand("Projekte", "de")?.href,
    "/de/cv",
  );
  assert.equal(
    commands.resolveExplicitCommand("Lebenslauf herunterladen", "de")?.href,
    "/de/contact",
  );
});
