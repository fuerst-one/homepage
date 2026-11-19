import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

// Simulated visitors run through the real scoring code against a catalog
// snapshot. The visitor behaviour is an assumption, not traffic data: this
// benchmark holds signal and gate changes to one bar, it does not measure
// real accuracy.
const model = loadTs(
  new URL("../packages/content/src/visitorProfile.ts", import.meta.url),
);
const { isForYouReady } = loadTs(
  new URL("../packages/content/src/forYouReadiness.ts", import.meta.url),
);
const catalog = JSON.parse(
  readFileSync(
    new URL("./fixtures/profile-catalog.json", import.meta.url),
    "utf8",
  ),
);

const START = Date.UTC(2026, 10, 19);
const SIGNAL_STEP_MS = 30_000;
const MAX_PICKS = 8;
const JOURNEYS_PER_NEED = 60;
const MIN_PROJECTS_PER_NEED = 6;
const SEED = 23;

const needsOf = (project) =>
  project.terms.filter((id) => id.startsWith("buyerNeeds:"));
const realNeeds = catalog.terms
  .filter((term) => term.facet === "buyerNeeds")
  .map((term) => term.id)
  .filter(
    (need) =>
      catalog.projects.filter((project) => needsOf(project).includes(need))
        .length >= MIN_PROJECTS_PER_NEED,
  );

const VISITOR_TYPES = {
  "focused, 6 cards": { focus: 0.65, cards: 6 },
  "focused, 12 cards": { focus: 0.65, cards: 12 },
  "loose, 12 cards": { focus: 0.4, cards: 12 },
  "aimless, 12 cards": { focus: 0, cards: 12, aimless: true },
};

function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function journey(need, { focus, cards, aimless }, random) {
  const pick = (items) => items[Math.floor(random() * items.length)];
  const draw = (items, count) => {
    const pool = [...items];
    const drawn = [];
    while (drawn.length < count && pool.length)
      drawn.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
    return drawn;
  };
  let now = START;
  let profile = model.emptyVisitorProfile(now);
  const record = (kind, subject) => {
    now += SIGNAL_STEP_MS;
    profile = model.recordProfileSignal(
      profile,
      { kind, subject },
      catalog,
      now,
    );
  };
  const visited = new Set();
  while (visited.size < MAX_PICKS) {
    const seen = draw(
      catalog.projects.filter((project) => !visited.has(project.id)),
      cards,
    );
    const matching = aimless
      ? []
      : seen.filter((project) => needsOf(project).includes(need));
    const project =
      random() < focus && matching.length ? pick(matching) : pick(seen);
    const deepReadChance = aimless
      ? 0.3
      : needsOf(project).includes(need)
        ? 0.6
        : 0.2;
    const deep = random() < deepReadChance;
    visited.add(project.id);
    record("project_opened", project.id);
    if (deep) {
      record("project_details_viewed", project.id);
      record("project_read", project.id);
    }
    if (isForYouReady(profile, catalog, now)) {
      const topTwo = model
        .profileInterests(profile, catalog, now)
        .filter((interest) => interest.facet === "buyerNeeds")
        .slice(0, 2)
        .map((interest) => interest.id);
      return { projects: visited.size, right: topTwo.includes(need) };
    }
  }
  return null;
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

const results = new Map();
function run(type) {
  if (results.has(type)) return results.get(type);
  const random = seededRandom(SEED);
  const journeys = realNeeds.flatMap((need) =>
    Array.from({ length: JOURNEYS_PER_NEED }, () =>
      journey(need, VISITOR_TYPES[type], random),
    ),
  );
  const fired = journeys.filter(Boolean);
  const result = {
    firesFor: fired.length / journeys.length,
    rightWhenFired: fired.filter((f) => f.right).length / fired.length,
    medianProjects: median(fired.map((f) => f.projects)),
  };
  results.set(type, result);
  return result;
}

const percent = (share) => `${Math.round(share * 100)}%`;
const report = (t, type, { firesFor, rightWhenFired, medianProjects }) =>
  t.diagnostic(
    VISITOR_TYPES[type].aimless
      ? `${type}: fires for ${percent(firesFor)}`
      : `${type}: fires for ${percent(firesFor)}, right when it fires ${percent(rightWhenFired)}, median ${medianProjects} projects viewed`,
  );

test("the catalog snapshot still offers enough real needs to simulate", () => {
  assert.ok(
    realNeeds.length >= 6,
    `${realNeeds.length} buyer needs are carried by ${MIN_PROJECTS_PER_NEED} or more projects`,
  );
});

for (const type of ["focused, 6 cards", "focused, 12 cards"])
  test(`${type}: when the gate fires, the real need is among the top two`, (t) => {
    const result = run(type);
    report(t, type, result);
    assert.ok(
      result.firesFor >= 0.6,
      `fires for ${percent(result.firesFor)} of visitors, expected at least 60%`,
    );
    assert.ok(
      result.rightWhenFired >= 0.75,
      `right ${percent(result.rightWhenFired)} of the time it fires, expected at least 75%`,
    );
  });

for (const type of ["loose, 12 cards", "aimless, 12 cards"])
  test(`${type}: reported only`, (t) => {
    report(t, type, run(type));
  });
