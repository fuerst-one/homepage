import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const actions = loadTs(
  new URL(
    "../apps/web/src/components/ForYou/forYouActions.ts",
    import.meta.url,
  ),
);
const plan = loadTs(
  new URL("../packages/content/src/forYouPlan.ts", import.meta.url),
);
const needs = ["Make data actionable", "Improve a complex interface"];

test("every allowed action resolves to a labelled link in the page language", () => {
  for (const locale of ["en", "de"])
    for (const id of plan.forYouActionIds(needs)) {
      const link = actions.forYouActionLink(id, locale, needs);
      assert.ok(link, id);
      assert.ok(link.label.trim(), id);
      if (id === "email") assert.match(link.href, /^mailto:/);
      else assert.match(link.href, new RegExp(`^/${locale}/`), id);
    }
});

test("an enquiry keeps service, offer and intent and nothing else", () => {
  const link = actions.forYouActionLink(
    "enquiry:product-interfaces:review:improve",
    "de",
    needs,
  );
  const url = new URL(link.href, "https://fuerst.one");
  assert.equal(url.pathname, "/de/contact");
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    service: "product-interfaces",
    offer: "review",
    intent: "improve",
  });
});

test("a need's filter opens the project list filtered by that need", () => {
  const link = actions.forYouActionLink(
    "projects:Make data actionable",
    "de",
    needs,
  );
  const url = new URL(link.href, "https://fuerst.one");
  assert.equal(url.pathname, "/de/projects");
  assert.equal(url.searchParams.get("buyerNeeds"), "Make data actionable");
  assert.match(link.label, /Daten nutzbar machen/);
});

test("ids outside the allowlist resolve to nothing", () => {
  for (const id of ["https://example.com", "projects:Unknown", "offer:x"])
    assert.equal(actions.forYouActionLink(id, "en", needs), null, id);
});
