import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { createProfileViewTracker } = loadTs(
  new URL(
    "../apps/web/src/components/VisitorProfile/profileViewTracker.ts",
    import.meta.url,
  ),
);
const active = (now) => ({
  visible: true,
  focused: true,
  lastInteraction: now,
});

function withPage(elements, run, { modal = null } = {}) {
  const globals = new Map(
    ["document", "innerHeight", "innerWidth"].map((k) => [
      k,
      Object.getOwnPropertyDescriptor(globalThis, k),
    ]),
  );
  try {
    globalThis.innerHeight = 1000;
    globalThis.innerWidth = 1000;
    globalThis.document = {
      querySelector: () => modal,
      querySelectorAll: () => elements,
      elementFromPoint: () => elements[0],
    };
    run();
  } finally {
    for (const [key, descriptor] of globals)
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
  }
}
const region = (key, box) => ({
  dataset: { profileRegion: key },
  box,
  getBoundingClientRect() {
    return this.box;
  },
  contains(other) {
    return other === this;
  },
});
const at = (top, height) => ({
  top,
  bottom: top + height,
  left: 0,
  right: 500,
  height,
});

test("a region is in view while at least half of it is visible, and only continuously", () => {
  const card = region("card:a", at(950, 200));
  withPage([card], () => {
    const tracker = createProfileViewTracker(0);
    tracker.measure(0, active(0), false);
    assert.equal(
      tracker.continuousMs("region:card:a", 0),
      0,
      "a quarter is not enough",
    );
    card.box = at(850, 200);
    tracker.measure(100, active(0), false);
    assert.equal(tracker.continuousMs("region:card:a", 600), 500);
    tracker.measure(1100, active(0), true);
    assert.equal(tracker.continuousMs("region:card:a", 3100), 3000);
    card.box = at(-150, 200);
    tracker.measure(3200, active(0), false);
    assert.equal(
      tracker.continuousMs("region:card:a", 3200),
      0,
      "scrolled away",
    );
    card.box = at(100, 200);
    tracker.measure(3300, active(0), false);
    assert.equal(
      tracker.continuousMs("region:card:a", 3500),
      200,
      "a new stretch starts",
    );
  });
});

test("a region taller than the viewport counts once it fills half of the viewport", () => {
  const details = region("project:a|details", at(400, 3000));
  withPage([details], () => {
    const tracker = createProfileViewTracker(0);
    tracker.measure(0, active(0), true);
    assert.equal(tracker.seconds("region:project:a|details"), 1);
    details.box = at(600, 3000);
    tracker.measure(1000, active(0), true);
    assert.equal(tracker.seconds("region:project:a|details"), 1);
  });
});

test("seconds in view count apart from active seconds; a hidden tab or an open dialog adds none", () => {
  const needs = region("project:a|needs", at(100, 100));
  withPage([needs], () => {
    const tracker = createProfileViewTracker(0);
    tracker.measure(1000, active(1000), true);
    tracker.measure(
      70_000,
      { visible: true, focused: true, lastInteraction: 1000 },
      true,
    );
    tracker.measure(
      71_000,
      { visible: true, focused: false, lastInteraction: 70_500 },
      true,
    );
    assert.equal(tracker.seconds("region:project:a|needs"), 3);
    assert.equal(tracker.activeSeconds("region:project:a|needs"), 1);
    tracker.measure(
      72_000,
      { visible: false, focused: false, lastInteraction: 72_000 },
      true,
    );
    assert.equal(tracker.seconds("region:project:a|needs"), 3);
    assert.equal(tracker.continuousMs("region:project:a|needs", 72_000), 0);
  });
  const behind = region("card:b", at(100, 100));
  withPage(
    [behind],
    () => {
      const tracker = createProfileViewTracker(0);
      tracker.measure(0, active(0), true);
      assert.equal(tracker.seconds("region:card:b"), 0);
    },
    { modal: { contains: () => false } },
  );
});

test("restarting an element's clock clears its counts and counts as fresh attention", () => {
  const needs = region("project:a|needs", at(100, 100));
  withPage([needs], () => {
    const tracker = createProfileViewTracker(0);
    tracker.measure(1000, active(1000), true);
    tracker.restart("region:project:a|needs", 90_000);
    assert.equal(tracker.seconds("region:project:a|needs"), 0);
    tracker.measure(
      91_000,
      { visible: true, focused: true, lastInteraction: 1000 },
      true,
    );
    assert.equal(tracker.activeSeconds("region:project:a|needs"), 1);
  });
});

test("a restart also applies to a family of keys and to a key not seen yet", () => {
  const section = {
    ...region("ignored", at(100, 100)),
    dataset: { profileSection: "a|outcomes" },
  };
  const page = {
    ...region("ignored", at(0, 500)),
    dataset: { profileProject: "a" },
  };
  const elements = [section];
  withPage(elements, () => {
    const tracker = createProfileViewTracker(0);
    tracker.measure(1000, active(1000), true);
    assert.equal(tracker.activeSeconds("section:a|outcomes"), 1);
    tracker.restart("section:", 2000);
    assert.equal(tracker.activeSeconds("section:a|outcomes"), 0);
    tracker.restart("project:a", 90_000);
    elements.push(page);
    tracker.measure(
      91_000,
      { visible: true, focused: true, lastInteraction: 1000 },
      true,
    );
    assert.equal(
      tracker.activeSeconds("project:a"),
      1,
      "attention restarts with the project",
    );
    assert.equal(
      tracker.activeSeconds("section:a|outcomes"),
      0,
      "the section's attention is older than a minute",
    );
  });
});
