import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const { localExperimentAllowed } = loadTs(
  new URL(
    "../apps/web/src/components/ExperienceAtlas/experimentAccess.ts",
    import.meta.url,
  ),
);
const req = (headers = {}, url = "http://localhost:6894/api/lab/embeddings") =>
  new Request(url, { headers: { host: "localhost:6894", ...headers } });
test("only same-origin local development can trigger embeddings", () => {
  assert.equal(
    localExperimentAllowed(
      req({ origin: "http://localhost:6894" }),
      "development",
      true,
    ),
    true,
  );
  assert.equal(localExperimentAllowed(req(), "development"), true);
  for (const environment of ["production", "test", undefined])
    assert.equal(
      localExperimentAllowed(
        req({ origin: "http://localhost:6894" }),
        environment,
        true,
      ),
      false,
    );
  for (const headers of [
    {},
    { origin: "https://evil.example" },
    { origin: "null" },
    { host: "evil.example", origin: "http://localhost:6894" },
    { origin: "http://localhost:6894", "sec-fetch-site": "cross-site" },
  ])
    assert.equal(
      localExperimentAllowed(req(headers), "development", true),
      false,
    );
  assert.equal(
    localExperimentAllowed(
      req(
        { host: "example.com", origin: "https://example.com" },
        "https://example.com/api/lab/embeddings",
      ),
      "development",
      true,
    ),
    false,
  );
});

test("accepts loopback aliases after Next normalizes the internal hostname", () => {
  for (const host of ["localhost:6894", "127.0.0.1:6894", "[::1]:6894"]) {
    assert.equal(
      localExperimentAllowed(
        req(
          { host, origin: `http://${host}` },
          "http://127.0.0.1:6894/api/lab/embeddings",
        ),
        "development",
        true,
      ),
      true,
    );
  }
  for (const host of [
    "localhost:6895",
    "user@localhost:6894",
    "localhost:6894/path",
    "localhost:6894?x=y",
  ]) {
    assert.equal(localExperimentAllowed(req({ host }), "development"), false);
  }
});
