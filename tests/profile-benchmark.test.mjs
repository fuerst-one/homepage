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
const { CARD_BUYER_NEED_COUNT } = loadTs(
  new URL("../packages/content/src/visitorProfileSignals.ts", import.meta.url),
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
// A card shows its leading needs; a visitor recognises a need only there.
const cardNeedsOf = (project) =>
  needsOf(project).slice(0, CARD_BUYER_NEED_COUNT);
const realNeeds = catalog.terms
  .filter((term) => term.facet === "buyerNeeds")
  .map((term) => term.id)
  .filter(
    (need) =>
      catalog.projects.filter((project) => needsOf(project).includes(need))
        .length >= MIN_PROJECTS_PER_NEED,
  );

// Behavioural assumptions, fixed before the Rules v3 numbers were known.
// How long a clicked card was in view: "full" from 3 s, "half" from 0.5 s.
const CLICK_LEVEL_CHANCES = {
  focused: { full: 0.7, half: 0.25, none: 0.05 },
  loose: { full: 0.5, half: 0.4, none: 0.1 },
  aimless: { full: 0.3, half: 0.5, none: 0.2 },
  rapid: { full: 0, half: 0.3, none: 0.7 },
};
// Staying 10 s (or interacting) on the project page the card leads to.
// "wanted": the project carries the visitor's need; "other": it does not.
const STAY_CHANCE = { wanted: 0.8, other: 0.4, aimless: 0.5, rapid: 0 };
// After a stay: the needs block sits below the screenshots, the details table
// at the end of the page.
const NEEDS_IN_VIEW_CHANCE = 0.8;
const DETAILS_IN_VIEW_CHANCE = 0.5;
// A deep read after a stay; times STAY_CHANCE this keeps the Rules v2
// benchmark's deep-read rates (0.6, 0.2 and 0.3 per pick).
const DEEP_READ_CHANCE = { wanted: 0.75, other: 0.5, aimless: 0.6 };

const VISITOR_TYPES = {
  "focused, 6 cards": { focus: 0.65, cards: 6, clicks: "focused" },
  "focused, 12 cards": { focus: 0.65, cards: 12, clicks: "focused" },
  "loose, 12 cards": { focus: 0.4, cards: 12, clicks: "loose" },
  "aimless, 12 cards": {
    focus: 0,
    cards: 12,
    aimless: true,
    clicks: "aimless",
  },
  // Scrolls the list and clicks everything without looking; never stays.
  "rapid clicker": {
    focus: 0,
    cards: 12,
    aimless: true,
    clicks: "rapid",
    rapid: true,
  },
};

function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function journey(need, { focus, cards, aimless, clicks, rapid }, random) {
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
  const record = (kind, subject, strength) => {
    now += SIGNAL_STEP_MS;
    profile = model.recordProfileSignal(
      profile,
      { kind, subject, strength },
      catalog,
      now,
    );
  };
  const clickLevel = () => {
    const { full, half } = CLICK_LEVEL_CHANCES[clicks];
    const roll = random();
    return roll < full ? "full" : roll < full + half ? "half" : "none";
  };
  const visited = new Set();
  while (visited.size < MAX_PICKS) {
    const seen = draw(
      catalog.projects.filter((project) => !visited.has(project.id)),
      cards,
    );
    const matching = aimless
      ? []
      : seen.filter((project) => cardNeedsOf(project).includes(need));
    const project =
      random() < focus && matching.length ? pick(matching) : pick(seen);
    const interest = rapid
      ? "rapid"
      : aimless
        ? "aimless"
        : needsOf(project).includes(need)
          ? "wanted"
          : "other";
    visited.add(project.id);
    const level = clickLevel();
    if (level !== "none")
      record("project_card_clicked", project.id, level === "full" ? 1 : 0.5);
    if (random() < STAY_CHANCE[interest]) {
      const strength = model.profileArrivalStrength(level);
      record("project_details_viewed", project.id, strength);
      if (random() < NEEDS_IN_VIEW_CHANCE)
        record("project_region_viewed", `${project.id}|needs`, strength);
      if (random() < DETAILS_IN_VIEW_CHANCE)
        record("project_region_viewed", `${project.id}|details`, strength);
      if (random() < DEEP_READ_CHANCE[interest])
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

test("rapid clicker: scrolling and clicking everything almost never fires the gate", (t) => {
  const result = run("rapid clicker");
  report(t, "rapid clicker", result);
  assert.ok(
    result.firesFor < 0.05,
    `fires for ${percent(result.firesFor)} of rapid clickers, expected under 5%`,
  );
});
