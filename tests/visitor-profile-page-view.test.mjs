import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const tabs = loadTs(
  new URL(
    "../apps/web/src/components/VisitorProfile/profileTabs.ts",
    import.meta.url,
  ),
);
const { PROFILE_FACETS } = loadTs(
  new URL("../packages/content/src/visitorProfile.ts", import.meta.url),
);
const presentation = loadTs(
  new URL(
    "../apps/web/src/components/VisitorProfile/profilePresentation.ts",
    import.meta.url,
  ),
);

test("every section anchor and tab id opens the tab that holds it", () => {
  for (const [hash, tab] of [
    ["#interests", "interests"],
    ["#patterns", "interests"],
    ["#projects", "projects"],
    ["#suggestions", "projects"],
    ["#project-choices", "projects"],
    ["#signals", "signals"],
    ["#activity", "signals"],
    ["#how-it-works", "how-it-works"],
    ["#settings", "settings"],
    ["#profile-privacy", "settings"],
  ])
    assert.equal(tabs.profileTabForHash(hash), tab, hash);
});

test("an empty or unknown hash keeps the current tab", () => {
  assert.equal(tabs.profileTabForHash(""), null);
  assert.equal(tabs.profileTabForHash("#"), null);
  assert.equal(tabs.profileTabForHash("#elsewhere"), null);
});

const interest = (facet, value, score, preference) => ({
  id: `${facet}:${value}`,
  facet,
  value,
  score,
  inferredScore: score,
  preference,
  evidence: [],
});
// profileInterests returns rows by descending score.
const ranked = [
  ...Array.from({ length: 12 }, (_, i) =>
    interest("tools", `Tool ${i}`, 12 - i * 0.5),
  ),
  interest("methods", "Research", 4),
  interest("tools", "Muted", 0, "exclude"),
  interest("methods", "Hidden", 0, "exclude"),
].sort((a, b) => b.score - a.score);

test("the overview shows the strongest interest of each dimension in a fixed order", () => {
  const overview = presentation.topInterests(
    [interest("buyerNeeds", "Automate", 2), ...ranked].sort(
      (a, b) => b.score - a.score,
    ),
    "all",
  );
  assert.deepEqual(
    overview.map((i) => i.value),
    ["Automate", "Research", "Tool 0"],
  );
});

test("a dimension filter shows as many of its strongest interests as the radar has slots", () => {
  const methods = presentation.topInterests(ranked, "methods");
  assert.deepEqual(
    methods.map((i) => i.value),
    ["Research"],
  );
  const tools = presentation.topInterests(ranked, "tools");
  assert.equal(tools.length, PROFILE_FACETS.length);
  assert.ok(tools.every((i) => i.facet === "tools"));
});

test("dimensions without enough scores are filled with their other interests at zero", () => {
  const terms = [
    ["methods", "Research"],
    ["methods", "Hidden"],
    ["methods", "Workshop"],
    ["methods", "Prototyping"],
    ["stages", "Discovery"],
    ["stages", "Launch"],
  ].map(([facet, value]) => ({ id: `${facet}:${value}`, facet, value }));
  const methods = presentation.topInterests(ranked, "methods", terms);
  assert.deepEqual(
    methods.map((i) => [i.value, i.score]),
    [
      ["Research", 4],
      ["Workshop", 0],
      ["Prototyping", 0],
    ],
    "interests marked not relevant are not used as filler",
  );
  const overview = presentation.topInterests(ranked, "all", terms);
  assert.deepEqual(
    overview.map((i) => [i.value, i.score]),
    [
      ["Research", 4],
      ["Tool 0", 12],
      ["Discovery", 0],
    ],
  );
});

const values = (slots) => slots.map((slot) => slot.interest?.value ?? null);

test("the overview gives every dimension its own fixed slot and leaves the rest empty", () => {
  const slots = presentation.radarSlots(
    [interest("methods", "Research", 4), interest("tools", "Tool 0", 12)],
    "all",
  );
  const expected = PROFILE_FACETS.map((facet) =>
    facet === "methods" ? "Research" : facet === "tools" ? "Tool 0" : null,
  );
  assert.deepEqual(values(slots), expected);
});

test("a filtered dimension starts at its overview slot and continues clockwise", () => {
  const start = PROFILE_FACETS.indexOf("tools");
  const slots = presentation.radarSlots(
    presentation.topInterests(ranked, "tools"),
    "tools",
  );
  assert.equal(slots.length, PROFILE_FACETS.length);
  slots.forEach((slot, i) =>
    assert.equal(
      slot.interest?.value,
      `Tool ${(i - start + PROFILE_FACETS.length) % PROFILE_FACETS.length}`,
    ),
  );
  const single = presentation.radarSlots(
    [interest("methods", "Research", 4)],
    "methods",
  );
  assert.deepEqual(
    values(single),
    PROFILE_FACETS.map((facet) => (facet === "methods" ? "Research" : null)),
  );
  assert.ok(
    single.every(({ hue }) => hue === presentation.facetHues.methods),
    "empty slots take the colour of the filtered dimension",
  );
  const overview = presentation.radarSlots([], "all");
  assert.deepEqual(
    overview.map(({ hue }) => hue),
    PROFILE_FACETS.map((facet) => presentation.facetHues[facet]),
  );
});

test("slot values share one fixed scale up to the highest possible score", () => {
  const slots = presentation.radarSlots(
    [interest("tools", "A", 3), interest("tools", "B", 1.5)],
    "tools",
  );
  const start = PROFILE_FACETS.indexOf("tools");
  assert.equal(slots[start].value, 0.25);
  assert.equal(slots[(start + 1) % slots.length].value, 0.125);
  assert.equal(slots[(start + 2) % slots.length].value, 0);
});

test("interests without a score stay off the chart", () => {
  const onlyHidden = [interest("stages", "Hidden stage", 0, "exclude")];
  assert.deepEqual(presentation.topInterests(onlyHidden, "all"), []);
  assert.deepEqual(presentation.topInterests(onlyHidden, "stages"), []);
  const tools = presentation
    .topInterests(ranked, "tools", [], 20)
    .map((i) => i.value);
  assert.ok(!tools.includes("Muted"));
});

const signals = Array.from({ length: 32 }, (_, i) => ({
  id: `s${i}`,
  kind: "project_opened",
  subject: "a",
  at: i,
}));

test("the signal log pages through the whole history, newest first", () => {
  const first = presentation.signalLogPage(signals, 0);
  assert.equal(first.pages, 3);
  assert.equal(first.page, 0);
  assert.equal(first.entries.length, 15);
  assert.equal(first.entries[0].id, "s31");
  const last = presentation.signalLogPage(signals, 2);
  assert.deepEqual(
    last.entries.map((s) => s.id),
    ["s1", "s0"],
  );
});

test("the signal log clamps a page that no longer exists", () => {
  assert.equal(presentation.signalLogPage(signals, 9).page, 2);
  assert.equal(presentation.signalLogPage(signals, -1).page, 0);
  const empty = presentation.signalLogPage([], 3);
  assert.deepEqual(empty, { entries: [], page: 0, pages: 1 });
});

test("profile dimensions carry the same names as the project analysis views", () => {
  const { filterConfigs } = loadTs(
    new URL(
      "../apps/web/src/components/Cv/Projects/filterConfigs.ts",
      import.meta.url,
    ),
  );
  for (const facet of PROFILE_FACETS) {
    const config = filterConfigs.find((c) => c.projectKey === facet);
    assert.ok(config, `${facet} has no analysis view`);
    assert.deepEqual(presentation.facetNames[facet], [
      config.label,
      config.labelDe,
    ]);
  }
});

test("German readers see interests and logged subjects in German", () => {
  const term = {
    id: "buyerNeeds:Make data actionable",
    facet: "buyerNeeds",
    value: "Make data actionable",
  };
  assert.equal(presentation.termLabel(term, "en"), "Make data actionable");
  assert.equal(presentation.termLabel(term, "de"), "Daten nutzbar machen");
  assert.equal(
    presentation.subjectName(
      { kind: "filter_selected", subject: term.id },
      { projects: [], terms: [term] },
      "de",
    ),
    "Daten nutzbar machen",
  );
});

test("product formats read in German like everywhere else on the German site", () => {
  assert.equal(
    presentation.termLabel(
      { id: "productTypes:Web app", facet: "productTypes", value: "Web app" },
      "de",
    ),
    "Webanwendung",
  );
});
