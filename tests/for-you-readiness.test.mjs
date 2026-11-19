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
const HALF_HOUR = 30 * 60_000;
const catalog = {
  terms: [
    { id: "tools:React", facet: "tools", value: "React" },
    { id: "tools:Vue", facet: "tools", value: "Vue" },
    { id: "capabilities:UX", facet: "capabilities", value: "UX" },
  ],
  projects: ["a", "b", "c", "d"].map((id) => ({
    id,
    name: `Project ${id}`,
    href: `/en/projects/${id}`,
    terms: ["tools:React"],
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
test("depth on three distinct projects makes the profile ready, whatever the depth", () => {
  let p = add(fresh(), "project_opened", "a");
  p = add(p, "project_details_viewed", "b");
  assert.equal(ready(p), false);
  p = add(p, "case_study_viewed", "c");
  assert.equal(ready(p), true);
});
test("going deeper into, or returning to, the same project does not count as another project", () => {
  let p = add(fresh(), "project_opened", "a");
  p = add(p, "project_details_viewed", "a");
  p = add(p, "case_study_viewed", "a");
  p = add(p, "project_opened", "a", now + HALF_HOUR);
  p = add(p, "project_opened", "b", now + HALF_HOUR);
  assert.equal(p.signals.length, 5);
  assert.equal(ready(p, now + HALF_HOUR), false);
});
test("activity that is neither depth nor an explicit choice leaves the profile unready", () => {
  let p = fresh();
  for (const id of ["a", "b", "c", "d"]) {
    p = add(p, "project_read", id);
    p = add(p, "project_saved", id);
    p = add(p, "recommendation_opened", id);
  }
  p = add(p, "service_viewed", "ai-products");
  p = add(p, "explorer_lens_selected", "engineering");
  assert.equal(p.signals.length, 14);
  assert.equal(ready(p), false);
});
for (const kind of [
  "filter_selected",
  "topic_selected",
  "explorer_term_selected",
])
  test(`one explicit ${kind} choice is enough`, () => {
    assert.equal(ready(add(fresh(), kind, "tools:Vue")), true);
  });
test("a manual interest or priority is enough, an exclusion or a return to automatic is not", () => {
  const set = (profile, choice, at = now) =>
    m.setProfilePreference(profile, "tools:Vue", choice, catalog, at);
  assert.equal(ready(set(fresh(), "interested")), true);
  assert.equal(ready(set(fresh(), "priority")), true);
  assert.equal(ready(set(fresh(), "exclude")), false);
  const undone = set(set(fresh(), "priority"), "auto", now + 1);
  assert.equal(ready(undone, now + 1), false);
});
test("signals after the evaluated moment do not count yet", () => {
  const p = add(fresh(), "filter_selected", "tools:Vue", now + 1000);
  assert.equal(ready(p, now), false);
  assert.equal(ready(p, now + 1000), true);
});
test("an expired profile is not ready", () => {
  const p = add(fresh(), "filter_selected", "tools:Vue");
  assert.equal(ready(p, now + m.PROFILE_LIFETIME_MS - 1), true);
  assert.equal(ready(p, now + m.PROFILE_LIFETIME_MS), false);
});
test("projects and terms that left the public catalog do not count", () => {
  let depth = fresh();
  for (const id of ["a", "b", "c"]) depth = add(depth, "project_opened", id);
  assert.equal(ready(depth), true);
  assert.equal(
    ready(depth, now, {
      ...catalog,
      projects: catalog.projects.filter((project) => project.id !== "c"),
    }),
    false,
  );
  const withoutVue = {
    ...catalog,
    terms: catalog.terms.filter((term) => term.id !== "tools:Vue"),
  };
  assert.equal(
    ready(add(fresh(), "filter_selected", "tools:Vue"), now, withoutVue),
    false,
  );
  assert.equal(
    ready(
      m.setProfilePreference(fresh(), "tools:Vue", "priority", catalog, now),
      now,
      withoutVue,
    ),
    false,
  );
});
