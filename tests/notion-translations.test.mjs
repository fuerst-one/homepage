import assert from "node:assert/strict";
import { test } from "node:test";
import {
  translateRichText,
  missingTranslationProperties,
} from "../apps/sync/scripts/lib/translationProperties.mjs";
const source = [
  {
    type: "text",
    text: { content: "Example", link: { url: "https://example.com" } },
    annotations: { bold: true },
    plain_text: "Example",
  },
];
test("Notion translations preserve link destinations and annotations", () => {
  const [translated] = translateRichText(source, ["Beispiel"]);
  assert.equal(translated.text.content, "Beispiel");
  assert.deepEqual(translated.text.link, source[0].text.link);
  assert.deepEqual(translated.annotations, source[0].annotations);
  assert.equal(source[0].text.content, "Example");
  assert.throws(() => translateRichText(source, []), /segment count/);
});
test("backfilling translations never replaces existing German text", () => {
  const changes = missingTranslationProperties(
    {
      "Project Description": { rich_text: source },
      KPIs: { rich_text: [] },
      "Project Description DE": {
        rich_text: [{ plain_text: "Meine Übersetzung" }],
      },
    },
    { description: ["Beispiel"], kpis: [] },
  );
  assert.deepEqual(changes, {});
});
