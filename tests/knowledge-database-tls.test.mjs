import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const { knowledgeDatabaseTls } = loadTs(
  new URL("../src/server/knowledge/database.ts", import.meta.url),
);
test("remote knowledge databases require certificate verification and accept the configured private CA", () => {
  assert.deepEqual(
    knowledgeDatabaseTls(
      "postgres://app:password@db.example.test/knowledge",
      "TEST\\nCA",
    ),
    { rejectUnauthorized: true, ca: "TEST\nCA" },
  );
  assert.deepEqual(
    knowledgeDatabaseTls(
      "postgres://app:password@db.example.test/knowledge?sslmode=disable",
    ),
    { rejectUnauthorized: true },
  );
});
test("local development keeps its existing loopback-only non-TLS connection", () => {
  for (const host of ["localhost", "127.0.0.1", "[::1]"])
    assert.equal(
      knowledgeDatabaseTls(`postgres://app:password@${host}/knowledge`),
      false,
    );
});
