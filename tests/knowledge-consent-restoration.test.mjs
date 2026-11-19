import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { loadTs } from "./helpers/load-ts.mjs";

const consent = loadTs(
  new URL("../apps/web/src/lib/knowledgeConsent.ts", import.meta.url),
);
const history = loadTs(
  new URL("../apps/web/src/lib/knowledgeHistory.ts", import.meta.url),
);

function mountConsent(enabled, decision, run, { asked = false } = {}) {
  const names = ["sessionStorage", "localStorage", "window"];
  const previous = names.map((name) =>
    Object.getOwnPropertyDescriptor(globalThis, name),
  );
  const sessions = new Map([
    [history.KNOWLEDGE_HISTORY_KEY, "old conversation"],
    [consent.KNOWLEDGE_AVAILABILITY_KEY, "old status"],
  ]);
  const choices = new Map([
    [consent.KNOWLEDGE_CONSENT_KEY, JSON.stringify(decision)],
  ]);
  if (asked) sessions.set(consent.KNOWLEDGE_CONSENT_ASKED_KEY, "1");
  const effects = [];
  const listeners = new Map();
  // State slots in declaration order: the saved decision, then the session's asked marker.
  const states = [];
  try {
    globalThis.sessionStorage = {
      getItem: (key) => sessions.get(key) ?? null,
      removeItem: (key) => sessions.delete(key),
    };
    globalThis.localStorage = {
      getItem: (key) => choices.get(key) ?? null,
      removeItem: (key) => choices.delete(key),
    };
    globalThis.window = {
      addEventListener: (event, fn) => listeners.set(event, fn),
      removeEventListener: (event) => listeners.delete(event),
    };
    const { outputText } = ts.transpileModule(
      readFileSync(
        new URL(
          "../apps/web/src/components/PlasmaLanding/useKnowledgeConsent.ts",
          import.meta.url,
        ),
        "utf8",
      ),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    );
    const exports = {};
    new Function("exports", "require", outputText)(exports, (name) => {
      if (name === "react")
        return {
          useState: (initial) => {
            const slot = states.push(initial) - 1;
            return [
              initial,
              (next) => {
                states[slot] = next;
              },
            ];
          },
          useCallback: (callback) => callback,
          useEffect: (effect) => effects.push(effect),
        };
      if (name === "../../lib/knowledgeConsent") return consent;
      if (name === "../../lib/knowledgeHistory") return history;
      throw new Error(`Unexpected import ${name}`);
    });
    exports.useKnowledgeConsent(enabled);
    const cleanups = effects.map((effect) => effect());
    run({
      sessions,
      choices,
      restored: states[0],
      asked: states[1],
      listeners,
    });
    cleanups.forEach((cleanup) => cleanup?.());
  } finally {
    names.forEach((name, index) => {
      if (previous[index])
        Object.defineProperty(globalThis, name, previous[index]);
      else delete globalThis[name];
    });
  }
}

const decision = (allowed) => ({
  version: consent.KNOWLEDGE_CONSENT_VERSION,
  decidedAt: Date.now(),
  allowed,
  remember: allowed,
});

test("returning after withdrawal in another tab clears the old tab's history and status", () => {
  const declined = decision(false);
  mountConsent(true, declined, ({ sessions, choices, restored }) => {
    assert.deepEqual(restored, declined);
    assert.equal(sessions.size, 0);
    assert.equal(choices.size, 1, "remember the refusal without renewing it");
  });
});

test("an AI-disabled release clears former AI storage and installs no consent listener", () => {
  mountConsent(
    false,
    decision(true),
    ({ sessions, choices, restored, listeners }) => {
      assert.equal(restored, null);
      assert.equal(sessions.size, 0);
      assert.equal(choices.size, 0);
      assert.equal(listeners.size, 0);
    },
  );
});

test("an enabled release preserves history under a current remembered permission", () => {
  const allowed = decision(true);
  mountConsent(true, allowed, ({ sessions, choices, restored }) => {
    assert.deepEqual(restored, allowed);
    assert.equal(sessions.size, 2);
    assert.equal(choices.size, 1);
  });
});

test("pending eligibility leaves saved choices and history untouched and installs no listener", () => {
  mountConsent(
    undefined,
    decision(true),
    ({ sessions, choices, restored, listeners }) => {
      assert.equal(restored, null);
      assert.equal(sessions.size, 2);
      assert.equal(choices.size, 1);
      assert.equal(listeners.size, 0);
    },
  );
});

test("a remembered refusal may be questioned once in a new browser session", () => {
  mountConsent(true, decision(false), ({ asked }) => {
    assert.equal(asked, false);
  });
});

test("a refusal already questioned in this session is not questioned again", () => {
  mountConsent(
    true,
    decision(false),
    ({ asked, sessions }) => {
      assert.equal(asked, true);
      assert.equal(
        sessions.size,
        1,
        "the marker outlives cleared chat and status",
      );
    },
    { asked: true },
  );
});

test("an AI-disabled release also clears the session's asked marker", () => {
  mountConsent(
    false,
    decision(false),
    ({ sessions }) => {
      assert.equal(sessions.size, 0);
    },
    { asked: true },
  );
});
