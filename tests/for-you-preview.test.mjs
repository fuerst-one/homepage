import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const load = (name) =>
  loadTs(new URL(`../packages/content/src/${name}.ts`, import.meta.url));
const preview = load("forYouPreview");
const plan = load("forYouPlan");
const m = load("visitorProfile");
const catalog = JSON.parse(
  readFileSync(new URL("./fixtures/profile-catalog.json", import.meta.url)),
);
const now = Date.UTC(2026, 10, 20);
const LEAD = "Automate repetitive work";
const RUNNER_UP = "Make data actionable";
const add = (profile, kind, subject, at = now) =>
  m.recordProfileSignal(profile, { kind, subject }, catalog, at);
const twoNeeds = () =>
  add(
    add(m.emptyVisitorProfile(now), "topic_selected", `buyerNeeds:${LEAD}`),
    "explorer_term_selected",
    `buyerNeeds:${RUNNER_UP}`,
  );
const allImages = () =>
  Object.fromEntries(catalog.projects.map((p) => [p.id, [`${p.id}#1`]]));
const build = (profile, options = {}) =>
  preview.buildForYouPreview({
    profile,
    catalog,
    images: allImages(),
    locale: "en",
    termLabel: (term) => term.value,
    now,
    ...options,
  });
const section = (sections, type) => sections.find((s) => s.type === type);
const ranked = (profile) =>
  m.recommendProfileProjects(profile, catalog, now).map((r) => r.project.id);
const needs = catalog.terms
  .filter((term) => term.facet === "buyerNeeds")
  .map((term) => term.value);

test("the preview leads with the leading need and ends at the Explorer", () => {
  const sections = build(twoNeeds());
  assert.deepEqual(
    sections.map((s) => s.type),
    ["hero", "proofGrid", "secondNeed", "closing"],
  );
  const hero = section(sections, "hero");
  assert.match(hero.headline, new RegExp(LEAD));
  assert.equal(hero.action, `projects:${LEAD}`);
  assert.equal(section(sections, "closing").action, "explorer");
});

test("every section passes the section check against the candidates", () => {
  const profile = add(twoNeeds(), "project_opened", ranked(twoNeeds())[0]);
  const opened = preview.forYouOpenedProjects(profile, catalog);
  const context = {
    projects: catalog.projects.map((p) => ({
      id: p.id,
      opened: opened.has(p.id),
      images: [`${p.id}#1`],
    })),
    faqIds: [],
    needs,
  };
  const accepted = [];
  for (const s of build(profile)) {
    const result = plan.checkForYouSection(s, context, accepted);
    assert.equal(result.ok, true, `${s.type}: ${result.reason}`);
    accepted.push(result.section);
  }
});

test("the proof grid holds the best-ranked unopened projects with a screenshot", () => {
  const profile = twoNeeds();
  const [first, second, third] = ranked(profile);
  const withOpened = add(profile, "project_opened", first);
  const images = allImages();
  images[second] = [];
  const grid = section(build(withOpened, { images }), "proofGrid");
  const ids = grid.items.map((item) => item.projectId);
  assert.equal(ids.includes(first), false, "opened project left out");
  assert.equal(ids.includes(second), false, "project without image left out");
  assert.equal(ids[0], third);
  assert.ok(ids.length >= 2 && ids.length <= 4);
  for (const item of grid.items) assert.ok(item.fit.trim());
});

test("opening a project in any way counts, being shown a suggestion does not", () => {
  const id = ranked(twoNeeds())[0];
  for (const [kind, subject] of [
    ["project_details_viewed", id],
    ["project_region_viewed", `${id}|needs`],
    ["recommendation_opened", id],
  ])
    assert.ok(
      preview
        .forYouOpenedProjects(add(twoNeeds(), kind, subject), catalog)
        .has(id),
      kind,
    );
  assert.equal(
    preview
      .forYouOpenedProjects(
        add(twoNeeds(), "recommendation_shown", id),
        catalog,
      )
      .has(id),
    false,
  );
});

test("the fit line names the terms a project shares with the profile", () => {
  const grid = section(build(twoNeeds()), "proofGrid");
  assert.match(grid.items[0].fit, new RegExp(LEAD));
});

test("terms of every facet are named with the labels the page supplies", () => {
  const profile = add(
    twoNeeds(),
    "filter_selected",
    "capabilities:AI Engineering",
  );
  const sections = build(profile, {
    termLabel: (term) => `${term.facet}=${term.value}`,
  });
  assert.match(
    section(sections, "hero").headline,
    new RegExp(`buyerNeeds=${LEAD}`),
  );
  assert.match(
    section(sections, "secondNeed").heading,
    new RegExp(`buyerNeeds=${RUNNER_UP}`),
  );
  assert.match(
    section(sections, "proofGrid")
      .items.map((item) => item.fit)
      .join("\n"),
    /capabilities=AI Engineering/,
  );
});

test("a proof grid needs two qualifying projects, or it is left out", () => {
  const profile = twoNeeds();
  const images = Object.fromEntries(
    catalog.projects.map((p) => [
      p.id,
      p.id === ranked(profile)[0] ? ["x#1"] : [],
    ]),
  );
  const sections = build(profile, { images });
  assert.equal(section(sections, "proofGrid"), undefined);
  assert.equal(section(sections, "hero").type, "hero");
});

test("the second need shows one or two projects that are not in the proof grid", () => {
  const sections = build(twoNeeds());
  const grid = section(sections, "proofGrid").items.map((i) => i.projectId);
  const second = section(sections, "secondNeed");
  assert.equal(second.need, RUNNER_UP);
  assert.ok(second.projectIds.length >= 1 && second.projectIds.length <= 2);
  for (const id of second.projectIds) {
    assert.equal(grid.includes(id), false);
    const project = catalog.projects.find((p) => p.id === id);
    assert.ok(project.terms.includes(`buyerNeeds:${RUNNER_UP}`));
  }
});

test("without a runner-up need the second-need section is left out", () => {
  const only = add(
    m.emptyVisitorProfile(now),
    "topic_selected",
    `buyerNeeds:${LEAD}`,
  );
  assert.equal(section(build(only), "secondNeed"), undefined);
});

test("a profile without a leading need gives no preview", () => {
  assert.deepEqual(build(m.emptyVisitorProfile(now)), []);
});

test("the copy follows the language", () => {
  const sections = build(twoNeeds(), { locale: "de" });
  assert.match(section(sections, "hero").lead, /\b(du|dein|deinem)\b/i);
  assert.match(section(sections, "proofGrid").heading, /noch nicht/);
  const en = build(twoNeeds());
  assert.notEqual(
    section(en, "closing").heading,
    section(sections, "closing").heading,
  );
});
