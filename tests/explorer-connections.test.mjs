import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const project = (id, availableLocales = ["en", "de"]) => ({
  id,
  availableLocales,
});
const source = [
  {
    id: "one",
    industries: [],
    related: [
      { id: "two", reasons: ["UI design"] },
      { id: "three", reasons: ["Backend development"] },
      { id: "four", reasons: ["Prototyping"] },
      { id: "five", reasons: ["Animation"] },
    ],
  },
  { id: "two", industries: ["Education"], related: [] },
];
const api = () =>
  loadTs(
    new URL(
      "../apps/web/src/components/Cv/Projects/explorerConnections.ts",
      import.meta.url,
    ),
  );

test("project pages preserve the three Explorer connections and their recorded reasons", () => {
  const visible = ["one", "two", "three", "four", "five"].map((id) =>
    project(id),
  );
  const result = api().explorerConnections("one", visible, source, "en");
  assert.deepEqual(
    result.map((item) => item.project.id),
    ["two", "three", "four"],
  );
  assert.deepEqual(result[0].reasons, ["UI design"]);
  assert.deepEqual(result[0].industries, ["Education"]);
});

test("connections omit unpublished, self, duplicate and untranslated destinations", () => {
  const dirty = [
    {
      ...source[0],
      related: [
        { id: "one", reasons: [] },
        { id: "missing", reasons: [] },
        { id: "two", reasons: ["UI design"] },
        { id: "two", reasons: ["Duplicate"] },
        { id: "three", reasons: ["Backend development"] },
      ],
    },
    source[1],
  ];
  const visible = [project("one"), project("two"), project("three", ["en"])];
  assert.deepEqual(
    api()
      .explorerConnections("one", visible, dirty, "de")
      .map((item) => item.project.id),
    ["two"],
  );
  assert.deepEqual(
    api().explorerConnections("one", visible.slice(1), dirty, "en"),
    [],
  );
  assert.deepEqual(
    api().explorerConnections("unknown", visible, dirty, "en"),
    [],
  );
});
