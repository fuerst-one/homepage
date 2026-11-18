import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { projectHoverDetails } = loadTs(
  new URL(
    "../apps/web/src/components/ExperienceAtlas/projectHover.ts",
    import.meta.url,
  ),
);
test("bubble cards explain the project and its current cluster using recorded fields", () => {
  const details = projectHoverDetails(
    {
      name: "Konfig",
      subtitle: "Product design configurator",
      summary: "Long case",
      industries: ["Automotive & mobility"],
      ownership: "Product engineering owner",
      wowFactor: 8,
    },
    2,
    4,
  );
  assert.equal(details.title, "Konfig");
  assert.equal(details.description, "Product design configurator");
  assert.deepEqual(details.rows, [
    { label: "Industry", value: "Automotive & mobility" },
    { label: "Contribution", value: "Product engineering owner" },
    { label: "Cluster", value: "03 · 4 projects" },
    { label: "Wow factor", value: "8/10" },
  ]);
});
test("missing project facts stay omitted and long summary fallbacks are bounded", () => {
  const details = projectHoverDetails(
    {
      name: "Untitled",
      subtitle: "",
      summary: "a".repeat(300),
      industries: [],
      ownership: "",
      wowFactor: null,
    },
    -1,
    0,
  );
  assert.equal(details.description.length, 180);
  assert.match(details.description, /…$/);
  assert.deepEqual(details.rows, []);
});

test("German bubble cards use published prose and translate traits without changing project identity", () => {
  const details = projectHoverDetails(
    {
      name: "Konfig",
      subtitle: "Original English",
      summary: "Context",
      industries: ["Automotive & mobility"],
      ownership: "Solo delivery",
      wowFactor: 8,
      presentation: {
        description: "Ein Designwerkzeug für Motorraddekore.",
        locale: "de",
      },
    },
    0,
    1,
    "de",
  );
  assert.equal(details.title, "Konfig");
  assert.equal(details.contentLocale, "de");
  assert.equal(details.description, "Ein Designwerkzeug für Motorraddekore.");
  assert.deepEqual(details.rows.slice(0, 3), [
    { label: "Branche", value: "Automobil & Mobilität" },
    { label: "Beitrag", value: "Eigenständige Umsetzung" },
    { label: "Gruppe", value: "01 · 1 Projekt" },
  ]);
});
