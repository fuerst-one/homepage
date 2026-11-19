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
  const extended = await readFile(
    new URL(
      "../packages/database/migrations/013-visitor-profile-signals.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await sql.unsafe(extended);
  await sql.unsafe(extended);
  const strength = await readFile(
    new URL(
      "../packages/database/migrations/014-visitor-profile-strength.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await sql.unsafe(strength);
  await sql.unsafe(strength);
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

test("extended public signals can be shared and reported without publishing browser keys", async () => {
  const { storeProfileEvents, profileInsights, deleteProfileEvents } =
    await import("../packages/database/src/visitorProfile.ts");
  const token = randomBytes(32).toString("hex");
  const events = [
    "project_details_viewed",
    "case_study_viewed",
    "gallery_explored",
    "project_saved",
    "project_unsaved",
    "project_more",
    "project_less",
    "project_neutral",
    "project_returned",
  ].map((kind) => ({ id: randomUUID(), kind, subject: "a" }));
  events.push(
    { id: randomUUID(), kind: "project_section_read", subject: "a|outcomes" },
    { id: randomUUID(), kind: "proof_opened", subject: "a|github" },
    {
      id: randomUUID(),
      kind: "explorer_cluster_selected",
      subject: "engineering",
    },
  );
  try {
    assert.equal(await storeProfileEvents(token, events, sql), true);
    const report = await profileInsights(sql);
    assert.ok(report.events.some((row) => row.kind === "gallery_explored"));
    assert.ok(!JSON.stringify(report).includes(token));
    assert.equal(report.ruleVersion, 3);
  } finally {
    await deleteProfileEvents(token, sql);
  }
});

test("Rules v3 events keep their strength, and sharing is offered only once the table accepts them", async () => {
  const {
    storeProfileEvents,
    deleteProfileEvents,
    profileCollectionAvailable,
  } = await import("../packages/database/src/visitorProfile.ts");
  assert.equal(await profileCollectionAvailable(sql), true);
  const token = randomBytes(32).toString("hex");
  const events = [
    {
      id: randomUUID(),
      kind: "project_card_clicked",
      subject: "a",
      strength: 0.5,
    },
    {
      id: randomUUID(),
      kind: "project_region_viewed",
      subject: "a|needs",
      strength: 0.75,
    },
    { id: randomUUID(), kind: "project_details_viewed", subject: "a" },
  ];
  try {
    assert.equal(await storeProfileEvents(token, events, sql), true);
    const rows =
      await sql`SELECT kind, strength, rule_version FROM visitor_profile_events WHERE event_id IN ${sql(events.map((e) => e.id))} ORDER BY kind`;
    assert.deepEqual(
      rows.map((r) => [r.kind, r.strength, r.rule_version]),
      [
        ["project_card_clicked", 0.5, 3],
        ["project_details_viewed", null, 3],
        ["project_region_viewed", 0.75, 3],
      ],
    );
    await assert.rejects(
      sql`INSERT INTO visitor_profile_events(event_id,session_hash,rule_version,consent_at,kind,subject,strength) VALUES (${randomUUID()},${"b".repeat(64)},3,now(),'project_card_clicked','a',0.3)`,
    );
  } finally {
    await deleteProfileEvents(token, sql);
  }
});
