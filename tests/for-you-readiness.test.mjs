import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync } from "node:fs";
import { loadTs } from "./helpers/load-ts.mjs";

const load = (name) => {
  const url = new URL(`../packages/content/src/${name}.ts`, import.meta.url);
  return existsSync(url) ? loadTs(url) : {};
};
const m = load("visitorProfile");
const r = load("forYouReadiness");
const now = Date.UTC(2026, 10, 19);
const DAY = 86400_000;
const need = (value) => ({
  id: `buyerNeeds:${value}`,
  facet: "buyerNeeds",
  value,
});
const catalog = {
  terms: [
    need("A"),
    need("B"),
    need("C"),
    need("D"),
    need("E"),
    need("F"),
    { id: "tools:React", facet: "tools", value: "React" },
    { id: "industries:Health", facet: "industries", value: "Health" },
  ],
  projects: [
    ["ab", ["A", "B"]],
    ["cd", ["C", "D"]],
    ["ef", ["E", "F"]],
    ["onlyA", ["A"]],
    ["onlyB", ["B"]],
    ["onlyC", ["C"]],
  ].map(([id, needs]) => ({
    id,
    name: `Project ${id}`,
    href: `/en/projects/${id}`,
    terms: [...needs.map((value) => `buyerNeeds:${value}`), "tools:React"],
  })),
};
const fresh = () => m.emptyVisitorProfile(now);
const add = (profile, kind, subject, at = now) =>
  m.recordProfileSignal(profile, { kind, subject }, catalog, at);
const ready = (profile, at = now, against = catalog) => {
  assert.equal(typeof r.isForYouReady, "function", "condition is implemented");
  return r.isForYouReady(profile, against, at);
};

test("a fresh profile is not ready", () => {
  assert.equal(ready(fresh()), false);
});
for (const kind of ["filter_selected", "topic_selected"])
  test(`one ${kind} choice of a buyer need is enough`, () => {
    assert.equal(ready(add(fresh(), kind, "buyerNeeds:A")), true);
  });
test("a filter on a tool or an industry is not a buyer need", () => {
  assert.equal(ready(add(fresh(), "filter_selected", "tools:React")), false);
  assert.equal(
    ready(add(fresh(), "filter_selected", "industries:Health")),
    false,
  );
});
test("a manual interest or priority on a buyer need is enough, an exclusion or a return to automatic is not", () => {
  const set = (profile, term, choice, at = now) =>
    m.setProfilePreference(profile, term, choice, catalog, at);
  assert.equal(ready(set(fresh(), "buyerNeeds:A", "interested")), true);
  assert.equal(ready(set(fresh(), "buyerNeeds:A", "priority")), true);
  assert.equal(ready(set(fresh(), "buyerNeeds:A", "exclude")), false);
  const undone = set(
    set(fresh(), "buyerNeeds:A", "priority"),
    "buyerNeeds:A",
    "auto",
    now + 1,
  );
  assert.equal(ready(undone, now + 1), false);
  assert.equal(ready(set(fresh(), "tools:React", "priority")), false);
});
test("three projects read in depth whose needs are spread are not enough", () => {
  let p = fresh();
  for (const id of ["ab", "cd", "ef"]) {
    p = add(p, "project_details_viewed", id);
    p = add(p, "project_read", id);
  }
  assert.equal(ready(p), false);
});
test("a leading need below 4 is not enough, however far ahead", () => {
  assert.equal(ready(add(fresh(), "project_details_viewed", "onlyA")), false);
});
test("a leading need of 4 is enough once it leads the third by 1", () => {
  let p = add(fresh(), "explorer_term_selected", "buyerNeeds:A");
  p = add(p, "project_details_viewed", "onlyB");
  p = add(p, "project_details_viewed", "onlyC");
  assert.equal(ready(p), true);
});
test("a leading need of 4 or more is not enough while the third is within 1", () => {
  let p = fresh();
  for (const value of ["A", "B", "C"])
    p = add(p, "explorer_term_selected", `buyerNeeds:${value}`);
  assert.equal(ready(p), false);
  p = add(p, "filter_selected", "buyerNeeds:A");
  assert.equal(ready(p), true);
});
test("two needs tied at the top pass when the third is far behind", () => {
  let p = add(fresh(), "explorer_term_selected", "buyerNeeds:A");
  p = add(p, "explorer_term_selected", "buyerNeeds:B");
  assert.equal(ready(p), true);
});
test("signals after the evaluated moment do not count yet", () => {
  const p = add(fresh(), "filter_selected", "buyerNeeds:A", now + 1000);
  assert.equal(ready(p, now), false);
  assert.equal(ready(p, now + 1000), true);
});
test("an expired profile is not ready", () => {
  const p = m.setProfilePreference(
    fresh(),
    "buyerNeeds:A",
    "priority",
    catalog,
    now,
  );
  assert.equal(ready(p, now + m.PROFILE_LIFETIME_MS - 1), true);
  assert.equal(ready(p, now + m.PROFILE_LIFETIME_MS), false);
});
test("projects and terms that left the public catalog do not count", () => {
  let depth = add(fresh(), "project_details_viewed", "onlyA");
  depth = add(depth, "project_read", "onlyA");
  assert.equal(ready(depth), true);
  assert.equal(
    ready(depth, now, {
      ...catalog,
      projects: catalog.projects.filter((project) => project.id !== "onlyA"),
    }),
    false,
  );
  const withoutA = {
    ...catalog,
    terms: catalog.terms.filter((term) => term.id !== "buyerNeeds:A"),
  };
  assert.equal(
    ready(add(fresh(), "filter_selected", "buyerNeeds:A"), now, withoutA),
    false,
  );
  assert.equal(
    ready(
      m.setProfilePreference(fresh(), "buyerNeeds:A", "priority", catalog, now),
      now,
      withoutA,
    ),
    false,
  );
});
test("a ready profile is not ready three weeks later; keeping it ready is the store's job", () => {
  const p = add(fresh(), "filter_selected", "buyerNeeds:A");
  assert.equal(ready(p), true);
  assert.equal(ready(p, now + 21 * DAY), false);
});
