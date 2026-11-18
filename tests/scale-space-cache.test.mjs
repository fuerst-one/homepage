import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { scaleSpaceKey, createScaleSpaceCache } = loadTs(
  new URL(
    "../apps/web/src/components/ExperienceAtlas/scaleSpaceCache.ts",
    import.meta.url,
  ),
);
const rows = [
  { id: "b", scale: { complexity: 2, teamLow: 1, teamHigh: 2 } },
  { id: "a", scale: { complexity: 5, teamLow: 3, teamHigh: 8 } },
];
const key = scaleSpaceKey(rows, ["complexity", "team"]);
const result = { result: { space: { ids: ["a", "b"] }, calculationMs: 20 } };
function harness(limit) {
  const jobs = [];
  const cache = createScaleSpaceCache(() => {
    const worker = {
      onmessage: null,
      onerror: null,
      stopped: false,
      postMessage(request) {
        this.request = request;
      },
      terminate() {
        this.stopped = true;
      },
      finish(outcome) {
        this.onmessage({ data: outcome });
      },
    };
    jobs.push(worker);
    return worker;
  }, limit);
  return { cache, jobs };
}

test("equivalent project and field orders reuse a key; measurements, provenance, fields and filters invalidate it", () => {
  assert.equal(
    key,
    scaleSpaceKey([...rows].reverse(), ["team", "complexity", "team"]),
  );
  assert.equal(
    key,
    scaleSpaceKey(
      rows.map((p) => ({
        ...p,
        scale: { ...p.scale, codeMeasuredAt: "2026-11-18" },
      })),
      ["complexity", "team"],
    ),
  );
  assert.notEqual(key, scaleSpaceKey(rows.slice(1), ["complexity", "team"]));
  assert.notEqual(key, scaleSpaceKey(rows, ["complexity"]));
  assert.notEqual(
    key,
    scaleSpaceKey(
      rows.map((p) => ({ ...p, scale: { ...p.scale, complexity: 3 } })),
      ["complexity", "team"],
    ),
  );
  assert.notEqual(
    scaleSpaceKey(
      [
        {
          id: "a",
          scale: {
            effortLow: 1,
            effortHigh: 2,
            effortBasis: "rebuild-estimate",
          },
        },
      ],
      ["effort"],
    ),
    scaleSpaceKey(
      [
        {
          id: "a",
          scale: { effortLow: 1, effortHigh: 2, effortBasis: "unspecified" },
        },
      ],
      ["effort"],
    ),
  );
});

test("a background fit is ready synchronously on revisits without starting another worker", () => {
  const { cache, jobs } = harness();
  let updates = 0;
  const leave = cache.subscribe(key, () => updates++);
  assert.equal(cache.read(key), undefined);
  assert.deepEqual(
    jobs[0].request.projects.map((p) => p.id),
    ["a", "b"],
  );
  jobs[0].finish(result);
  assert.equal(updates, 1);
  assert.equal(cache.read(key), result);
  assert.equal(jobs[0].stopped, true);
  leave();
  const leaveAgain = cache.subscribe(key, () => {});
  assert.equal(cache.read(key), result);
  assert.equal(jobs.length, 1);
  leaveAgain();
});

test("consumers share an in-flight fit and only the last unsubscribe cancels it", () => {
  const { cache, jobs } = harness();
  const first = cache.subscribe(key, () => {});
  const second = cache.subscribe(key, () => {});
  assert.equal(jobs.length, 1);
  first();
  assert.equal(jobs[0].stopped, false);
  second();
  assert.equal(jobs[0].stopped, true);
  const restart = cache.subscribe(key, () => {});
  jobs[0].finish(result);
  assert.equal(
    cache.read(key),
    undefined,
    "a cancelled worker cannot overwrite a restarted fit",
  );
  jobs[1].finish(result);
  assert.equal(cache.read(key), result);
  restart();
});

test("changing the active subset never exposes a previous or late result as the new fit", () => {
  const { cache, jobs } = harness();
  const filteredKey = scaleSpaceKey(rows.slice(1), ["complexity", "team"]);
  const leave = cache.subscribe(key, () => {});
  leave();
  const leaveFiltered = cache.subscribe(filteredKey, () => {});
  jobs[0].finish(result);
  assert.equal(cache.read(filteredKey), undefined);
  const filteredResult = { result: { space: { ids: ["a"] } } };
  jobs[1].finish(filteredResult);
  assert.equal(cache.read(filteredKey), filteredResult);
  leaveFiltered();
});

test("bounded cache evicts old idle fits while retaining the current fit", () => {
  const { cache, jobs } = harness(2);
  const keys = ["complexity", "team", "code"].map((f) =>
    scaleSpaceKey(rows, [f]),
  );
  const current = cache.subscribe(keys[0], () => {});
  jobs[0].finish(result);
  for (let i = 1; i < keys.length; i++) {
    const leave = cache.subscribe(keys[i], () => {});
    jobs[i].finish({ result: { space: { ids: [] } } });
    leave();
  }
  assert.equal(cache.read(keys[0]), result);
  assert.equal(cache.read(keys[1]), undefined);
  assert.ok(cache.read(keys[2]));
  current();
});

test("worker failures finish loading with an error instead of leaving a pending map", () => {
  const { cache, jobs } = harness();
  const leave = cache.subscribe(key, () => {});
  jobs[0].onerror();
  assert.match(cache.read(key).error, /could not start/);
  assert.equal(jobs[0].stopped, true);
  leave();
  const unavailable = createScaleSpaceCache(() => {
    throw new Error("Worker unavailable");
  });
  const stop = unavailable.subscribe(key, () => {});
  assert.match(unavailable.read(key).error, /could not start/);
  stop();
});
