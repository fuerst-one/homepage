import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const m = loadTs(
  new URL("../packages/content/src/visitorProfile.ts", import.meta.url),
);
const now = Date.UTC(2026, 10, 18);
const terms = [
  ["buyerNeeds", "Automate repetitive work"],
  ["tools", "React"],
  ["tools", "Vue"],
  ["methods", "Research"],
  ["stages", "Production"],
  ["capabilities", "Integration"],
  ["industries", "Retail"],
  ["productTypes", "Web app"],
].map(([facet, value]) => ({ id: `${facet}:${value}`, facet, value }));
const catalog = {
  terms,
  projects: ["a", "b", "c"].map((id, i) => ({
    id,
    name: id.toUpperCase(),
    href: `/en/projects/${id}`,
    terms: terms
      .filter(
        (t) => t.facet !== "tools" || t.value === (i === 0 ? "React" : "Vue"),
      )
      .map((t) => t.id),
  })),
};
const fresh = () => m.emptyVisitorProfile(now);
const add = (p, kind, subject = "a", at = now) =>
  m.recordProfileSignal(p, { kind, subject }, catalog, at);
const score = (p, id, at = now) =>
  m.profileInterests(p, catalog, at).find((t) => t.id === id)?.inferredScore ??
  0;

test("preview to details to case study counts only the strongest project depth", () => {
  let p = add(fresh(), "project_opened");
  p = add(p, "project_details_viewed", "a", now + 1);
  p = add(p, "case_study_viewed", "a", now + 2);
  assert.equal(p.signals.length, 3);
  assert.equal(Math.round(score(p, "tools:React", now + 2)), 4);
});
test("section reading attributes only the relevant facets", () => {
  const outcomes = add(fresh(), "project_section_read", "a|outcomes");
  assert.equal(score(outcomes, "buyerNeeds:Automate repetitive work"), 2);
  assert.equal(score(outcomes, "tools:React"), 0);
  const architecture = add(fresh(), "project_section_read", "a|architecture");
  assert.equal(score(architecture, "tools:React"), 2);
  assert.equal(score(architecture, "industries:Retail"), 0);
  assert.equal(
    add(fresh(), "project_section_read", "a|invented").signals.length,
    0,
  );
});
test("gallery and proof clicks strengthen project affinity without inventing topical interests", () => {
  let p = add(fresh(), "gallery_explored");
  p = add(p, "proof_opened", "a|github");
  assert.equal(p.signals.length, 2);
  assert.deepEqual(m.profileInterests(p, catalog, now), []);
  assert.equal(m.recommendProfileProjects(p, catalog, now)[0].project.id, "a");
});
test("service pages distinguish offers from collaboration and reject arbitrary paths", () => {
  assert.deepEqual(
    m.profilePageSignal("/de/services/ai-automation/assessment", null, catalog),
    { kind: "service_offer_viewed", subject: "ai-automation" },
  );
  assert.deepEqual(
    m.profilePageSignal(
      "/en/services/ai-products/collaboration",
      null,
      catalog,
    ),
    { kind: "service_collaboration_viewed", subject: "ai-products" },
  );
  assert.equal(
    m.profilePageSignal("/en/services/ai-products/made-up", null, catalog),
    null,
  );
});
test("topic chips and explorer clusters use known terms and lens choice creates no tool assumptions", () => {
  const p = add(fresh(), "topic_selected", "tools:React");
  assert.equal(score(p, "tools:React"), 6);
  assert.equal(
    score(
      add(fresh(), "explorer_term_selected", "methods:Research"),
      "methods:Research",
    ),
    4,
  );
  assert.equal(
    add(fresh(), "explorer_lens_selected", "engineering").signals.length,
    1,
  );
  assert.deepEqual(
    m.profileInterests(
      add(fresh(), "explorer_lens_selected", "engineering"),
      catalog,
      now,
    ),
    [],
  );
});
test("related links reinforce only shared needs and methods", () => {
  const p = add(fresh(), "related_project_opened", "a|b");
  assert.equal(score(p, "buyerNeeds:Automate repetitive work"), 2);
  assert.equal(score(p, "tools:React"), 0);
  assert.equal(add(fresh(), "related_project_opened", "a|a").signals.length, 0);
});
test("returning project signal needs a prior visit at least a day earlier", () => {
  const p = add(fresh(), "project_opened");
  assert.equal(m.isReturningProfileProject(p, "a", now + 3600_000), false);
  assert.equal(m.isReturningProfileProject(p, "a", now + 86400_000), true);
  const returned = add(p, "project_returned", "a", now + 86400_000);
  assert.equal(
    m.isReturningProfileProject(returned, "a", now + 86400_000 + 1),
    false,
  );
});
test("saved projects and more-like-this feedback stay independent", () => {
  let p = add(fresh(), "project_saved");
  p = add(p, "project_more", "a", now + 1);
  p = add(p, "project_unsaved", "a", now + 2);
  assert.deepEqual(p.projectChoices.a, { saved: false, feedback: "more" });
  p = add(p, "project_neutral", "a", now + 3);
  assert.deepEqual(p.projectChoices.a, { saved: false, feedback: "auto" });
});
test("less-like-this is no longer a new profile action", () => {
  const p = fresh();
  assert.deepEqual(add(p, "project_less"), p);
});
test("old negative project feedback restores as automatic", () => {
  const p = {
    ...fresh(),
    projectChoices: { a: { saved: true, feedback: "less" } },
  };
  assert.deepEqual(m.restoreVisitorProfile(p, catalog, now).projectChoices.a, {
    saved: true,
    feedback: "auto",
  });
});
test("project choices survive history truncation and restore without resurrecting removed public projects", () => {
  let p = add(fresh(), "project_saved");
  for (let i = 1; i <= 245; i++)
    p = add(p, "project_opened", "b", now + i * 1800_000);
  assert.equal(p.signals.length, 240);
  assert.equal(
    m.restoreVisitorProfile(p, catalog, p.updatedAt).projectChoices.a.saved,
    true,
  );
  assert.deepEqual(
    m.restoreVisitorProfile(p, { terms, projects: [] }, p.updatedAt)
      .projectChoices,
    {},
  );
});
test("shared need patterns use distinct recently read projects and add only one bounded boost", () => {
  let p = fresh();
  for (const id of ["a", "b", "c"])
    p = add(p, "project_section_read", `${id}|outcomes`);
  const patterns = m.profilePatterns(p, catalog, now);
  const need = patterns.find((x) => x.kind === "shared_need");
  assert.equal(need.projectIds.length, 3);
  assert.equal(score(p, "buyerNeeds:Automate repetitive work"), 8);
  assert.equal(score(p, "industries:Retail"), 0);
  assert.equal(
    m
      .profilePatterns(p, catalog, now + 8 * 86400_000)
      .filter((x) => x.kind === "shared_need").length,
    0,
  );
});
test("proof preference requires distinct projects and does not claim an identity", () => {
  let p = add(fresh(), "proof_opened", "a|github");
  assert.equal(
    m
      .profilePatterns(p, catalog, now)
      .filter((x) => x.kind === "implementation_proof").length,
    0,
  );
  p = add(p, "proof_opened", "b|github");
  assert.equal(
    m
      .profilePatterns(p, catalog, now)
      .filter((x) => x.kind === "implementation_proof").length,
    1,
  );
});
test("engagement consideration requires the case-study, collaboration and enquiry in that order", () => {
  let p = add(fresh(), "case_study_viewed");
  p = add(p, "service_collaboration_viewed", "ai-automation", now + 1);
  p = add(p, "enquiry_started", "enquiry", now + 2);
  assert.ok(
    m
      .profilePatterns(p, catalog, now + 2)
      .some((x) => x.kind === "engagement_consideration"),
  );
  let reverse = add(fresh(), "enquiry_started", "enquiry");
  reverse = add(
    reverse,
    "service_collaboration_viewed",
    "ai-automation",
    now + 1,
  );
  reverse = add(reverse, "case_study_viewed", "a", now + 2);
  assert.ok(
    !m
      .profilePatterns(reverse, catalog, now + 2)
      .some((x) => x.kind === "engagement_consideration"),
  );
});
test("section classification recognises public bilingual headings and leaves unknown prose unclassified", () => {
  assert.equal(
    m.profileSectionKind("Architecture & integrations"),
    "architecture",
  );
  assert.equal(m.profileSectionKind("Ergebnisse und Wirkung"), "outcomes");
  assert.equal(m.profileSectionKind("How we worked"), "process");
  assert.equal(m.profileSectionKind("Rollout und Betrieb"), "delivery");
  assert.equal(m.profileSectionKind("An interesting chapter"), null);
});
test("sharing accepts the new public subjects and rejects raw queries, URLs and unknown subjects", () => {
  const batch = (kind, subject) => ({
    version: 1,
    token: "a".repeat(64),
    consentAt: now,
    events: [{ id: crypto.randomUUID(), kind, subject }],
  });
  for (const [kind, subject] of [
    ["project_section_read", "a|outcomes"],
    ["proof_opened", "a|github"],
    ["related_project_opened", "a|b"],
    ["project_saved", "a"],
    ["topic_selected", "tools:React"],
    ["explorer_lens_selected", "engineering"],
  ])
    assert.ok(m.parseProfileEventBatch(batch(kind, subject), catalog, now));
  for (const [kind, subject] of [
    ["proof_opened", "https://secret.example"],
    ["project_section_read", "a|private text"],
    ["topic_selected", "my typed query"],
    ["explorer_lens_selected", "unknown"],
  ])
    assert.equal(
      m.parseProfileEventBatch(batch(kind, subject), catalog, now),
      null,
    );
});

test("section reading requires enough visible active seconds and does not count hidden or covered content", () => {
  assert.equal(typeof m.advanceProfileReading, "function");
  let seconds = 0;
  const state = { visible: true, focused: true, lastInteraction: now };
  for (let i = 0; i < 14; i++)
    seconds = m.advanceProfileReading(
      seconds,
      { ...state, inView: true, covered: false },
      now + i * 1000,
    );
  assert.equal(seconds, 14);
  seconds = m.advanceProfileReading(
    seconds,
    { ...state, inView: false, covered: false },
    now + 14000,
  );
  assert.equal(seconds, 14);
  seconds = m.advanceProfileReading(
    seconds,
    { ...state, inView: true, covered: true },
    now + 15000,
  );
  assert.equal(seconds, 14);
  assert.equal(
    m.advanceProfileReading(
      seconds,
      { ...state, inView: true, covered: false },
      now + 16000,
    ),
    15,
  );
});

test("every recorded signal has a readable bilingual explanation", () => {
  const presentation = loadTs(
    new URL(
      "../apps/web/src/components/VisitorProfile/profilePresentation.ts",
      import.meta.url,
    ),
  );
  for (const kind of Object.keys(m.SIGNAL_WEIGHTS)) {
    assert.ok(
      presentation.signalNames[kind]?.[0],
      `English explanation for ${kind}`,
    );
    assert.ok(
      presentation.signalNames[kind]?.[1],
      `German explanation for ${kind}`,
    );
  }
  assert.equal(
    presentation.subjectName(
      { kind: "proof_opened", subject: "a|github" },
      catalog,
      "en",
    ),
    "A · Implementation evidence",
  );
});

test("compound shared subjects reject empty separators and arbitrary suffixes", () => {
  for (const [kind, subject] of [
    ["project_section_read", "a|outcomes"],
    ["proof_opened", "a|github"],
    ["related_project_opened", "a|b"],
    ["service_section_read", "ai-products|commercial"],
  ])
    for (const suffix of [
      "|",
      "||visitor@example.com",
      "||https://secret.example",
    ]) {
      const batch = {
        version: 1,
        token: "a".repeat(64),
        consentAt: now,
        events: [{ id: crypto.randomUUID(), kind, subject: subject + suffix }],
      };
      assert.equal(
        m.parseProfileEventBatch(batch, catalog, now),
        null,
        `${kind} rejects ${suffix}`,
      );
    }
});
test("opening case studies alone does not become a pattern of read needs", () => {
  const p = add(
    add(fresh(), "case_study_viewed", "a"),
    "case_study_viewed",
    "b",
  );
  assert.ok(
    !m.profilePatterns(p, catalog, now).some((p) => p.kind === "shared_need"),
  );
});

test("deliberate lens transitions preserve the latest perspective when returning to a recent lens", () => {
  let p = add(fresh(), "explorer_lens_selected", "engineering");
  p = add(p, "explorer_lens_selected", "product", now + 1);
  p = add(p, "explorer_lens_selected", "engineering", now + 2);
  assert.equal(
    m
      .profilePatterns(p, catalog, now + 2)
      .find((x) => x.kind === "explorer_perspective").subject,
    "engineering",
  );
});

test("retired negative action history does not discard saved projects", () => {
  const p = {
    ...fresh(),
    signals: [
      { id: crypto.randomUUID(), at: now, kind: "project_less", subject: "a" },
    ],
    projectChoices: { a: { saved: true, feedback: "less" } },
  };
  const restored = m.restoreVisitorProfile(p, catalog, now);
  assert.ok(restored);
  assert.deepEqual(restored.signals, []);
  assert.deepEqual(restored.projectChoices.a, {
    saved: true,
    feedback: "auto",
  });
});

test("a region key names where, and the region function says which terms it displays", () => {
  const { profileRegionTerms, CARD_BUYER_NEED_COUNT } = loadTs(
    new URL(
      "../packages/content/src/visitorProfileSignals.ts",
      import.meta.url,
    ),
  );
  const regionTerms = [
    ["industries", "Retail"],
    ["productTypes", "Web app"],
    ["buyerNeeds", "Launch a new product"],
    ["buyerNeeds", "Automate repetitive work"],
    ["buyerNeeds", "Make data actionable"],
    ["capabilities", "Integration"],
    ["methods", "Research"],
    ["tools", "React"],
    ["stages", "Production"],
  ].map(([facet, value]) => ({ id: `${facet}:${value}`, facet, value }));
  const regions = {
    terms: regionTerms,
    projects: [
      {
        id: "a",
        name: "A",
        href: "/en/projects/a",
        terms: regionTerms.map((t) => t.id),
      },
    ],
  };
  const ids = (region) =>
    profileRegionTerms(region, regions)
      ?.map((t) => t.id)
      .sort();
  assert.equal(CARD_BUYER_NEED_COUNT, 2);
  assert.deepEqual(
    ids("card:a"),
    [
      "buyerNeeds:Automate repetitive work",
      "buyerNeeds:Launch a new product",
      "industries:Retail",
      "productTypes:Web app",
    ],
    "a card shows the industry, the product type and the first two needs in source order",
  );
  assert.deepEqual(ids("project:a|needs"), [
    "buyerNeeds:Automate repetitive work",
    "buyerNeeds:Launch a new product",
    "buyerNeeds:Make data actionable",
  ]);
  assert.deepEqual(ids("project:a|details"), [
    "capabilities:Integration",
    "industries:Retail",
    "methods:Research",
    "productTypes:Web app",
    "tools:React",
  ]);
  for (const invalid of [
    "card:missing",
    "card:a|needs",
    "project:a",
    "project:a|outcomes",
    "project:missing|needs",
    "project:a|needs|x",
    "page:a",
    "",
  ])
    assert.equal(profileRegionTerms(invalid, regions), null, invalid);
});

const v3 = (() => {
  const terms = [
    ["industries", "Retail"],
    ["productTypes", "Web app"],
    ["buyerNeeds", "Launch a new product"],
    ["buyerNeeds", "Automate repetitive work"],
    ["buyerNeeds", "Make data actionable"],
    ["capabilities", "Integration"],
    ["methods", "Research"],
    ["tools", "React"],
    ["stages", "Production"],
  ].map(([facet, value]) => ({ id: `${facet}:${value}`, facet, value }));
  return {
    terms,
    projects: ["a", "b"].map((id) => ({
      id,
      name: id.toUpperCase(),
      href: `/en/projects/${id}`,
      terms: terms.map((t) => t.id),
    })),
  };
})();
const record3 = (p, kind, subject, strength, at = now) =>
  m.recordProfileSignal(
    p,
    { kind, subject, ...(strength === undefined ? {} : { strength }) },
    v3,
    at,
  );
const scores3 = (p, at = now) =>
  Object.fromEntries(
    m
      .profileInterests(p, v3, at)
      .map((t) => [t.id, Math.round(t.inferredScore * 1000) / 1000]),
  );

test("Rules v3: a card click credits only what the card shows, scaled by its strength", () => {
  assert.equal(m.PROFILE_RULE_VERSION, 3);
  assert.equal(m.SIGNAL_WEIGHTS.project_card_clicked, 2);
  assert.deepEqual(scores3(record3(fresh(), "project_card_clicked", "a", 1)), {
    "buyerNeeds:Automate repetitive work": 1,
    "buyerNeeds:Launch a new product": 1,
    "industries:Retail": 2,
    "productTypes:Web app": 2,
  });
  assert.deepEqual(
    scores3(record3(fresh(), "project_card_clicked", "a", 0.5)),
    {
      "buyerNeeds:Automate repetitive work": 0.5,
      "buyerNeeds:Launch a new product": 0.5,
      "industries:Retail": 1,
      "productTypes:Web app": 1,
    },
  );
  assert.deepEqual(
    scores3(record3(fresh(), "project_card_clicked", "a")),
    scores3(record3(fresh(), "project_card_clicked", "a", 1)),
    "absent strength means full strength",
  );
});

test("Rules v3: a stayed page credits its header; regions credit what they display", () => {
  assert.deepEqual(
    scores3(record3(fresh(), "project_details_viewed", "a", 1)),
    { "industries:Retail": 3 },
    "the project page header shows only the industry",
  );
  const preview = record3(fresh(), "project_opened", "a", 1);
  assert.equal(preview.signals.length, 1, "a stayed preview is still recorded");
  assert.deepEqual(
    scores3(preview),
    {},
    "its header shows none of the seven dimensions",
  );
  assert.equal(
    Object.keys(scores3(record3(fresh(), "case_study_viewed", "a", 1))).length,
    v3.terms.length,
    "a case study keeps crediting the whole project",
  );
  assert.equal(
    m.SIGNAL_WEIGHTS.project_region_viewed,
    m.SIGNAL_WEIGHTS.project_details_viewed,
  );
  assert.deepEqual(
    scores3(record3(fresh(), "project_region_viewed", "a|needs", 0.75)),
    {
      "buyerNeeds:Automate repetitive work": 0.75,
      "buyerNeeds:Launch a new product": 0.75,
      "buyerNeeds:Make data actionable": 0.75,
    },
  );
  assert.deepEqual(
    Object.keys(
      scores3(record3(fresh(), "project_region_viewed", "a|details", 1)),
    ).sort(),
    [
      "capabilities:Integration",
      "industries:Retail",
      "methods:Research",
      "productTypes:Web app",
      "tools:React",
    ],
  );
  for (const subject of ["a", "a|outcomes", "a|needs|x", "missing|needs"])
    assert.equal(
      record3(fresh(), "project_region_viewed", subject, 1).signals.length,
      0,
      subject,
    );
});

test("Rules v3: the strongest depth per project compares weight times strength", () => {
  let p = record3(fresh(), "project_details_viewed", "a", 0.5);
  p = record3(p, "case_study_viewed", "a", 1, now + 1);
  assert.equal(
    scores3(p, now + 1)["tools:React"],
    4,
    "a full case study outweighs a half-strength page",
  );
  p = record3(fresh(), "project_details_viewed", "a", 1);
  p = record3(p, "case_study_viewed", "a", 0.5, now + 1);
  assert.deepEqual(
    scores3(p, now + 1),
    { "industries:Retail": 3 },
    "a half-strength case study (2) does not replace a full page (3)",
  );
});

test("Rules v3: click levels and the strength a click carries to the page", () => {
  assert.equal(m.profileClickLevel(0, false), "none");
  assert.equal(m.profileClickLevel(499, false), "none");
  assert.equal(m.profileClickLevel(500, false), "half");
  assert.equal(m.profileClickLevel(2999, false), "half");
  assert.equal(m.profileClickLevel(3000, false), "full");
  assert.equal(m.profileClickLevel(0, true), "full", "exempt clicks earn full");
  assert.equal(m.profileArrivalStrength("full"), 1);
  assert.equal(m.profileArrivalStrength("half"), 0.75);
  assert.equal(m.profileArrivalStrength("none"), 0.5);
  assert.equal(m.profileArrivalStrength("link"), 1);
  assert.equal(m.profileArrivalStrength(null), 0.5);
});

test("Rules v3: strength is accepted only with its values and on kinds that carry it", () => {
  assert.equal(
    record3(fresh(), "project_card_clicked", "a", 0.6).signals.length,
    0,
  );
  assert.equal(
    record3(fresh(), "filter_selected", "tools:React", 0.5).signals.length,
    0,
  );
  const saved = record3(
    record3(fresh(), "project_card_clicked", "a", 0.5),
    "project_region_viewed",
    "a|needs",
    0.75,
    now + 1,
  );
  const restored = m.restoreVisitorProfile(
    JSON.parse(JSON.stringify(saved)),
    v3,
    now + 2,
  );
  assert.deepEqual(
    restored.signals.map((s) => [s.kind, s.subject, s.strength]),
    [
      ["project_card_clicked", "a", 0.5],
      ["project_region_viewed", "a|needs", 0.75],
    ],
  );
  const old = record3(fresh(), "project_opened", "a");
  assert.deepEqual(
    m.restoreVisitorProfile(JSON.parse(JSON.stringify(old)), v3, now + 1),
    old,
    "a profile saved without strength restores unchanged",
  );
  for (const [kind, strength] of [
    ["project_card_clicked", 0.25],
    ["project_card_clicked", "1"],
    ["filter_selected", 1],
  ]) {
    const broken = JSON.parse(JSON.stringify(saved));
    broken.signals[0] = {
      ...broken.signals[0],
      kind,
      subject: kind === "filter_selected" ? "tools:React" : "a",
      strength,
    };
    assert.equal(
      m.restoreVisitorProfile(broken, v3, now + 2),
      null,
      `${kind} ${strength}`,
    );
  }
  const batch = (events) => ({
    version: 1,
    token: "a".repeat(64),
    consentAt: now,
    events: events.map((e) => ({ id: crypto.randomUUID(), ...e })),
  });
  assert.deepEqual(
    m
      .parseProfileEventBatch(
        batch([
          { kind: "project_card_clicked", subject: "a", strength: 0.5 },
          { kind: "project_region_viewed", subject: "a|details", strength: 1 },
          { kind: "project_details_viewed", subject: "a", strength: 0.75 },
          { kind: "project_details_viewed", subject: "b" },
        ]),
        v3,
        now,
      )
      .events.map((e) => [e.kind, e.subject, e.strength]),
    [
      ["project_card_clicked", "a", 0.5],
      ["project_region_viewed", "a|details", 1],
      ["project_details_viewed", "a", 0.75],
      ["project_details_viewed", "b", undefined],
    ],
  );
  for (const event of [
    { kind: "project_card_clicked", subject: "a", strength: 0.3 },
    { kind: "topic_selected", subject: "tools:React", strength: 1 },
    { kind: "project_region_viewed", subject: "a|private text" },
  ])
    assert.equal(m.parseProfileEventBatch(batch([event]), v3, now), null);
});

test("the two Rules v3 signals name the card and the region they credit", () => {
  const presentation = loadTs(
    new URL(
      "../apps/web/src/components/VisitorProfile/profilePresentation.ts",
      import.meta.url,
    ),
  );
  assert.equal(
    presentation.subjectName(
      { kind: "project_region_viewed", subject: "a|needs" },
      catalog,
      "en",
    ),
    "A · Buyer needs",
  );
  assert.equal(
    presentation.subjectName(
      { kind: "project_region_viewed", subject: "a|details" },
      catalog,
      "de",
    ),
    "A · Projektdaten",
  );
  assert.equal(
    presentation.subjectName(
      { kind: "project_card_clicked", subject: "a" },
      catalog,
      "en",
    ),
    "A",
  );
});
