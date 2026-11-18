import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync } from "node:fs";
import { loadTs } from "./helpers/load-ts.mjs";
const path = new URL(
  "../apps/web/src/components/Cv/Projects/projectHeading.ts",
  import.meta.url,
);
const split = (name) => {
  assert.ok(
    existsSync(path),
    "Project headings must separate the name from its purpose",
  );
  return loadTs(path).projectHeading(name);
};
test("a published composed title separates its project name and purpose", () => {
  assert.deepEqual(split("RoadTrippin – Collaborative Road Trip Planner"), {
    title: "RoadTrippin",
    subtitle: "Collaborative Road Trip Planner",
  });
});
test("hyphens inside project names remain part of the name", () => {
  assert.deepEqual(
    split("Playlist-Canvas – Spotify Album Art Collage Creator"),
    { title: "Playlist-Canvas", subtitle: "Spotify Album Art Collage Creator" },
  );
  assert.deepEqual(split("build-manager"), {
    title: "build-manager",
    subtitle: "",
  });
});
test("only the first spaced separator splits a title", () => {
  assert.deepEqual(split("Public Searoutes — Navigation – Excel plugin"), {
    title: "Public Searoutes",
    subtitle: "Navigation – Excel plugin",
  });
  assert.deepEqual(split("Konfig - Product Design Configurator"), {
    title: "Konfig",
    subtitle: "Product Design Configurator",
  });
});
test("titles without a description remain usable", () => {
  assert.deepEqual(split("  Konfig  "), { title: "Konfig", subtitle: "" });
  assert.deepEqual(split(""), { title: "", subtitle: "" });
});
