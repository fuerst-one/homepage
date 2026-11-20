import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";
const { FOR_YOU_ENABLED } = loadTs(
  new URL("../apps/web/src/lib/forYouEnabled.ts", import.meta.url),
);

for (const path of [
  "/en/for-you",
  "/de/for-you",
  "/en/for-you?example=ai-minimal",
])
  test(`${path} exists only while For you is released`, async () => {
    const response = await fetch(`${base}${path}`);
    assert.equal(response.status, FOR_YOU_ENABLED ? 200 : 404);
  });
