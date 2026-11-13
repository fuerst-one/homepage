import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const moduleUrl = new URL(
  "../src/components/Plasma/GL/createProgram.ts",
  import.meta.url,
);

function context({ parallel = true, linked = true } = {}) {
  const queries = [];
  const deleted = [];
  let complete = false;
  const gl = {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    LINK_STATUS: 3,
    createShader: () => ({}),
    shaderSource() {},
    compileShader() {},
    createProgram: () => ({}),
    attachShader() {},
    linkProgram() {},
    getExtension: () => (parallel ? { COMPLETION_STATUS_KHR: 4 } : null),
    getProgramParameter(_, status) {
      queries.push(status);
      return status === 4 ? complete : linked;
    },
    getProgramInfoLog: () => "invalid shader",
    deleteShader(shader) {
      deleted.push(shader);
    },
    deleteProgram(program) {
      deleted.push(program);
    },
  };
  return {
    gl,
    queries,
    deleted,
    complete: () => {
      complete = true;
    },
  };
}

test("shader compilation waits without asking for blocking link status", async () => {
  const { createProgram } = loadTs(moduleUrl);
  const ctx = context();
  let frame;
  const original = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = (callback) => {
    frame = callback;
    return 1;
  };
  try {
    const controller = new AbortController();
    const pending = createProgram(
      ctx.gl,
      "vertex",
      "fragment",
      controller.signal,
    );
    assert.deepEqual(ctx.queries, [4]);
    ctx.complete();
    frame();
    assert.ok(await pending);
    assert.deepEqual(ctx.queries, [4, 4, 3]);
    assert.equal(ctx.deleted.length, 2);
  } finally {
    globalThis.requestAnimationFrame = original;
  }
});

test("unsupported parallel compilation still produces a linked program", async () => {
  const { createProgram } = loadTs(moduleUrl);
  const ctx = context({ parallel: false });
  assert.ok(
    await createProgram(
      ctx.gl,
      "vertex",
      "fragment",
      new AbortController().signal,
    ),
  );
  assert.deepEqual(ctx.queries, [3]);
});

test("aborting initialization cancels polling and releases shaders and program", async () => {
  const { createProgram } = loadTs(moduleUrl);
  const ctx = context();
  const originals = [
    globalThis.requestAnimationFrame,
    globalThis.cancelAnimationFrame,
  ];
  globalThis.requestAnimationFrame = () => 42;
  let cancelled;
  globalThis.cancelAnimationFrame = (id) => {
    cancelled = id;
  };
  try {
    const controller = new AbortController();
    const pending = createProgram(
      ctx.gl,
      "vertex",
      "fragment",
      controller.signal,
    );
    controller.abort();
    await assert.rejects(pending, { name: "AbortError" });
    assert.equal(cancelled, 42);
    assert.equal(ctx.deleted.length, 3);
    assert.deepEqual(ctx.queries, [4]);
  } finally {
    [globalThis.requestAnimationFrame, globalThis.cancelAnimationFrame] =
      originals;
  }
});

test("link failures release every created shader and program", async () => {
  const { createProgram } = loadTs(moduleUrl);
  const ctx = context({ parallel: false, linked: false });
  await assert.rejects(
    createProgram(ctx.gl, "vertex", "fragment", new AbortController().signal),
    /invalid shader/,
  );
  assert.equal(ctx.deleted.length, 3);
});
