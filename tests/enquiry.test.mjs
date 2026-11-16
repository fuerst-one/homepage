import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const {
  parseEnquiry,
  enquiryPath,
  validateStep,
  restoreDraft,
  applyIntent,
  restoreEntry,
  missingProjectDetails,
} = loadTs(new URL("../packages/content/src/enquiry.ts", import.meta.url));
const { submitEnquiry } = loadTs(
  new URL("../packages/database/src/submitEnquiry.ts", import.meta.url),
);
const valid = {
  id: "b15bd005-e801-428b-8681-ae36e8dc90bd",
  locale: "en",
  intent: "production",
  situation: "We have a working prototype and need production ownership.",
  outcome: "A reliable product our team can maintain.",
  productUrl: "https://example.com",
  timing: "Next quarter",
  budget: "Not sure",
  capacity: "",
  duration: "",
  workplace: "",
  name: "Example Buyer",
  email: "buyer@example.com",
  company: "Example",
  website: "",
  context: { source: "home" },
};

test("a project brief is normalized and retains the visitor's context", () => {
  const result = parseEnquiry({
    ...valid,
    email: " buyer@example.com ",
    ignored: "discard",
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.email, "buyer@example.com");
  assert.equal(result.value.intent, "production");
  assert.equal(result.value.context.source, "home");
  assert.equal(result.value.ignored, undefined);
});

test("embedded briefs retain capacity and duration without requiring a project budget", () => {
  const result = parseEnquiry({
    ...valid,
    intent: "team",
    budget: "",
    capacity: "3 days/week",
    duration: "6 months",
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.capacity, "3 days/week");
  assert.equal(result.value.duration, "6 months");
  assert.equal(result.value.budget, "");
});

test("only practical details belonging to the reviewed engagement are saved", () => {
  const project = parseEnquiry({
    ...valid,
    capacity: "hidden capacity",
    duration: "hidden duration",
  });
  assert.equal(project.value.capacity, "");
  assert.equal(project.value.duration, "");
  const team = parseEnquiry({
    ...valid,
    intent: "team",
    budget: "hidden budget",
  });
  assert.equal(team.value.budget, "");
  assert.equal(
    applyIntent({ ...valid, capacity: "3 days" }, "prototype").capacity,
    "",
  );
});

test("reload and language switching preserve a revised intent; a new entry applies its selection", () => {
  const entry = JSON.stringify({
    intent: "production",
    context: { source: "hire" },
  });
  const draft = {
    value: { ...valid, intent: "team", capacity: "3 days", budget: "" },
    step: 4,
    entry,
  };
  const restored = restoreEntry(draft, "de", "production", { source: "hire" });
  assert.equal(restored.value.intent, "team");
  assert.equal(restored.value.locale, "de");
  assert.equal(restored.value.capacity, "3 days");
  assert.equal(restored.step, 4);
  const newEntry = restoreEntry(draft, "en", "prototype", { source: "home" });
  assert.equal(newEntry.value.intent, "prototype");
  assert.equal(newEntry.value.capacity, "");
  assert.equal(newEntry.step, 1);
});

test("new page entries replace stale project/service context while a plain continuation preserves it", () => {
  const previous = { source: "project", projectId: "previous-project" };
  const saved = {
    value: { ...valid, context: previous },
    step: 3,
    entry: JSON.stringify({ intent: "production", context: previous }),
  };
  const next = {
    source: "service",
    service: "ai-automation",
    offer: "assessment",
  };
  assert.deepEqual(
    restoreEntry(saved, "en", "improve", next).value.context,
    next,
  );
  assert.deepEqual(
    restoreEntry(saved, "en", "team", { source: "hire" }).value.context,
    { source: "hire" },
  );
  assert.deepEqual(restoreEntry(saved, "de", "", {}).value.context, previous);
  const service = { ...saved, value: { ...valid, context: next } };
  assert.deepEqual(
    restoreEntry(service, "en", "improve", {
      source: "service",
      service: "product-interfaces",
      offer: "review",
    }).value.context,
    { source: "service", service: "product-interfaces", offer: "review" },
  );
});

test("invalid, oversized, bot and incomplete submissions cannot become leads", () => {
  for (const input of [
    null,
    [],
    {},
    { ...valid, intent: "invented" },
    { ...valid, email: "invalid" },
    { ...valid, locale: "xx" },
    { ...valid, name: "" },
    { ...valid, website: "bot.example" },
    { ...valid, outcome: "x".repeat(4001) },
    { ...valid, productUrl: "javascript:alert(1)" },
    { ...valid, id: "bad" },
  ]) {
    assert.equal(parseEnquiry(input).ok, false);
  }
});

test("each step requires only the information needed at that point", () => {
  assert.equal(validateStep(0, { ...valid, intent: "" }).length > 0, true);
  assert.equal(validateStep(1, { ...valid, email: "" }).length, 0);
  assert.equal(
    validateStep(4, { ...valid, email: "" }).includes("email"),
    true,
  );
  assert.equal(validateStep(3, { ...valid, timing: "", budget: "" }).length, 0);
});

test("context links contain only supported intent/service/project identifiers", () => {
  const path = enquiryPath(
    {
      intent: "team",
      source: "project",
      projectId: "project-1",
      situation: "private brief",
      email: "private@example.com",
      service: "invented",
    },
    "de",
  );
  assert.ok(path.startsWith("/de/contact?"));
  assert.ok(path.includes("intent=team"));
  assert.ok(path.includes("projectId=project-1"));
  assert.doesNotMatch(path, /private|email|invented/);
});

test("draft restoration rejects malformed or expired data", () => {
  const now = 10_000_000;
  const draft = { version: 1, savedAt: now, step: 2, value: valid };
  assert.equal(
    restoreDraft(JSON.stringify(draft), now)?.value.situation,
    valid.situation,
  );
  for (const input of [
    "oops",
    "null",
    JSON.stringify({ ...draft, savedAt: now - 7_200_001 }),
    JSON.stringify({ ...draft, version: 9 }),
    JSON.stringify({ ...draft, step: 80 }),
  ]) {
    assert.equal(restoreDraft(input, now), null);
  }
});

test("save failures never become success; retries reuse the stored receipt", async () => {
  const rows = new Map();
  const store = {
    find: async (id) => rows.get(id),
    create: async (enquiry, fingerprint) => {
      const row = { receipt: enquiry.id, fingerprint };
      rows.set(enquiry.id, row);
      return row;
    },
  };
  const input = parseEnquiry(valid).value;
  assert.equal((await submitEnquiry(input, store)).receipt, valid.id);
  assert.equal((await submitEnquiry(input, store)).receipt, valid.id);
  assert.equal(rows.size, 1);
  await assert.rejects(
    submitEnquiry(
      { ...input, situation: "Changed content under the same receipt." },
      store,
    ),
    /conflict/,
  );
  await assert.rejects(
    submitEnquiry(
      { ...input, id: "b15bd005-e801-428b-8681-ae36e8dc90be" },
      {
        find: async () => undefined,
        create: async () => {
          throw new Error("storage unavailable");
        },
      },
    ),
    /storage unavailable/,
  );
});

test("concurrent same-reference submissions join one receipt or report a conflict", async () => {
  let finish;
  const gate = new Promise((resolve) => {
    finish = resolve;
  });
  const rows = [];
  const store = {
    find: async () => undefined,
    create: async (value, fingerprint) => {
      await gate;
      const row = { receipt: value.id, fingerprint };
      rows.push(row);
      return row;
    },
  };
  const input = parseEnquiry({
    ...valid,
    id: "b15bd005-e801-428b-8681-ae36e8dc90bf",
  }).value;
  const first = submitEnquiry(input, store);
  const retry = submitEnquiry(input, store);
  const different = assert.rejects(
    submitEnquiry(
      { ...input, outcome: "A different result under the same reference." },
      store,
    ),
    /conflict/,
  );
  finish();
  assert.equal((await first).receipt, (await retry).receipt);
  await different;
  assert.equal(rows.length, 1);
});

test("project descriptions are optional and can be shorter than ten characters", () => {
  for (const situation of ["", "  ", "MVP"]) {
    const result = parseEnquiry({ ...valid, situation, outcome: "" });
    assert.equal(result.ok, true);
    assert.equal(result.value.situation, situation.trim());
    assert.equal(result.value.outcome, "");
    assert.deepEqual(validateStep(1, { ...valid, situation, outcome: "" }), []);
  }
});

test("missing project details identify only blank descriptions for the send confirmation", () => {
  assert.deepEqual(missingProjectDetails(valid), []);
  assert.deepEqual(missingProjectDetails({ ...valid, situation: "   " }), [
    "situation",
  ]);
  assert.deepEqual(
    missingProjectDetails({ ...valid, situation: "", outcome: "" }),
    ["situation", "outcome"],
  );
  assert.deepEqual(
    missingProjectDetails({ ...valid, situation: "MVP", outcome: "Ship" }),
    [],
  );
});
