import assert from "node:assert/strict";
import { test, after } from "node:test";
import { readFile } from "node:fs/promises";
import { randomUUID, randomBytes } from "node:crypto";

const url = new URL(
  process.env.KNOWLEDGE_DATABASE_URL || "http://unconfigured",
);
if (
  !["localhost", "127.0.0.1"].includes(url.hostname) ||
  !url.pathname.endsWith("_test")
)
  throw new Error("Use a dedicated localhost database ending in _test");
const { knowledgeDatabase } =
  await import("../packages/database/src/database.ts");
const sql = knowledgeDatabase();
after(() => sql.end());
test("profile migration is additive and rerunnable", async () => {
  const migration = await readFile(
    new URL(
      "../packages/database/migrations/012-visitor-profile.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await sql.unsafe(migration);
  await sql.unsafe(migration);
});
test("duplicate delivery and revocation cannot recreate shared data", async () => {
  const { storeProfileEvents, deleteProfileEvents } =
    await import("../packages/database/src/visitorProfile.ts");
  const token = randomBytes(32).toString("hex");
  const event = { id: randomUUID(), kind: "project_opened", subject: "a" };
  await storeProfileEvents(token, [event], sql);
  await storeProfileEvents(token, [event], sql);
  assert.equal(
    Number(
      (
        await sql`SELECT count(*) AS n FROM visitor_profile_events WHERE event_id=${event.id}`
      )[0].n,
    ),
    1,
  );
  await deleteProfileEvents(token, sql);
  assert.equal(
    await storeProfileEvents(token, [{ ...event, id: randomUUID() }], sql),
    false,
  );
  assert.equal(
    Number(
      (
        await sql`SELECT count(*) AS n FROM visitor_profile_events WHERE event_id=${event.id}`
      )[0].n,
    ),
    0,
  );
});
test("reports exclude expired events and never expose browser secrets", async () => {
  const { storeProfileEvents, profileInsights, deleteProfileEvents } =
    await import("../packages/database/src/visitorProfile.ts");
  const token = randomBytes(32).toString("hex");
  const id = randomUUID();
  await storeProfileEvents(
    token,
    [
      {
        id,
        kind: "preference_changed",
        subject: "tools:React",
        preference: "exclude",
        previous: "auto",
        inferredScore: 6,
        basis: { filter_selected: 6 },
      },
    ],
    sql,
  );
  let report = await profileInsights(sql);
  assert.ok(
    report.corrections.some(
      (r) => r.subject === "tools:React" && r.preference === "exclude",
    ),
  );
  assert.ok(!JSON.stringify(report).includes(token));
  assert.ok(
    report.feedbackBySignal.some(
      (r) => r.signal === "filter_selected" && r.preference === "exclude",
    ),
  );
  await sql`UPDATE visitor_profile_events SET received_at=now()-interval '31 days' WHERE event_id=${id}`;
  report = await profileInsights(sql);
  assert.ok(!report.corrections.some((r) => r.subject === "tools:React"));
  await deleteProfileEvents(token, sql);
});
