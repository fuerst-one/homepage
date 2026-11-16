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

function mountConsent(enabled, decision, run) {
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
  const effects = [];
  const listeners = new Map();
  let restored = null;
  try {
    globalThis.sessionStorage = { removeItem: (key) => sessions.delete(key) };
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
          useState: (initial) => [
            initial,
            (next) => {
              restored = next;
            },
          ],
          useCallback: (callback) => callback,
          useEffect: (effect) => effects.push(effect),
        };
      if (name === "../../lib/knowledgeConsent") return consent;
      if (name === "../../lib/knowledgeHistory") return history;
      throw new Error(`Unexpected import ${name}`);
    });
    exports.useKnowledgeConsent(enabled);
    const cleanups = effects.map((effect) => effect());
    run({ sessions, choices, restored, listeners });
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
