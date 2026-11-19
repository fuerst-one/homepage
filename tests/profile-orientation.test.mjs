import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const m = loadTs(
  new URL(
    "../apps/web/src/components/VisitorProfile/profileStore.ts",
    import.meta.url,
  ),
);
const key = "fuerst-one:visitor-profile:v1";
const catalog = { terms: [], projects: [], sharingAvailable: true };
function setup() {
  const saved = new Map();
  const storage = {
    getItem: (k) => saved.get(k) ?? null,
    setItem: (k, v) => saved.set(k, v),
    removeItem: (k) => saved.delete(k),
  };
  const store = m.createVisitorProfileStore(() => storage);
  store.getState().initialise(catalog);
  return { store, storage, saved };
}
test("orientation begins only after opt-in and freezes at the first activation", () => {
  const { store, saved } = setup();
  assert.equal(typeof store.getState().setOrientation, "function");
  store.getState().setOrientation(90);
  assert.equal(store.getState().orientation, null);
  assert.equal(saved.size, 0);
  store.getState().start();
  store.getState().setOrientation(90);
  store.getState().setOrientation(180);
  assert.equal(store.getState().orientation, 90);
  assert.equal(store.getState().profile.signals.length, 0);
  assert.equal(store.getState().pending.length, 0);
});
test("orientation restores with the remembered profile and reconciles across tabs", () => {
  const { store, storage } = setup();
  store.getState().start();
  const other = m.createVisitorProfileStore(() => storage);
  other.getState().initialise(catalog);
  store.getState().setOrientation(315);
  other.getState().setOrientation(45);
  assert.equal(other.getState().orientation, 315);
  const restored = m.createVisitorProfileStore(() => storage);
  restored.getState().initialise(catalog);
  assert.equal(restored.getState().orientation, 315);
});
test("reset, stop and memory-only mode follow existing profile controls", async () => {
  const { store, storage } = setup();
  store.getState().start();
  store.getState().setOrientation(45);
  await store.getState().reset();
  assert.equal(store.getState().orientation, null);
  store.getState().setOrientation(180);
  store.getState().setRemember(false);
  assert.equal(storage.getItem(key), null);
  assert.equal(store.getState().orientation, 180);
  await store.getState().stop();
  assert.equal(store.getState().orientation, null);
});
test("legacy and invalid saved angles leave an otherwise valid profile usable", () => {
  for (const angle of [undefined, -45, 360, 12, "90", null]) {
    const { store, storage } = setup();
    store.getState().start();
    const saved = JSON.parse(storage.getItem(key));
    saved.orientation = angle;
    storage.setItem(key, JSON.stringify(saved));
    const restored = m.createVisitorProfileStore(() => storage);
    restored.getState().initialise(catalog);
    assert.equal(restored.getState().enabled, true);
    assert.equal(restored.getState().orientation, null);
  }
});

test("a remembered reset clears the old angle in another open tab", async () => {
  const { store, storage } = setup();
  store.getState().start();
  store.getState().setOrientation(135);
  const other = m.createVisitorProfileStore(() => storage);
  other.getState().initialise(catalog);
  await store.getState().reset();
  other.getState().syncFromStorage();
  assert.equal(other.getState().orientation, null);
  other.getState().setOrientation(225);
  store.getState().syncFromStorage();
  assert.equal(store.getState().orientation, 225);
});
test("invalid angles never seed an active profile", () => {
  const { store } = setup();
  store.getState().start();
  for (const value of [-1, 360, 22.5, NaN, "90", null])
    store.getState().setOrientation(value);
  assert.equal(store.getState().orientation, null);
});
