import assert from "node:assert/strict";
import { test } from "node:test";
import { randomBytes, randomUUID } from "node:crypto";

const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";
const headers = {
  "Content-Type": "application/json",
  Origin: base,
  "X-Forwarded-For": "198.51.100.183",
};
const send = (body, method = "POST", extra = {}) =>
  fetch(`${base}/api/profile/events`, {
    method,
    headers: { ...headers, ...extra },
    body: JSON.stringify(body),
  });

test("profile catalog exposes public dimensions without source records", async () => {
  const response = await fetch(`${base}/api/profile/catalog`);
  assert.equal(response.status, 200);
  const catalog = await response.json();
  assert.ok(catalog.projects.length > 0);
  assert.ok(catalog.terms.some((t) => t.facet === "methods"));
  assert.deepEqual(Object.keys(catalog.projects[0]).sort(), [
    "href",
    "id",
    "name",
    "terms",
  ]);
  assert.ok(!JSON.stringify(catalog).includes("evidenceGaps"));
});
test("profile collection requires same origin and a fresh sharing choice", async () => {
  const { projects } = await (
    await fetch(`${base}/api/profile/catalog`)
  ).json();
  const body = {
    version: 1,
    token: randomBytes(32).toString("hex"),
    events: [
      { id: randomUUID(), kind: "project_opened", subject: projects[0].id },
    ],
  };
  assert.equal(
    (await send(body, "POST", { Origin: "https://unrelated.example" })).status,
    403,
  );
  assert.equal((await send(body)).status, 400);
  assert.equal(
    (await send({ ...body, consentAt: Date.now(), searchText: "private" }))
      .status,
    400,
  );
  assert.equal(
    (
      await send({
        ...body,
        consentAt: Date.now(),
        events: [{ ...body.events[0], subject: "unpublished" }],
      })
    ).status,
    400,
  );
});
test("shared events can be acknowledged, erased and cannot return after erasure", async () => {
  const { projects, sharingAvailable } = await (
    await fetch(`${base}/api/profile/catalog`)
  ).json();
  assert.equal(
    sharingAvailable,
    true,
    "apply the local profile migration before this integration check",
  );
  const token = randomBytes(32).toString("hex");
  const body = {
    version: 1,
    consentAt: Date.now(),
    token,
    events: [
      { id: randomUUID(), kind: "project_opened", subject: projects[0].id },
    ],
  };
  try {
    const response = await send(body);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).accepted, 1);
    assert.equal(
      (await send(body)).status,
      200,
      "delivery retries are idempotent",
    );
    assert.equal((await send({ token }, "DELETE")).status, 200);
    assert.equal((await send(body)).status, 409);
    assert.equal(
      (await fetch(`${base}/api/profile/events`)).status,
      405,
      "owner reports have no public endpoint",
    );
  } finally {
    await send({ token }, "DELETE");
  }
});
test("profile API rejects oversized bodies before parsing event content", async () => {
  const response = await send({ oversized: "x".repeat(17_000) });
  assert.equal(response.status, 400);
});
