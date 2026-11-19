import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync } from "node:fs";
import { loadTs } from "./helpers/load-ts.mjs";
const path = new URL(
  "../apps/web/src/components/VisitorProfile/profileStore.ts",
  import.meta.url,
);
const m = existsSync(path) ? loadTs(path) : {};
const catalog = {
  terms: [{ id: "tools:React", facet: "tools", value: "React" }],
  projects: [
    {
      id: "a",
      name: "Atlas",
      href: "/en/projects/atlas",
      terms: ["tools:React"],
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
  const store = m.createVisitorProfileStore(() => storage, fetcher);
  store.getState().initialise(catalog);
  return { store, saved, storage };
}
test("capture and persistence stay off until explicitly enabled", () => {
  const { store, saved } = setup();
  store.getState().record("project_opened", "a");
  assert.equal(store.getState().profile.signals.length, 0);
  assert.equal(saved.size, 0);
  store.getState().start();
  store.getState().record("project_opened", "a");
  assert.equal(store.getState().profile.signals.length, 1);
  assert.equal(store.getState().remember, true);
  assert.equal(store.getState().sharing, false);
  assert.equal(saved.size, 1);
});
test("starting automatically restores interests and choices in a later session", () => {
  const { store, storage } = setup();
  store.getState().start();
  store.getState().record("project_opened", "a");
  store.getState().choose("tools:React", "priority");
  const restored = m.createVisitorProfileStore(() => storage);
  restored.getState().initialise(catalog);
  assert.equal(restored.getState().enabled, true);
  assert.equal(restored.getState().remember, true);
  assert.equal(restored.getState().sharing, false);
  assert.equal(
    restored.getState().profile.preferences["tools:React"],
    "priority",
  );
  assert.equal(restored.getState().profile.signals.length, 2);
});
test("local storage failure leaves the new profile usable and reports the failure", () => {
  const store = m.createVisitorProfileStore(() => ({
    getItem: () => null,
    setItem() {
      throw new Error("blocked");
    },
    removeItem() {},
  }));
  store.getState().initialise(catalog);
  store.getState().start();
  store.getState().record("project_opened", "a");
  assert.equal(store.getState().enabled, true);
  assert.equal(store.getState().storageFailed, true);
  assert.equal(store.getState().remember, false);
  assert.equal(store.getState().profile.signals.length, 1);
});
test("a later quota failure removes the stale profile before falling back to memory", () => {
  const { store, storage, saved } = setup();
  store.getState().start();
  assert.equal(saved.size, 1);
  const write = storage.setItem;
  storage.setItem = () => {
    throw new Error("quota");
  };
  store.getState().choose("tools:React", "priority");
  assert.equal(store.getState().enabled, true);
  assert.equal(store.getState().remember, false);
  assert.equal(store.getState().storageFailed, true);
  assert.equal(saved.size, 0);
  const restored = m.createVisitorProfileStore(() => storage);
  restored.getState().initialise(catalog);
  assert.equal(restored.getState().enabled, false);
  storage.setItem = write;
  store.getState().setRemember(true);
  assert.equal(store.getState().storageFailed, false);
  const retried = m.createVisitorProfileStore(() => storage);
  retried.getState().initialise(catalog);
  assert.equal(
    retried.getState().profile.preferences["tools:React"],
    "priority",
  );
});
test("starting a previously idle tab adopts the existing saved profile", () => {
  const { store, storage } = setup();
  const other = m.createVisitorProfileStore(() => storage);
  other.getState().initialise(catalog);
  store.getState().start();
  store.getState().choose("tools:React", "priority");
  other.getState().start();
  assert.equal(other.getState().profile.preferences["tools:React"], "priority");
  assert.equal(
    other.getState().profile.startedAt,
    store.getState().profile.startedAt,
  );
  store.getState().syncFromStorage();
  assert.equal(store.getState().profile.preferences["tools:React"], "priority");
});
test("starting a previously idle tab respects a pending erasure from another tab", async () => {
  const { store, storage } = setup(async () => ({ ok: false }));
  const other = m.createVisitorProfileStore(() => storage);
  other.getState().initialise(catalog);
  store.getState().start();
  await store.getState().setSharing(true);
  await store.getState().stop();
  other.getState().start();
  assert.equal(other.getState().enabled, false);
  assert.equal(other.getState().deletionToken, store.getState().deletionToken);
  assert.equal(other.getState().network, "delete-error");
});
test("remembering can be disabled without stopping this session", () => {
  const { store, saved } = setup();
  store.getState().start();
  store.getState().setRemember(true);
  assert.equal(saved.size, 1);
  store.getState().setRemember(false);
  assert.equal(saved.size, 0);
  assert.equal(store.getState().enabled, true);
});
test("sharing only queues interactions after its own opt in", async () => {
  const { store } = setup();
  store.getState().start();
  store.getState().record("project_opened", "a");
  await store.getState().setSharing(true);
  assert.equal(store.getState().pending.length, 0);
  store.getState().choose("tools:React", "exclude");
  assert.ok(Math.abs(store.getState().pending[0].inferredScore - 2) < 0.001);
  assert.equal(store.getState().pending[0].previous, "auto");
});
test("successful sends clear only acknowledged events", async () => {
  const { store } = setup();
  store.getState().start();
  await store.getState().setSharing(true);
  store.getState().record("project_opened", "a");
  await store.getState().flush();
  assert.equal(store.getState().pending.length, 0);
  assert.equal(store.getState().network, "shared");
});
test("withdrawal stops capture and reports a failed erasure truthfully", async () => {
  const { store, saved } = setup(async () => ({ ok: false }));
  store.getState().start();
  store.getState().setRemember(true);
  await store.getState().setSharing(true);
  await store.getState().stop();
  assert.equal(store.getState().enabled, false);
  assert.equal(store.getState().sharing, false);
  assert.equal(store.getState().network, "delete-error");
  assert.ok(store.getState().deletionToken);
  assert.ok(!saved.has("fuerst-one:visitor-profile:v1"));
  assert.ok(saved.has("fuerst-one:profile-erasure:v1"));
});

test("remembered pending signals survive reload without backfilling earlier actions", async () => {
  const { store, storage } = setup();
  store.getState().start();
  store.getState().setRemember(true);
  store.getState().record("project_opened", "a");
  await store.getState().setSharing(true);
  store.getState().choose("tools:React", "priority");
  const restored = m.createVisitorProfileStore(() => storage);
  restored.getState().initialise(catalog);
  assert.equal(restored.getState().pending.length, 1);
  assert.equal(restored.getState().pending[0].kind, "preference_changed");
});

test("failed deletion retains its recovery receipt across reload", async () => {
  const { store, storage } = setup(async () => ({ ok: false }));
  store.getState().start();
  store.getState().setRemember(true);
  await store.getState().setSharing(true);
  await store.getState().stop();
  const restored = m.createVisitorProfileStore(() => storage);
  restored.getState().initialise(catalog);
  assert.equal(restored.getState().enabled, false);
  assert.equal(restored.getState().sharing, false);
  assert.equal(restored.getState().network, "delete-error");
  assert.ok(restored.getState().deletionToken);
});

test("a stale tab cannot overwrite a newer manual correction", () => {
  const { store, storage } = setup();
  store.getState().start();
  store.getState().setRemember(true);
  const other = m.createVisitorProfileStore(() => storage);
  other.getState().initialise(catalog);
  store.getState().choose("tools:React", "exclude");
  other.getState().record("project_opened", "a");
  const restored = m.createVisitorProfileStore(() => storage);
  restored.getState().initialise(catalog);
  assert.equal(
    restored.getState().profile.preferences["tools:React"],
    "exclude",
  );
});

test("a stale tab cannot restore consent after another tab stops the profile", async () => {
  const { store, storage, saved } = setup();
  store.getState().start();
  store.getState().setRemember(true);
  await store.getState().setSharing(true);
  const other = m.createVisitorProfileStore(() => storage);
  other.getState().initialise(catalog);
  await store.getState().stop();
  other.getState().record("project_opened", "a");
  assert.equal(other.getState().enabled, false);
  assert.equal(other.getState().sharing, false);
  assert.equal(saved.size, 0);
});

test("a delayed upload response cannot restore withdrawn remembered consent", async () => {
  const { store, storage } = setup();
  store.getState().start();
  store.getState().setRemember(true);
  await store.getState().setSharing(true);
  let complete;
  const other = m.createVisitorProfileStore(
    () => storage,
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  other.getState().initialise(catalog);
  other.getState().record("project_opened", "a");
  const uploading = other.getState().flush();
  await store.getState().stop();
  complete({ ok: true });
  await uploading;
  const restored = m.createVisitorProfileStore(() => storage);
  restored.getState().initialise(catalog);
  assert.equal(restored.getState().enabled, false);
});

test("one memory-only tab cannot erase another tab's failed-erasure receipt", async () => {
  let complete;
  const { store, storage } = setup(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  store.getState().start();
  store.getState().setRemember(false);
  await store.getState().setSharing(true);
  const other = m.createVisitorProfileStore(
    () => storage,
    async () => ({ ok: false }),
  );
  other.getState().initialise(catalog);
  other.getState().start();
  other.getState().setRemember(false);
  await other.getState().setSharing(true);
  const erasing = store.getState().stop();
  await other.getState().stop();
  const otherToken = other.getState().deletionToken;
  complete({ ok: true });
  await erasing;
  other.getState().syncFromStorage();
  assert.equal(other.getState().deletionToken, otherToken);
  const restored = m.createVisitorProfileStore(() => storage);
  restored.getState().initialise(catalog);
  assert.equal(restored.getState().deletionToken, otherToken);
});

test("a manual return to automatic survives activity-log truncation in an idle tab", (t) => {
  let clock = Date.now();
  t.mock.method(Date, "now", () => clock);
  const { store, storage } = setup();
  store.getState().start();
  store.getState().setRemember(true);
  store.getState().choose("tools:React", "exclude");
  const other = m.createVisitorProfileStore(() => storage);
  other.getState().initialise(catalog);
  clock++;
  store.getState().choose("tools:React", "auto");
  for (let i = 0; i < 241; i++) {
    clock += 30 * 60_000;
    store.getState().record("project_opened", "a");
  }
  other.getState().syncFromStorage();
  assert.equal(other.getState().profile.preferences["tools:React"], undefined);
});

test("catalog loading is deduplicated and never opts the visitor in", async () => {
  let calls = 0,
    release;
  const response = new Promise((resolve) => {
    release = resolve;
  });
  const store = m.createVisitorProfileStore(
    () => ({ getItem: () => null, setItem() {}, removeItem() {} }),
    async () => {
      calls++;
      await response;
      return { ok: true, json: async () => catalog };
    },
  );
  const first = store.getState().loadCatalog();
  const second = store.getState().loadCatalog();
  await Promise.resolve();
  assert.equal(calls, 1);
  assert.equal(store.getState().catalogLoading, true);
  release();
  await Promise.all([first, second]);
  assert.equal(store.getState().catalog.projects[0].id, "a");
  assert.equal(store.getState().enabled, false);
  assert.equal(store.getState().catalogLoading, false);
});

test("catalog failures stay retryable without starting capture", async () => {
  let succeeds = false;
  const store = m.createVisitorProfileStore(
    () => ({ getItem: () => null, setItem() {}, removeItem() {} }),
    async () => ({ ok: succeeds, json: async () => catalog }),
  );
  await store.getState().loadCatalog();
  assert.equal(store.getState().catalogFailed, true);
  assert.equal(store.getState().enabled, false);
  succeeds = true;
  await store.getState().loadCatalog();
  assert.equal(store.getState().catalogFailed, false);
  assert.ok(store.getState().catalog);
});

test("synchronous catalog failures can be retried", async () => {
  let succeeds = false;
  const store = m.createVisitorProfileStore(
    () => ({ getItem: () => null, setItem() {}, removeItem() {} }),
    () => {
      if (!succeeds) throw new Error("offline");
      return Promise.resolve({ ok: true, json: async () => catalog });
    },
  );
  await store.getState().loadCatalog();
  assert.equal(store.getState().catalogFailed, true);
  succeeds = true;
  await store.getState().loadCatalog();
  assert.ok(store.getState().catalog);
  assert.equal(store.getState().catalogFailed, false);
});

test("project choices remain off before opt-in and survive reload and stale-tab reconciliation", () => {
  const { store, storage } = setup();
  store.getState().record("project_saved", "a");
  assert.equal(store.getState().profile.projectChoices?.a, undefined);
  store.getState().start();
  store.getState().record("project_saved", "a");
  const other = m.createVisitorProfileStore(() => storage);
  other.getState().initialise(catalog);
  store.getState().record("project_unsaved", "a");
  other.getState().record("project_more", "a");
  assert.equal(other.getState().profile.projectChoices.a.saved, false);
  assert.equal(other.getState().profile.projectChoices.a.feedback, "more");
  const reloaded = m.createVisitorProfileStore(() => storage);
  reloaded.getState().initialise(catalog);
  assert.deepEqual(reloaded.getState().profile.projectChoices.a, {
    saved: false,
    feedback: "more",
  });
});
test("sharing new project actions does not backfill local-only choices", async () => {
  const bodies = [];
  const { store } = setup(async (_url, options) => {
    bodies.push(JSON.parse(options.body));
    return { ok: true };
  });
  store.getState().start();
  store.getState().record("project_saved", "a");
  await store.getState().setSharing(true);
  store.getState().record("project_more", "a");
  await store.getState().flush();
  assert.deepEqual(
    bodies[0].events.map((e) => e.kind),
    ["project_more"],
  );
});

test("newer local project feedback survives reconciliation with an older saved snapshot", () => {
  const { store, storage } = setup();
  store.getState().start();
  const key = "fuerst-one:visitor-profile:v1";
  const old = JSON.parse(storage.getItem(key));
  old.profile.startedAt -= 100;
  old.profile.updatedAt = old.profile.startedAt;
  storage.setItem(key, JSON.stringify(old));
  store.setState({
    profile: {
      ...old.profile,
      updatedAt: Date.now(),
      projectChoices: { a: { saved: true, feedback: "more" } },
      signals: [
        {
          id: crypto.randomUUID(),
          kind: "project_saved",
          subject: "a",
          at: Date.now(),
        },
        {
          id: crypto.randomUUID(),
          kind: "project_more",
          subject: "a",
          at: Date.now(),
        },
      ],
    },
  });
  store.getState().syncFromStorage();
  assert.deepEqual(store.getState().profile.projectChoices.a, {
    saved: true,
    feedback: "more",
  });
});

test("interactions are counted after opt-in, once per accepted signal or manual choice", () => {
  const { store } = setup();
  store.getState().record("project_opened", "a");
  assert.equal(store.getState().interactions, 0);
  store.getState().start();
  assert.equal(store.getState().interactions, 0);
  store.getState().record("project_opened", "a");
  assert.equal(store.getState().interactions, 1);
  store.getState().choose("tools:React", "priority");
  assert.equal(store.getState().interactions, 2);
  // Repeats and unknown subjects change nothing, so they are not interactions.
  store.getState().record("project_opened", "a");
  store.getState().record("project_opened", "missing");
  store.getState().choose("tools:React", "priority");
  assert.equal(store.getState().interactions, 2);
});
test("the interaction count survives reload and outlives the bounded signal history", () => {
  const { store, storage } = setup();
  store.getState().start();
  for (let i = 0; i < 130; i++) {
    store.getState().choose("tools:React", "priority");
    store.getState().choose("tools:React", "auto");
  }
  assert.equal(store.getState().profile.signals.length, 240);
  assert.equal(store.getState().interactions, 260);
  const restored = m.createVisitorProfileStore(() => storage);
  restored.getState().initialise(catalog);
  assert.equal(restored.getState().interactions, 260);
});
test("reset and stop clear the interaction count and memory-only mode keeps counting unsaved", async () => {
  const { store, storage } = setup();
  const key = "fuerst-one:visitor-profile:v1";
  store.getState().start();
  store.getState().record("project_opened", "a");
  await store.getState().reset();
  assert.equal(store.getState().interactions, 0);
  assert.equal(JSON.parse(storage.getItem(key)).interactions, 0);
  store.getState().setRemember(false);
  store.getState().record("project_opened", "a");
  assert.equal(store.getState().interactions, 1);
  assert.equal(storage.getItem(key), null);
  await store.getState().stop();
  assert.equal(store.getState().interactions, 0);
});
test("tabs adopt each other's interactions and keep counting from the shared total", () => {
  const { store, storage } = setup();
  store.getState().start();
  store.getState().record("project_opened", "a");
  const other = m.createVisitorProfileStore(() => storage);
  other.getState().initialise(catalog);
  assert.equal(other.getState().interactions, 1);
  other.getState().choose("tools:React", "priority");
  assert.equal(other.getState().interactions, 2);
  store.getState().choose("tools:React", "exclude");
  assert.equal(store.getState().interactions, 3);
  other.getState().syncFromStorage();
  assert.equal(other.getState().interactions, 3);
});
test("missing or invalid saved interaction counts leave the profile usable", () => {
  const key = "fuerst-one:visitor-profile:v1";
  for (const [savedCount, restoredCount] of [
    [undefined, 0],
    [-1, 0],
    [1.5, 0],
    ["3", 0],
    [null, 0],
    [70000, 65535],
  ]) {
    const { store, storage } = setup();
    store.getState().start();
    const saved = JSON.parse(storage.getItem(key));
    saved.interactions = savedCount;
    storage.setItem(key, JSON.stringify(saved));
    const restored = m.createVisitorProfileStore(() => storage);
    restored.getState().initialise(catalog);
    assert.equal(restored.getState().enabled, true);
    assert.equal(restored.getState().interactions, restoredCount);
  }
});

function savedProfileStorage() {
  const { store, storage } = setup();
  store.getState().start();
  store.getState().record("project_opened", "a");
  return storage;
}
test("a saved profile counts as loading until the catalog has arrived", async () => {
  let release;
  const response = new Promise((resolve) => {
    release = resolve;
  });
  const store = m.createVisitorProfileStore(savedProfileStorage, async () => {
    await response;
    return { ok: true, json: async () => catalog };
  });
  assert.equal(store.getState().loading, false);
  const request = store.getState().loadCatalog();
  assert.equal(store.getState().loading, true);
  assert.equal(store.getState().enabled, false);
  release();
  await request;
  assert.equal(store.getState().loading, false);
  assert.equal(store.getState().enabled, true);
});
test("without a saved profile the catalog loads without a loading state", async () => {
  const store = m.createVisitorProfileStore(
    () => ({ getItem: () => null, setItem() {}, removeItem() {} }),
    async () => ({ ok: true, json: async () => catalog }),
  );
  const request = store.getState().loadCatalog();
  assert.equal(store.getState().catalogLoading, true);
  assert.equal(store.getState().loading, false);
  await request;
  assert.equal(store.getState().loading, false);
});
test("a failed catalog request ends the loading state and a retry shows it again", async () => {
  let succeeds = false;
  const store = m.createVisitorProfileStore(savedProfileStorage, async () => ({
    ok: succeeds,
    json: async () => catalog,
  }));
  await store.getState().loadCatalog();
  assert.equal(store.getState().catalogFailed, true);
  assert.equal(store.getState().loading, false);
  succeeds = true;
  const retry = store.getState().loadCatalog();
  assert.equal(store.getState().loading, true);
  await retry;
  assert.equal(store.getState().loading, false);
  assert.equal(store.getState().enabled, true);
});
test("unreadable browser storage never leaves the profile loading", async () => {
  const store = m.createVisitorProfileStore(
    () => ({
      getItem() {
        throw new Error("blocked");
      },
      setItem() {},
      removeItem() {},
    }),
    async () => ({ ok: true, json: async () => catalog }),
  );
  const request = store.getState().loadCatalog();
  assert.equal(store.getState().loading, false);
  await request;
  assert.equal(store.getState().loading, false);
});
