import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { getAssistantSubmitAction } = loadTs(
  new URL(
    "../apps/web/src/components/PlasmaLanding/getAssistantSubmitAction.ts",
    import.meta.url,
  ),
);
const action = (state) =>
  getAssistantSubmitAction({
    enabled: true,
    available: true,
    chatOpen: false,
    consented: false,
    declined: false,
    reaskable: false,
    ...state,
  });

test("a working assistant asks for permission first, then answers", () => {
  assert.equal(action({}), "consent");
  assert.equal(action({ consented: true }), "ask");
});

test("a released or admitted assistant is required for anything but search", () => {
  assert.equal(
    action({ enabled: false, consented: true, chatOpen: true }),
    "search",
  );
});

test("an unavailable assistant never starts a conversation", () => {
  assert.equal(action({ available: false }), "search");
  assert.equal(action({ available: false, consented: true }), "search");
});

test("an open conversation continues with local suggestions through an outage", () => {
  assert.equal(
    action({ available: false, consented: true, chatOpen: true }),
    "fallback",
  );
});

test("a remembered refusal is questioned once, then left alone", () => {
  assert.equal(action({ declined: true, reaskable: true }), "consent");
  assert.equal(action({ declined: true }), "search");
  assert.equal(
    action({ declined: true, reaskable: true, available: false }),
    "search",
  );
});

test("a refusal that was already questioned is never questioned again, whatever else is on screen", () => {
  assert.equal(action({ declined: true, chatOpen: true }), "search");
  assert.equal(
    action({ declined: true, chatOpen: true, available: false }),
    "search",
  );
});
