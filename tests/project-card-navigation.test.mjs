import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";
for (const locale of ["en", "de"]) {
  test(`${locale} cards separate name and purpose and reserve the modal trigger for images`, async () => {
    const response = await fetch(`${base}/${locale}/projects`, {
      signal: AbortSignal.timeout(60000),
    });
    assert.equal(response.status, 200);
    const html = await response.text();
    const path = `/${locale}/projects/roadtrippin`;
    const card = [...html.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/g)]
      .map(([x]) => x)
      .find((x) => x.includes(`href="${path}"`));
    assert.ok(card, "RoadTrippin is published in the featured list");
    const heading = card
      .match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/)?.[1]
      .replace(/<[^>]+>/g, "");
    assert.equal(heading, "RoadTrippin");
    assert.ok(card.includes("Collaborative Road Trip Planner"));
    const buttons = [
      ...card.matchAll(/<button\b[^>]*aria-label="([^"]+)"/g),
    ].map((x) => x[1]);
    assert.deepEqual(buttons, [
      locale === "de"
        ? "Bilder von RoadTrippin – Collaborative Road Trip Planner ansehen"
        : "View images for RoadTrippin – Collaborative Road Trip Planner",
    ]);
    assert.ok(
      card.includes(
        `aria-label="${locale === "de" ? "Projekt ansehen: RoadTrippin – Collaborative Road Trip Planner" : "View project: RoadTrippin – Collaborative Road Trip Planner"}"`,
      ),
    );
    assert.ok(card.includes(`href="${path}/case-study"`));
  });
}

for (const locale of ["en", "de"]) {
  test(`${locale} full project facts are a static section, not an outer disclosure`, async () => {
    const response = await fetch(
      `${base}/${locale}/projects/konfig-product-design-configurator`,
      { signal: AbortSignal.timeout(60000) },
    );
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /<section[^>]*aria-labelledby="project-facts-title"/);
    assert.match(html, /<h2[^>]*id="project-facts-title"/);
    assert.doesNotMatch(html, /<summary[^>]*>\s*(Project facts|Projektdaten)/);
  });
}

const { caseLabel } = loadTs(
  new URL("../packages/content/src/projectCase.ts", import.meta.url),
);
const { atlasTerm } = loadTs(
  new URL(
    "../apps/web/src/components/ExperienceAtlas/atlasCopy.ts",
    import.meta.url,
  ),
);
const { CARD_BUYER_NEED_COUNT } = loadTs(
  new URL("../packages/content/src/visitorProfileSignals.ts", import.meta.url),
);
const text = (html) =>
  html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
const needHref = (locale, need) =>
  `/${locale}/projects?${new URLSearchParams({ buyerNeeds: need })}`.replace(
    /&/g,
    "&amp;",
  );
const needLinks = (html) =>
  [
    ...html.matchAll(
      /<a\b[^>]*href="([^"]*buyerNeeds=[^"]*)"[^>]*>([\s\S]*?)<\/a>/g,
    ),
  ].map(([, href, label]) => ({ href, label: text(label) }));
const publishedProjects = (locale) =>
  fetch(`${base}/api/projects?locale=${locale}`, {
    signal: AbortSignal.timeout(60000),
  })
    .then((response) => response.json())
    .then((data) => data.results);

for (const locale of ["en", "de"]) {
  test(`${locale} cards name their product formats and link their leading buyer needs`, async () => {
    const [projects, html] = await Promise.all([
      publishedProjects(locale),
      fetch(`${base}/${locale}/projects`, {
        signal: AbortSignal.timeout(60000),
      }).then((response) => response.text()),
    ]);
    const cards = [
      ...html.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/g),
    ].map(([x]) => x);
    assert.ok(cards.length > 0);
    let withManyNeeds = 0;
    for (const card of cards) {
      const id = card.match(/data-profile-region="card:([^"]+)"/)?.[1];
      assert.ok(id, "every card is a tagged profile region");
      const project = projects.find((p) => p.id === id);
      assert.ok(project, `${id} is published`);
      const meta = text(
        card.match(/<p class="text-xs text-neutral-400">([\s\S]*?)<\/p>/)[1],
      );
      const formats = (project.productTypes ?? []).map((t) =>
        atlasTerm(locale, t),
      );
      assert.ok(
        meta.startsWith(
          [
            ...(formats.length ? [formats.join(", ")] : []),
            project.projectType,
          ].join(" · "),
        ),
        `${project.name}: "${meta}" starts with its product formats and project type`,
      );
      const needs = project.matching?.buyerNeeds ?? [];
      if (needs.length > CARD_BUYER_NEED_COUNT) withManyNeeds++;
      assert.deepEqual(
        needLinks(card),
        needs.slice(0, CARD_BUYER_NEED_COUNT).map((need) => ({
          href: needHref(locale, need),
          label: caseLabel(need, locale),
        })),
        `${project.name} links its first ${CARD_BUYER_NEED_COUNT} buyer needs`,
      );
      if (needs.length)
        assert.match(
          card.match(
            /<ul\b[^>]*aria-label="(?:Buyer needs|Bedarf)"[^>]*>/,
          )?.[0] ?? "",
          /(?=.*\bpointer-events-auto\b)(?=.*\bprint:hidden\b)/,
          "need links are clickable above the card link and left out of print",
        );
    }
    assert.ok(
      withManyNeeds > 0,
      "the list includes a card with more needs than it shows",
    );
  });

  test(`${locale} the project page lists every buyer need directly below the screenshots`, async () => {
    const projects = await publishedProjects(locale);
    const project = projects.find((p) => p.name.startsWith("RoadTrippin"));
    const html = await fetch(`${base}/${locale}/projects/roadtrippin`, {
      signal: AbortSignal.timeout(60000),
    }).then((response) => response.text());
    const needs = project.matching.buyerNeeds;
    assert.ok(needs.length > CARD_BUYER_NEED_COUNT);
    const start = html.indexOf(
      `data-profile-region="project:${project.id}|needs"`,
    );
    assert.ok(start > 0, "the needs block is a tagged profile region");
    const block = html.slice(start, html.indexOf("</ul>", start));
    assert.deepEqual(
      needLinks(block),
      needs.map((need) => ({
        href: needHref(locale, need),
        label: caseLabel(need, locale),
      })),
    );
    const nextImage = html.lastIndexOf(
      locale === "de"
        ? 'aria-label="Nächstes Bild"'
        : 'aria-label="Next image"',
    );
    assert.ok(
      nextImage > 0 && nextImage < start,
      "the needs follow the screenshots",
    );
    assert.ok(
      start < html.indexOf(`data-profile-proof=`) &&
        start < html.indexOf('id="project-facts-title"'),
      "the needs come before the proof links and the details table",
    );
    assert.match(
      html,
      new RegExp(
        `<section[^>]*data-profile-region="project:${project.id}\\|details"[^>]*>[\\s\\S]*?id="project-facts-title"`,
      ),
      "the details table is a tagged profile region",
    );
    const caseStudy = await fetch(
      `${base}/${locale}/projects/roadtrippin/case-study`,
      { signal: AbortSignal.timeout(60000) },
    ).then((response) => response.text());
    assert.equal(
      needLinks(caseStudy).length,
      0,
      "the case study does not repeat the needs",
    );
  });
}
