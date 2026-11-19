import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync } from "node:fs";
import { loadTs } from "./helpers/load-ts.mjs";

const url = new URL(
  "../packages/content/src/visitorProfile.ts",
  import.meta.url,
);
const m = existsSync(url) ? loadTs(url) : {};
const now = Date.UTC(2026, 10, 18);
const catalog = {
  terms: [
    { id: "tools:React", facet: "tools", value: "React" },
    { id: "tools:Vue", facet: "tools", value: "Vue" },
    { id: "capabilities:UX", facet: "capabilities", value: "UX" },
  ],
  projects: [
    {
      id: "a",
      name: "Atlas",
      href: "/en/projects/atlas",
      terms: ["tools:React", "tools:Vue", "capabilities:UX"],
    },
    {
      id: "b",
      name: "Studio",
      href: "/en/projects/studio",
      terms: ["tools:React"],
    },
  ],
};
function fresh() {
  assert.equal(
    typeof m.emptyVisitorProfile,
    "function",
    "profile model is implemented",
  );
  return m.emptyVisitorProfile(now);
}
function add(p, kind = "project_opened", subject = "a", at = now) {
  return m.recordProfileSignal(p, { kind, subject }, catalog, at);
}
// Under Rules v3 a case study is the page signal that still credits every term.
const read = (p) => add(p, "case_study_viewed");
function score(p, id, at = now) {
  return (
    m.profileInterests(p, catalog, at).find((x) => x.id === id)
      ?.inferredScore ?? 0
  );
}

test("a fresh profile does not invent interests", () => {
  assert.deepEqual(m.profileInterests(fresh(), catalog, now), []);
});
test("a project splits its signal across tags within each dimension", () => {
  const p = read(fresh());
  assert.equal(score(p, "tools:React"), 2);
  assert.equal(score(p, "capabilities:UX"), 4);
});
test("duplicate delivery and repeated opens cannot inflate a visit", () => {
  const p = add(fresh());
  assert.deepEqual(add(p), p);
  assert.equal(add(p, "project_opened", "a", now + 1000).signals.length, 1);
  assert.equal(
    add(p, "project_opened", "a", now + 30 * 60_000).signals.length,
    2,
  );
});
test("explicit filters outweigh a casual project open", () => {
  const p = add(add(fresh()), "filter_selected", "tools:Vue");
  assert.ok(score(p, "tools:Vue") > score(p, "capabilities:UX"));
});
test("unknown projects, terms and event types cannot create interests", () => {
  const p = fresh();
  for (const [kind, subject] of [
    ["project_opened", "private"],
    ["filter_selected", "tools:secret"],
    ["invented", "a"],
  ])
    assert.deepEqual(add(p, kind, subject), p);
});
test("inferred interests decay with a seven day half life", () => {
  const p = read(fresh());
  assert.equal(score(p, "tools:React", now + 7 * 86400_000), 1);
});
test("manual rejection wins over strong inferred interest", () => {
  const p = m.setProfilePreference(
    read(fresh()),
    "tools:React",
    "exclude",
    catalog,
    now,
  );
  const interest = m
    .profileInterests(p, catalog, now)
    .find((x) => x.id === "tools:React");
  assert.equal(interest.score, 0);
  assert.equal(interest.preference, "exclude");
  assert.equal(interest.inferredScore, 2);
});
test("removing a manual preference restores the underlying evidence", () => {
  const p = m.setProfilePreference(
    read(fresh()),
    "tools:React",
    "priority",
    catalog,
    now,
  );
  assert.equal(m.profileInterests(p, catalog, now)[0].score, 12);
  const restored = m.setProfilePreference(
    p,
    "tools:React",
    "auto",
    catalog,
    now,
  );
  assert.equal(score(restored, "tools:React"), 2);
  assert.equal(restored.preferences["tools:React"], undefined);
});
test("correction feedback records the inference before the visitor changes it", () => {
  const p = read(fresh());
  const feedback = m
    .setProfilePreference(p, "tools:React", "exclude", catalog, now)
    .signals.at(-1);
  assert.equal(feedback.inferredScore, 2);
  assert.equal(feedback.previous, "auto");
  assert.equal(feedback.basis.case_study_viewed, 2);
  assert.equal(feedback.preference, "exclude");
});
test("recommendations explain matches and respect explicit exclusions", () => {
  let p = m.setProfilePreference(
    fresh(),
    "tools:React",
    "priority",
    catalog,
    now,
  );
  assert.equal(m.recommendProfileProjects(p, catalog, now)[0].project.id, "a");
  p = m.setProfilePreference(p, "tools:Vue", "exclude", catalog, now);
  const recs = m.recommendProfileProjects(p, catalog, now);
  assert.deepEqual(
    recs.map((x) => x.project.id),
    ["b"],
  );
  assert.equal(recs[0].reasons[0].id, "tools:React");
});
test("recommendation impressions do not manufacture interest", () => {
  const p = add(fresh(), "recommendation_shown", "a");
  assert.equal(p.signals.length, 1);
  assert.deepEqual(m.profileInterests(p, catalog, now), []);
});
test("restoration rejects expired and malformed profiles", () => {
  assert.equal(
    m.restoreVisitorProfile(
      { ...fresh(), startedAt: now - 31 * 86400_000 },
      catalog,
      now,
    ),
    null,
  );
  assert.equal(
    m.restoreVisitorProfile({ ...fresh(), signals: "invalid" }, catalog, now),
    null,
  );
  assert.equal(
    m.restoreVisitorProfile(
      { ...fresh(), preferences: { "tools:React": "hacked" } },
      catalog,
      now,
    ),
    null,
  );
});
test("restoration drops metadata that is no longer publicly available", () => {
  const p = add(fresh());
  const restored = m.restoreVisitorProfile(p, { terms: [], projects: [] }, now);
  assert.deepEqual(restored.signals, []);
});
test("reading time stops in hidden, unfocused or idle pages", () => {
  for (const state of [
    { visible: false, focused: true, lastInteraction: now },
    { visible: true, focused: false, lastInteraction: now },
    { visible: true, focused: true, lastInteraction: now - 61_000 },
  ])
    assert.equal(m.isActiveProfileReading(state, now), false);
  assert.equal(
    m.isActiveProfileReading(
      { visible: true, focused: true, lastInteraction: now - 5000 },
      now,
    ),
    true,
  );
});
test("sharing rejects free text and only accepts known public subjects", () => {
  fresh();
  const body = {
    version: 1,
    consentAt: now,
    token: "a".repeat(64),
    events: [
      {
        id: "12345678-1234-4234-8234-123456789012",
        kind: "project_opened",
        subject: "a",
      },
    ],
  };
  assert.ok(m.parseProfileEventBatch(body, catalog, now));
  assert.equal(
    m.parseProfileEventBatch(
      { ...body, query: "my private query" },
      catalog,
      now,
    ),
    null,
  );
  assert.equal(
    m.parseProfileEventBatch(
      { ...body, events: [{ ...body.events[0], subject: "private" }] },
      catalog,
      now,
    ),
    null,
  );
  assert.equal(
    m.parseProfileEventBatch(
      { ...body, events: [{ ...body.events[0], text: "secret" }] },
      catalog,
      now,
    ),
    null,
  );
});

test("sharing needs a current, separate consent receipt", () => {
  const body = {
    version: 1,
    token: "a".repeat(64),
    events: [
      {
        id: "12345678-1234-4234-8234-123456789012",
        kind: "project_opened",
        subject: "a",
      },
    ],
  };
  assert.equal(m.parseProfileEventBatch(body, catalog, now), null);
  assert.equal(
    m.parseProfileEventBatch(
      { ...body, consentAt: now - 31 * 86400_000 },
      catalog,
      now,
    ),
    null,
  );
  assert.equal(
    m.parseProfileEventBatch(
      { ...body, consentAt: now + 86400_000 },
      catalog,
      now,
    ),
    null,
  );
});

test("page signals use the actual page rather than stale dialog focus", () => {
  assert.deepEqual(m.profilePageSignal("/en/projects/studio", "a", catalog), {
    kind: "project_details_viewed",
    subject: "b",
  });
  assert.deepEqual(
    m.profilePageSignal("/de/services/ai-automation", "a", catalog),
    { kind: "service_viewed", subject: "ai-automation" },
  );
  assert.equal(m.profilePageSignal("/en/contact", "a", catalog), null);
  assert.deepEqual(m.profilePageSignal("/de/projects", "a", catalog), {
    kind: "project_opened",
    subject: "a",
  });
  assert.deepEqual(
    m.profilePageSignal("/en/projects/atlas/case-study", null, catalog),
    { kind: "case_study_viewed", subject: "a" },
  );
});

test("manual preferences cannot extend an expired profile", () => {
  const p = fresh();
  assert.deepEqual(
    m.setProfilePreference(
      p,
      "tools:React",
      "priority",
      catalog,
      now + 31 * 86400_000,
    ),
    p,
  );
});

test("only explicit same-site project category links supply filter signals", () => {
  assert.deepEqual(
    m.profileLinkSignals(
      "/en/projects?tools=React&private=secret",
      "https://fuerst.one",
      catalog,
    ),
    [{ kind: "filter_selected", subject: "tools:React" }],
  );
  assert.deepEqual(
    m.profileLinkSignals(
      "https://elsewhere.example/en/projects?tools=React",
      "https://fuerst.one",
      catalog,
    ),
    [],
  );
  assert.deepEqual(
    m.profileLinkSignals(
      "/en/contact?tools=React",
      "https://fuerst.one",
      catalog,
    ),
    [],
  );
  assert.deepEqual(
    m.profileLinkSignals(
      "/en/projects?tools=unknown",
      "https://fuerst.one",
      catalog,
    ),
    [],
  );
});
test("restoration skips signal kinds from a newer release", () => {
  const p = add(fresh());
  const newer = {
    id: crypto.randomUUID(),
    kind: "signal_from_a_newer_release",
    subject: "a",
    at: now,
  };
  const restored = m.restoreVisitorProfile(
    { ...p, signals: [...p.signals, newer] },
    catalog,
    now,
  );
  assert.deepEqual(restored.signals, p.signals);
});
test("restoration tolerates a clock that moved back by a few minutes", () => {
  const recordedAt = (offset) =>
    add(
      m.emptyVisitorProfile(now + offset),
      "project_opened",
      "a",
      now + offset,
    );
  assert.notEqual(
    m.restoreVisitorProfile(recordedAt(60_000), catalog, now),
    null,
  );
  assert.equal(
    m.restoreVisitorProfile(recordedAt(86400_000), catalog, now),
    null,
  );
});
test("sharing accepts consent from a visitor clock a few minutes ahead of the server", () => {
  const body = {
    version: 1,
    token: "a".repeat(64),
    events: [
      {
        id: "12345678-1234-4234-8234-123456789012",
        kind: "project_opened",
        subject: "a",
      },
    ],
  };
  const consentedAt = (offset) =>
    m.parseProfileEventBatch(
      { ...body, consentAt: now + offset },
      catalog,
      now,
    );
  assert.notEqual(consentedAt(60_000), null);
  assert.equal(consentedAt(86400_000), null);
});
