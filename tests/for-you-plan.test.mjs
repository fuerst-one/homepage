import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync } from "node:fs";
import { loadTs } from "./helpers/load-ts.mjs";

const load = (path) => {
  const url = new URL(`../${path}`, import.meta.url);
  return existsSync(url) ? loadTs(url) : {};
};
const plan = load("packages/content/src/forYouPlan.ts");
const faqs = load("apps/web/src/data/serviceFaqs.ts");
const products = load("apps/web/src/data/serviceProducts.ts");

const context = {
  projects: [
    { id: "opened-a", opened: true, images: ["opened-a#1"] },
    { id: "opened-b", opened: true, images: [] },
    { id: "fresh-a", opened: false, images: ["fresh-a#1", "fresh-a#2"] },
    { id: "fresh-b", opened: false, images: ["fresh-b#1"] },
    { id: "fresh-c", opened: false, images: ["fresh-c#1"] },
    { id: "fresh-d", opened: false, images: ["fresh-d#1"] },
    { id: "fresh-e", opened: false, images: ["fresh-e#1"] },
    { id: "fresh-bare", opened: false, images: [] },
  ],
  faqIds: ["product-interfaces:1", "product-interfaces:2", "ai-automation:1"],
  needs: ["Improve a complex interface", "Make data actionable"],
};
const sections = {
  hero: {
    type: "hero",
    headline: "Complex products, usable interfaces.",
    lead: "Configurators and editors that people can operate without a walkthrough.",
    action: "enquiry:product-interfaces:improve",
  },
  bridge: {
    type: "bridge",
    heading: "What the projects you viewed share",
    text: "Both turn many dependent options into one visible decision.",
    projectIds: ["opened-a", "opened-b"],
  },
  proofGrid: {
    type: "proofGrid",
    heading: "More work in the same direction",
    items: [
      { projectId: "fresh-a", fit: "A configurator with live preview." },
      { projectId: "fresh-b", fit: "An editor for specialist tasks." },
    ],
  },
  spotlight: {
    type: "spotlight",
    projectId: "fresh-a",
    problem: "Variants depended on each other.",
    built: "A configurator that shows each change at once.",
    result: "Customers see the result before ordering.",
    image: "fresh-a#2",
  },
  secondNeed: {
    type: "secondNeed",
    need: "Make data actionable",
    heading: "And if the data is the hard part",
    text: "Dense information, filtered around a decision.",
    projectIds: ["fresh-c"],
  },
  approach: {
    type: "approach",
    heading: "How we would start",
    steps: [
      { title: "Find the sticking point", text: "One task that matters." },
      { title: "Make it testable", text: "A prototype of that flow." },
      { title: "Build it in", text: "In your existing stack." },
    ],
  },
  offer: {
    type: "offer",
    offer: "product-interfaces",
    text: "A review of one flow fits a working interface with a known problem.",
  },
  questions: {
    type: "questions",
    faqIds: ["product-interfaces:1", "ai-automation:1"],
  },
  closing: {
    type: "closing",
    heading: "Which part should feel easier?",
    text: "Show me the screen everyone explains twice.",
    action: "offer:product-interfaces",
  },
};
const fullPlan = (list) => ({ version: 1, locale: "en", sections: list });
const check = (section, accepted = []) =>
  plan.checkForYouSection(section, context, accepted);

test("every section type of the library passes with valid content", () => {
  assert.deepEqual(
    [...plan.FOR_YOU_SECTION_TYPES].sort(),
    Object.keys(sections).sort(),
  );
  for (const section of Object.values(sections)) {
    const result = check(section);
    assert.equal(result.ok, true, `${section.type}: ${result.reason}`);
    assert.deepEqual(result.section, section);
  }
});

test("a section of an unknown type or without an object shape is dropped", () => {
  assert.equal(check({ type: "testimonial", text: "x" }).ok, false);
  assert.equal(check("hero").ok, false);
  assert.equal(check(null).ok, false);
  assert.equal(check({ ...sections.hero, extra: "free markup" }).ok, false);
});

test("text fields must be non-empty, within their named limit and free of URLs", () => {
  const limit = plan.FOR_YOU_TEXT_LIMITS.headline;
  assert.equal(check({ ...sections.hero, headline: "" }).ok, false);
  assert.equal(check({ ...sections.hero, headline: "   " }).ok, false);
  assert.equal(check({ ...sections.hero, headline: 42 }).ok, false);
  assert.equal(
    check({ ...sections.hero, headline: "x".repeat(limit) }).ok,
    true,
  );
  const long = check({ ...sections.hero, headline: "x".repeat(limit + 1) });
  assert.equal(long.ok, false);
  assert.match(long.reason, /headline/);
  for (const lead of ["See https://example.com", "Visit www.example.com"])
    assert.equal(check({ ...sections.hero, lead }).ok, false);
});

test("calls to action must be ids from the allowlist, never URLs", () => {
  for (const action of [
    "enquiry:product-interfaces:improve",
    "enquiry:ai-products:explore",
    "enquiry:product-interfaces:review:improve",
    "enquiry:ai-automation:assessment:explore",
    "offer:product-interfaces",
    "offer:ai-automation",
    "hire",
    "email",
    "explorer",
    "projects:Make data actionable",
  ])
    assert.equal(check({ ...sections.hero, action }).ok, true, action);
  for (const action of [
    "https://fuerst.one/en/contact",
    "/en/contact",
    "enquiry:product-interfaces:hurry",
    "enquiry:ai-products:review:improve",
    "enquiry:product-interfaces:assessment:improve",
    "offer:ai-products",
    "projects:Sell everything",
    "",
  ])
    assert.equal(check({ ...sections.hero, action }).ok, false, action);
});

test("the allowlist lists every action once and resolves each id", () => {
  const ids = plan.forYouActionIds(context.needs);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes("projects:Improve a complex interface"));
  for (const id of ids) assert.ok(plan.parseForYouAction(id, context.needs));
  assert.deepEqual(
    plan.parseForYouAction("enquiry:ai-automation:assessment:explore", []),
    {
      kind: "enquiry",
      service: "ai-automation",
      offer: "assessment",
      intent: "explore",
    },
  );
  assert.deepEqual(
    plan.parseForYouAction("projects:Make data actionable", context.needs),
    {
      kind: "projects",
      need: "Make data actionable",
    },
  );
});

test("the starting offers are the site's two service products", () => {
  assert.deepEqual(
    [...plan.FOR_YOU_STARTING_OFFERS],
    [...products.serviceProductSlugs],
  );
  assert.equal(check({ ...sections.offer, offer: "ai-products" }).ok, false);
});

test("projects must be candidates: unopened in the proof grid, opened in the bridge", () => {
  const item = (projectId) => ({ projectId, fit: "Fits." });
  const grid = (ids) => ({ ...sections.proofGrid, items: ids.map(item) });
  assert.equal(check(grid(["fresh-a"])).ok, false, "one project");
  assert.equal(
    check(grid(["fresh-a", "fresh-b", "fresh-c", "fresh-d"])).ok,
    true,
  );
  assert.equal(
    check(grid(["fresh-a", "fresh-b", "fresh-c", "fresh-d", "fresh-e"])).ok,
    false,
    "five projects",
  );
  assert.equal(check(grid(["fresh-a", "opened-a"])).ok, false, "opened");
  assert.equal(check(grid(["fresh-a", "unknown"])).ok, false, "unknown");
  assert.equal(check(grid(["fresh-a", "fresh-a"])).ok, false, "repeated");
  assert.equal(
    check({ ...sections.bridge, projectIds: ["opened-a", "fresh-a"] }).ok,
    false,
  );
  assert.equal(check({ ...sections.bridge, projectIds: [] }).ok, false);
  assert.equal(
    check({ ...sections.secondNeed, projectIds: ["fresh-c", "opened-a"] }).ok,
    true,
  );
  assert.equal(
    check({
      ...sections.secondNeed,
      projectIds: ["fresh-c", "fresh-d", "fresh-e"],
    }).ok,
    false,
  );
});

test("a proof grid shows only projects with an image", () => {
  const result = check({
    ...sections.proofGrid,
    items: [
      { projectId: "fresh-a", fit: "Fits." },
      { projectId: "fresh-bare", fit: "Fits." },
    ],
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /fresh-bare has no image/);
});

test("the spotlight image must be one of that project's candidate images", () => {
  assert.equal(check({ ...sections.spotlight, image: "fresh-a#1" }).ok, true);
  assert.equal(check({ ...sections.spotlight, image: "opened-a#1" }).ok, false);
  assert.equal(
    check({ ...sections.spotlight, image: "https://example.com/a.png" }).ok,
    false,
  );
  assert.equal(
    check({ ...sections.spotlight, projectId: "unknown" }).ok,
    false,
  );
  assert.deepEqual(plan.parseForYouImageRef("fresh-a#2"), {
    projectId: "fresh-a",
    number: 2,
  });
  assert.equal(plan.forYouImageRef("fresh-a", 2), "fresh-a#2");
  assert.equal(plan.parseForYouImageRef("fresh-a#0"), null);
});

test("the second need must be a known need, the approach has three steps", () => {
  assert.equal(
    check({ ...sections.secondNeed, need: "Rule the world" }).ok,
    false,
  );
  assert.equal(
    check({ ...sections.approach, steps: sections.approach.steps.slice(0, 2) })
      .ok,
    false,
  );
});

test("FAQ picks are two or three distinct ids from the list passed in", () => {
  const pick = (faqIds) => check({ ...sections.questions, faqIds });
  assert.equal(pick(["product-interfaces:1"]).ok, false);
  assert.equal(
    pick(["product-interfaces:1", "product-interfaces:2", "ai-automation:1"])
      .ok,
    true,
  );
  assert.equal(
    pick(["product-interfaces:1", "product-interfaces:1"]).ok,
    false,
  );
  assert.equal(pick(["product-interfaces:1", "ai-products:9"]).ok, false);
});

test("a type appears once, and a hero only as the first section", () => {
  const first = check(sections.hero).section;
  const repeated = check(sections.hero, [first]);
  assert.equal(repeated.ok, false);
  assert.match(repeated.reason, /once/);
  const late = check(sections.hero, [check(sections.bridge).section]);
  assert.equal(late.ok, false);
  assert.match(late.reason, /first/);
});

test("a plan keeps its valid sections and reports the dropped ones", () => {
  const result = plan.validateForYouPlan(
    fullPlan([
      sections.hero,
      { ...sections.bridge, projectIds: ["unknown"] },
      sections.proofGrid,
      sections.approach,
      { type: "testimonial" },
      sections.closing,
    ]),
    context,
  );
  assert.equal(result.ok, true);
  assert.deepEqual(
    result.plan.sections.map((section) => section.type),
    ["hero", "proofGrid", "approach", "closing"],
  );
  assert.deepEqual(
    result.dropped.map(({ index, type }) => [index, type]),
    [
      [1, "bridge"],
      [4, "testimonial"],
    ],
  );
  assert.ok(result.dropped.every(({ reason }) => reason.length));
});

test("a plan needs four valid sections and keeps at most seven", () => {
  const short = plan.validateForYouPlan(
    fullPlan([
      sections.hero,
      sections.bridge,
      { type: "testimonial" },
      sections.closing,
    ]),
    context,
  );
  assert.equal(short.ok, false);
  assert.match(short.reason, /four/);
  const all = plan.validateForYouPlan(
    fullPlan(Object.values(sections)),
    context,
  );
  assert.equal(all.ok, true);
  assert.equal(all.plan.sections.length, plan.FOR_YOU_MAX_SECTIONS);
  assert.deepEqual(
    all.dropped.map(({ type, reason }) => [type, /limit/.test(reason)]),
    [
      ["questions", true],
      ["closing", true],
    ],
  );
});

test("a plan has a version, a language and a list of sections", () => {
  const list = Object.values(sections).slice(0, 5);
  assert.equal(plan.validateForYouPlan(fullPlan(list), context).ok, true);
  assert.equal(
    plan.validateForYouPlan({ ...fullPlan(list), locale: "fr" }, context).ok,
    false,
  );
  assert.equal(
    plan.validateForYouPlan({ ...fullPlan(list), version: 2 }, context).ok,
    false,
  );
  assert.equal(plan.validateForYouPlan({ locale: "en" }, context).ok, false);
  assert.equal(plan.validateForYouPlan([], context).ok, false);
});

test("FAQ ids are stable per service and position and match across languages", () => {
  const en = faqs.serviceFaqs("en");
  const de = faqs.serviceFaqs("de");
  assert.ok(en.length >= 12);
  assert.deepEqual(
    en.map((faq) => faq.id),
    de.map((faq) => faq.id),
  );
  assert.equal(new Set(en.map((faq) => faq.id)).size, en.length);
  assert.ok(en.every((faq) => /^[a-z-]+:[1-9]\d*$/.test(faq.id)));
  const first = en.find((faq) => faq.id === "product-interfaces:1");
  assert.match(first.question, /existing product/);
  assert.equal(
    faqs.serviceFaq("de", "product-interfaces:1").answer.length > 0,
    true,
  );
  assert.equal(faqs.serviceFaq("en", "product-interfaces:99"), undefined);
});
