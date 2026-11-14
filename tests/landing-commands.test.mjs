import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const {
  resolveCommand,
  resolveExplicitCommand,
  SUGGESTIONS,
  getLocalizedSuggestions,
} = loadTs(
  new URL("../src/components/PlasmaLanding/commands.ts", import.meta.url),
);

test("German command chips and aliases resolve to localized destinations", () => {
  for (const chip of getLocalizedSuggestions("de")) {
    assert.equal(resolveExplicitCommand(chip.label, "de")?.href, chip.href);
  }
  for (const [query, href] of [
    ["Zeig mir deine Projekte!", "/de/cv"],
    ["Über mich", "/de/cv"],
    ["Wie kann ich dich kontaktieren?", "/de/contact"],
    ["Lebenslauf downloaden", "/de/contact"],
    ["Mit dir arbeiten", "/de/hire"],
    ["Lass uns basteln", "/de/plasma"],
  ])
    assert.equal(resolveExplicitCommand(query, "de")?.href, href, query);
  assert.equal(
    resolveExplicitCommand("Animation pausieren", "de")?.action,
    "pause",
  );
  assert.equal(
    resolveExplicitCommand("Animation fortsetzen", "de")?.action,
    "play",
  );
  for (const query of [
    "React Projekte",
    "KI Erfahrung",
    "Projekte mit React",
    "nicht pausieren",
  ]) {
    assert.equal(resolveExplicitCommand(query, "de"), null, query);
  }
});

test("suggestions resolve to their advertised destinations or controls", () => {
  for (const suggestion of SUGGESTIONS) {
    assert.equal(resolveCommand(suggestion.label)?.id, suggestion.id);
  }
});

test("natural navigation phrases ignore case and punctuation", () => {
  assert.equal(resolveCommand("  Show me your PROJECTS! ")?.href, "/cv");
  assert.equal(resolveCommand("How can I get in touch?")?.href, "/contact");
  assert.equal(resolveCommand("Tell me about your experience")?.href, "/cv");
  assert.equal(resolveCommand("Download my CV")?.href, "/contact");
});

test("plasma commands change playback without navigating", () => {
  assert.equal(resolveCommand("pause animation")?.action, "pause");
  assert.equal(resolveCommand("resume plasma")?.action, "play");
});

test("unknown and empty messages do not navigate or guess", () => {
  for (const message of [
    "",
    "  ",
    "what is the weather",
    "javascript:alert(1)",
    "not a project",
    "don't pause",
  ]) {
    assert.equal(resolveCommand(message), null);
  }
});

test("explore projects opens the experience page and surprise is removed", () => {
  assert.equal(SUGGESTIONS[0].label, "Explore projects");
  assert.equal(SUGGESTIONS[0].href, "/cv");
  assert.equal(
    SUGGESTIONS.filter((item) => item.label === "Explore projects").length,
    1,
  );
  assert.ok(SUGGESTIONS.every((item) => item.href !== "/projects"));
  assert.equal(resolveCommand("Surprise me"), null);
});

test("explicit navigation wins over incidental project search matches", () => {
  for (const suggestion of SUGGESTIONS) {
    assert.equal(resolveExplicitCommand(suggestion.label)?.id, suggestion.id);
  }
  assert.equal(resolveExplicitCommand("experience")?.href, "/cv");
  assert.equal(resolveExplicitCommand("Show me your projects!")?.href, "/cv");
  assert.equal(resolveExplicitCommand("Explore my experience")?.href, "/cv");
  assert.equal(resolveExplicitCommand("pause plasma")?.action, "pause");
  assert.equal(resolveExplicitCommand("resume")?.action, "play");
  for (const query of [
    "React projects",
    "Remote work",
    "AI experience",
    "React PDF",
    "PDF generation",
  ]) {
    assert.equal(resolveExplicitCommand(query), null);
  }
});

test("hiring requests lead to the platform directory", () => {
  for (const message of ["Work with me", "hire me", "Malt", "freelancermap"]) {
    assert.equal(resolveCommand(message)?.href, "/hire");
  }
});
