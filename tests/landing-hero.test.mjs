import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

function clock() {
  let now = 0;
  let id = 0;
  const jobs = new Map();
  return {
    schedule(callback, delay) {
      jobs.set(++id, { callback, at: now + delay });
      return id;
    },
    cancel(id) {
      jobs.delete(id);
    },
    advance(ms) {
      now += ms;
      for (const [id, job] of jobs)
        if (job.at <= now) {
          jobs.delete(id);
          job.callback();
        }
    },
  };
}

function preview() {
  const { createHeroPreviewController } = loadTs(
    new URL(
      "../src/components/PlasmaLanding/createHeroPreviewController.ts",
      import.meta.url,
    ),
  );
  const timer = clock();
  const changes = [];
  const controller = createHeroPreviewController(
    (value) => changes.push(value),
    timer,
  );
  return { timer, changes, controller };
}

test("reset restores the wordmark and allows a new preview immediately", () => {
  const { timer, changes, controller } = preview();
  controller.hold();
  controller.reset();
  assert.deepEqual(changes, [true, false]);
  controller.touch();
  assert.deepEqual(changes, [true, false, true]);
  timer.advance(3000);
  assert.deepEqual(changes, [true, false, true, false]);
});

test("the hero stays on its wordmark until interaction and returns after three idle seconds", () => {
  const { timer, changes, controller } = preview();
  timer.advance(20000);
  assert.deepEqual(changes, []);
  controller.touch();
  assert.deepEqual(changes, [true]);
  timer.advance(2999);
  assert.deepEqual(changes, [true]);
  timer.advance(1);
  assert.deepEqual(changes, [true, false]);
});

test("new interactions restart the idle period without reactivating the icon", () => {
  const { timer, changes, controller } = preview();
  controller.touch();
  timer.advance(2000);
  controller.touch();
  timer.advance(2999);
  assert.deepEqual(changes, [true]);
  timer.advance(1);
  assert.deepEqual(changes, [true, false]);
});

test("dragging holds the icon until release, then starts a fresh idle period", () => {
  const { timer, changes, controller } = preview();
  controller.hold();
  timer.advance(20000);
  assert.deepEqual(changes, [true]);
  controller.release();
  timer.advance(2999);
  assert.deepEqual(changes, [true]);
  timer.advance(1);
  assert.deepEqual(changes, [true, false]);
});

test("disposing a preview cancels pending callbacks and ignores later events", () => {
  const { timer, changes, controller } = preview();
  controller.touch();
  controller.dispose();
  timer.advance(10000);
  controller.touch();
  assert.deepEqual(changes, [true]);
});

test("the homepage includes the public profile portrait with lazy loading and a reserved size", async () => {
  const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";
  const html = await fetch(base).then((response) => response.text());
  const portrait = html.match(
    /<img\b[^>]*alt="Portrait of Alexander Fuerst"[^>]*>/,
  )?.[0];
  assert.ok(portrait, "The about section should include the profile portrait");
  assert.match(portrait, /loading="lazy"/);
  assert.match(portrait, /width="240"/);
  assert.match(portrait, /height="240"/);
  assert.match(portrait, /srcset=/i);
});

test("responsive metrics use the same initial render before browser hydration", async () => {
  const React = await import("react");
  const { renderToString } = await import("react-dom/server");
  const { useResponsiveMetrics } = loadTs(
    new URL(
      "../src/components/Plasma/useResponsiveMetrics.ts",
      import.meta.url,
    ),
  );
  const previous = globalThis.window;
  const Metrics = () => JSON.stringify(useResponsiveMetrics());
  try {
    delete globalThis.window;
    const server = renderToString(React.createElement(Metrics));
    globalThis.window = { innerWidth: 390 };
    assert.equal(renderToString(React.createElement(Metrics)), server);
  } finally {
    globalThis.window = previous;
  }
});
