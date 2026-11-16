import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const { createServiceCircuit } = loadTs(
  new URL(
    "../apps/web/src/server/knowledge/serviceCircuit.ts",
    import.meta.url,
  ),
);
const fallback = { answer: "Explore projects", sources: [], actions: [] };
function setup() {
  let now = 1000;
  return {
    circuit: createServiceCircuit({
      now: () => now,
      requestTimeoutMs: 20,
      probeTimeoutMs: 20,
      cooldownMs: 100,
      maxCooldownMs: 400,
    }),
    advance: (ms) => {
      now += ms;
    },
  };
}
test("a dependency failure latches fallback and bypasses subsequent work", async () => {
  const { circuit } = setup();
  let calls = 0;
  const down = async () => {
    calls++;
    throw new Error("DB offline");
  };
  assert.deepEqual(await circuit.run(down, () => fallback), fallback);
  assert.equal(circuit.status().available, false);
  assert.deepEqual(await circuit.run(down, () => fallback), fallback);
  assert.equal(calls, 1);
});
test("a hanging request is aborted within its response deadline", async () => {
  const { circuit } = setup();
  let signal;
  const started = Date.now();
  const result = await circuit.run(
    (s) => {
      signal = s;
      return new Promise(() => {});
    },
    () => fallback,
  );
  assert.deepEqual(result, fallback);
  assert.equal(signal.aborted, true);
  assert.ok(Date.now() - started < 250);
});
test("fallback stays active until a cooldown probe succeeds and probes coalesce", async () => {
  const { circuit, advance } = setup();
  await circuit.run(
    async () => {
      throw new Error("gateway offline");
    },
    () => fallback,
  );
  let resolve;
  let probes = 0;
  const check = () => {
    probes++;
    return new Promise((r) => {
      resolve = r;
    });
  };
  await circuit.probe(check);
  assert.equal(probes, 0);
  advance(100);
  const first = circuit.probe(check);
  const second = circuit.probe(check);
  assert.equal(probes, 1);
  assert.equal(circuit.status().available, false);
  assert.deepEqual(
    await circuit.run(
      async () => ({ answer: "must not run" }),
      () => fallback,
    ),
    fallback,
  );
  resolve();
  await Promise.all([first, second]);
  assert.equal(circuit.status().available, true);
  assert.equal(circuit.status().verified, true);
  assert.deepEqual(
    await circuit.run(
      async () => ({ answer: "restored" }),
      () => fallback,
    ),
    { answer: "restored" },
  );
});
test("failed probes extend cooldown and timed-out probes cannot later clear the flag", async () => {
  const { circuit, advance } = setup();
  await circuit.run(
    async () => {
      throw new Error("offline");
    },
    () => fallback,
  );
  advance(100);
  let resolve;
  await circuit.probe(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  assert.equal(circuit.status().available, false);
  const retryAt = circuit.status().retryAt;
  resolve();
  await Promise.resolve();
  assert.equal(circuit.status().available, false);
  advance(100);
  await circuit.probe(async () => {
    throw new Error("must not probe too soon");
  });
  assert.equal(circuit.status().retryAt, retryAt);
});
test("visitor quota failures return fallback without opening the shared dependency circuit", async () => {
  const { circuit } = setup();
  const quota = new Error("quota");
  await circuit.run(
    async () => {
      throw quota;
    },
    () => fallback,
    (error) => error !== quota,
  );
  assert.equal(circuit.status().available, true);
});
test("an older successful request cannot erase a newer dependency failure", async () => {
  const { circuit } = setup();
  let resolve;
  const earlier = circuit.run(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
    () => fallback,
  );
  await circuit.run(
    async () => {
      throw new Error("later failure");
    },
    () => fallback,
  );
  resolve({ answer: "old success" });
  await earlier;
  assert.equal(circuit.status().available, false);
});
