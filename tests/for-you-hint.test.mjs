import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync } from "node:fs";
import { loadTs } from "./helpers/load-ts.mjs";
const path = new URL(
  "../apps/web/src/components/VisitorProfile/profileStore.ts",
  import.meta.url,
);
const m = existsSync(path) ? loadTs(path) : {};
const { isForYouReady } = loadTs(
  new URL("../packages/content/src/forYouReadiness.ts", import.meta.url),
);
const key = "fuerst-one:visitor-profile:v1";
const need = "buyerNeeds:Automate repetitive work";
const catalog = {
  terms: [
    { id: "tools:React", facet: "tools", value: "React" },
    { id: need, facet: "buyerNeeds", value: "Automate repetitive work" },
  ],
  projects: [
    {
      id: "a",
      name: "Atlas",
      href: "/en/projects/atlas",
      terms: ["tools:React", need],
    },
  ],
  sharingAvailable: true,
};
function setup(fetcher = async () => ({ ok: true })) {
  assert.equal(typeof m.createVisitorProfileStore, "function");
  const saved = new Map();
  const storage = {
    getItem: (k) => saved.get(k) ?? null,
    setItem: (k, v) => saved.set(k, v),
    removeItem: (k) => saved.delete(k),
  };
  const open = () => {
    const store = m.createVisitorProfileStore(() => storage, fetcher);
    store.getState().initialise(catalog);
    return store;
  };
  return { store: open(), open, storage };
}
function markSeen(store) {
  assert.equal(
    typeof store.getState().markForYouHintSeen,
    "function",
    "the hint state is implemented",
  );
  store.getState().markForYouHintSeen();
}
const unlock = (store) => store.getState().record("filter_selected", need);

test("the hint starts unseen and cannot be marked before opt-in", () => {
  const { store, storage } = setup();
  assert.equal(store.getState().forYouHintSeen, false);
  markSeen(store);
  assert.equal(store.getState().forYouHintSeen, false);
  assert.equal(storage.getItem(key), null);
  store.getState().start();
  assert.equal(store.getState().forYouHintSeen, false);
});
test("a seen hint is remembered for later sessions", () => {
  const { store, open, storage } = setup();
  store.getState().start();
  markSeen(store);
  assert.equal(store.getState().forYouHintSeen, true);
  assert.equal(JSON.parse(storage.getItem(key)).forYouHintSeen, true);
  assert.equal(open().getState().forYouHintSeen, true);
});
test("marking the hint seen is not an interaction, a signal or a shared event", async () => {
  const { store } = setup();
  store.getState().start();
  await store.getState().setSharing(true);
  store.getState().record("project_opened", "a");
  const before = store.getState();
  markSeen(store);
  const after = store.getState();
  assert.equal(after.forYouHintSeen, true);
  assert.deepEqual(after.profile, before.profile);
  assert.equal(after.interactions, before.interactions);
  assert.deepEqual(after.pending, before.pending);
});
test("without remembering the seen hint stays in this tab only", () => {
  const { store, open, storage } = setup();
  store.getState().start();
  store.getState().setRemember(false);
  markSeen(store);
  assert.equal(store.getState().forYouHintSeen, true);
  assert.equal(storage.getItem(key), null);
  assert.equal(open().getState().forYouHintSeen, false);
  store.getState().setRemember(true);
  assert.equal(open().getState().forYouHintSeen, true);
});
test("reset and stop make the hint available again", async () => {
  const { store, storage } = setup();
  store.getState().start();
  markSeen(store);
  await store.getState().reset();
  assert.equal(store.getState().forYouHintSeen, false);
  assert.equal(JSON.parse(storage.getItem(key)).forYouHintSeen, false);
  markSeen(store);
  await store.getState().stop();
  assert.equal(store.getState().forYouHintSeen, false);
  assert.equal(storage.getItem(key), null);
});
test("an expired profile forgets the seen hint", (t) => {
  let clock = Date.now();
  t.mock.method(Date, "now", () => clock);
  const { store, open } = setup();
  store.getState().start();
  markSeen(store);
  clock += 30 * 86400_000;
  store.getState().record("project_opened", "a");
  assert.equal(store.getState().enabled, false);
  assert.equal(store.getState().forYouHintSeen, false);
  const later = open();
  assert.equal(later.getState().enabled, false);
  assert.equal(later.getState().forYouHintSeen, false);
});
test("a hint dismissed in one tab is dismissed in the others", () => {
  const { store, open } = setup();
  store.getState().start();
  const other = open();
  assert.equal(other.getState().forYouHintSeen, false);
  markSeen(store);
  other.getState().syncFromStorage();
  assert.equal(other.getState().forYouHintSeen, true);
});
test("an out-of-date snapshot from another tab cannot bring the hint back", () => {
  const { store, storage } = setup();
  store.getState().start();
  markSeen(store);
  const stale = JSON.parse(storage.getItem(key));
  stale.forYouHintSeen = false;
  storage.setItem(key, JSON.stringify(stale));
  store.getState().syncFromStorage();
  assert.equal(store.getState().forYouHintSeen, true);
  store.getState().record("project_opened", "a");
  assert.equal(JSON.parse(storage.getItem(key)).forYouHintSeen, true);
});
test("a reset in another tab makes the hint available here as well", async (t) => {
  let clock = Date.now();
  t.mock.method(Date, "now", () => clock);
  const { store, open } = setup();
  store.getState().start();
  markSeen(store);
  const other = open();
  clock += 1000;
  await other.getState().reset();
  store.getState().syncFromStorage();
  assert.equal(store.getState().forYouHintSeen, false);
});
test("earlier saved profiles and invalid values restore with the hint unseen", () => {
  for (const [savedValue, restored] of [
    [undefined, false],
    ["true", false],
    [1, false],
    [null, false],
    [true, true],
  ]) {
    const { store, open, storage } = setup();
    store.getState().start();
    const saved = JSON.parse(storage.getItem(key));
    saved.forYouHintSeen = savedValue;
    storage.setItem(key, JSON.stringify(saved));
    const later = open();
    assert.equal(later.getState().enabled, true);
    assert.equal(later.getState().forYouHintSeen, restored);
  }
});

test("the profile unlocks For you the first time the gate passes", () => {
  const { store, storage } = setup();
  store.getState().start();
  assert.equal(store.getState().forYouUnlocked, false);
  store.getState().record("project_opened", "a");
  assert.equal(store.getState().forYouUnlocked, false);
  unlock(store);
  assert.equal(store.getState().forYouUnlocked, true);
  assert.equal(JSON.parse(storage.getItem(key)).forYouUnlocked, true);
});
test("an unlocked profile stays unlocked after its scores decay", (t) => {
  let clock = Date.now();
  t.mock.method(Date, "now", () => clock);
  const { store, open } = setup();
  store.getState().start();
  unlock(store);
  clock += 21 * 86400_000;
  store.getState().record("project_opened", "a");
  assert.equal(isForYouReady(store.getState().profile, catalog, clock), false);
  assert.equal(store.getState().forYouUnlocked, true);
  assert.equal(open().getState().forYouUnlocked, true);
});
test("reset and stop lock For you again", async () => {
  const { store, storage } = setup();
  store.getState().start();
  unlock(store);
  await store.getState().reset();
  assert.equal(store.getState().forYouUnlocked, false);
  assert.equal(JSON.parse(storage.getItem(key)).forYouUnlocked, false);
  unlock(store);
  assert.equal(store.getState().forYouUnlocked, true);
  await store.getState().stop();
  assert.equal(store.getState().forYouUnlocked, false);
  assert.equal(storage.getItem(key), null);
});
test("an expired profile locks For you again", (t) => {
  let clock = Date.now();
  t.mock.method(Date, "now", () => clock);
  const { store, open } = setup();
  store.getState().start();
  unlock(store);
  clock += 30 * 86400_000;
  store.getState().record("project_opened", "a");
  assert.equal(store.getState().enabled, false);
  assert.equal(store.getState().forYouUnlocked, false);
  assert.equal(open().getState().forYouUnlocked, false);
});
test("without remembering the unlock stays in this tab only", () => {
  const { store, open, storage } = setup();
  store.getState().start();
  store.getState().setRemember(false);
  unlock(store);
  assert.equal(store.getState().forYouUnlocked, true);
  assert.equal(storage.getItem(key), null);
  assert.equal(open().getState().forYouUnlocked, false);
  store.getState().setRemember(true);
  assert.equal(JSON.parse(storage.getItem(key)).forYouUnlocked, true);
});
test("an unlock in one tab reaches the others and a stale snapshot cannot undo it", () => {
  const { store, open, storage } = setup();
  store.getState().start();
  const other = open();
  unlock(store);
  other.getState().syncFromStorage();
  assert.equal(other.getState().forYouUnlocked, true);
  const stale = JSON.parse(storage.getItem(key));
  stale.forYouUnlocked = false;
  stale.profile.signals = [];
  storage.setItem(key, JSON.stringify(stale));
  store.getState().syncFromStorage();
  assert.equal(store.getState().forYouUnlocked, true);
});
test("a restored profile that already passes the gate is unlocked", () => {
  for (const [savedValue, passes, restored] of [
    [undefined, true, true],
    ["true", true, true],
    [undefined, false, false],
    ["true", false, false],
    [true, false, true],
  ]) {
    const { store, open, storage } = setup();
    store.getState().start();
    if (passes) unlock(store);
    const saved = JSON.parse(storage.getItem(key));
    saved.forYouUnlocked = savedValue;
    storage.setItem(key, JSON.stringify(saved));
    const later = open();
    assert.equal(later.getState().enabled, true);
    assert.equal(later.getState().forYouUnlocked, restored);
  }
});
