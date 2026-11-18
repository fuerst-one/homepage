import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { loadTs } from "./helpers/load-ts.mjs";
const require = createRequire(
  new URL("../apps/web/package.json", import.meta.url),
);

test("duplicate visible annotations still require fifteen seconds per subject", () => {
  const react = require("react");
  const store = loadTs(
    new URL(
      "../apps/web/src/components/VisitorProfile/profileStore.ts",
      import.meta.url,
    ),
  );
  const previous = {
    effect: react.useEffect,
    getState: store.useVisitorProfileStore.getState,
    record: store.recordVisitorInteraction,
  };
  const globals = new Map(
    [
      "window",
      "document",
      "innerHeight",
      "innerWidth",
      "setInterval",
      "clearInterval",
    ].map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]),
  );
  let tick, cleanup;
  const recorded = [];
  try {
    react.useEffect = (effect) => {
      cleanup = effect();
    };
    store.useVisitorProfileStore.getState = () => ({ enabled: true });
    store.recordVisitorInteraction = (...args) => recorded.push(args);
    globalThis.setInterval = (cb) => {
      tick = cb;
      return 1;
    };
    globalThis.clearInterval = () => {};
    globalThis.innerHeight = globalThis.innerWidth = 1000;
    globalThis.window = { addEventListener() {}, removeEventListener() {} };
    const elements = [0, 100].map((y) => ({
      dataset: { profileSection: "a|outcomes" },
      getBoundingClientRect: () => ({
        top: y,
        bottom: y + 90,
        left: 0,
        right: 100,
        height: 90,
      }),
      contains(other) {
        return other === this;
      },
    }));
    globalThis.document = {
      visibilityState: "visible",
      hasFocus: () => true,
      activeElement: null,
      querySelector: () => null,
      querySelectorAll: () => elements,
      elementFromPoint: (_x, y) => elements[y < 100 ? 0 : 1],
    };
    const runtime = loadTs(
      new URL(
        "../apps/web/src/components/VisitorProfile/useRichProfileSignals.ts",
        import.meta.url,
      ),
    );
    runtime.useRichProfileSignals("/en/projects/a", true);
    for (let i = 0; i < 14; i++) tick();
    assert.deepEqual(recorded, []);
    tick();
    assert.deepEqual(recorded, [["project_section_read", "a|outcomes"]]);
    tick();
    assert.equal(recorded.length, 1);
  } finally {
    cleanup?.();
    react.useEffect = previous.effect;
    store.useVisitorProfileStore.getState = previous.getState;
    store.recordVisitorInteraction = previous.record;
    for (const [key, descriptor] of globals)
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
  }
});
