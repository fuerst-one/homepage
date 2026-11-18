import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { loadTs } from "./helpers/load-ts.mjs";
const require = createRequire(
  new URL("../apps/web/package.json", import.meta.url),
);
const { renderToStaticMarkup } = require("react-dom/server");
const { createElement } = require("react");
const { GeneratedImageDescription } = loadTs(
  new URL(
    "../apps/web/src/components/Cv/Projects/GeneratedImageDescription.tsx",
    import.meta.url,
  ),
);
test("generated descriptions are readable, labelled, expandable and safely escaped", () => {
  const html = renderToStaticMarkup(
    GeneratedImageDescription({
      description: "A map <script>unsafe</script>",
      locale: "en",
    }),
  );
  assert.match(html, /<details/);
  assert.match(html, /Automatically generated image description/);
  assert.match(html, /A map &lt;script&gt;unsafe&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /lang="en"/);
});

const initialDescriptions = [
  {
    href: "/api/image/project/Screenshots",
    description: "A detailed observation of the map and the route controls.",
    altText: "Map interface with route controls",
    language: "en",
  },
];
test("screenshot alt text and the detailed caption are present in the initial HTML", () => {
  const { ProjectScreenshots } = loadTs(
    new URL(
      "../apps/web/src/components/Cv/Projects/ProjectScreenshots.tsx",
      import.meta.url,
    ),
  );
  const html = renderToStaticMarkup(
    createElement(ProjectScreenshots, {
      screenshots: [initialDescriptions[0].href],
      projectName: "Project",
      projectId: "project",
      locale: "de",
      initialDescriptions,
    }),
  );
  assert.match(html, /alt="Map interface with route controls"/);
  assert.match(html, /<img[^>]*lang="en"/);
  assert.match(
    html,
    /A detailed observation of the map and the route controls\./,
  );
  assert.match(html, /Automatisch erstellte Bildbeschreibung/);
  const fallback = renderToStaticMarkup(
    createElement(ProjectScreenshots, {
      screenshots: ["/new-image"],
      projectName: "Project",
      initialDescriptions,
    }),
  );
  assert.match(fallback, /alt="Project screenshot 1"/);
  assert.doesNotMatch(fallback, /Map interface with route controls/);
});

test("case-study images use concise cached alts while preserving authored captions", () => {
  const { CaseStudyContent } = loadTs(
    new URL(
      "../apps/web/src/components/Cv/Projects/CaseStudyContent.tsx",
      import.meta.url,
    ),
  );
  const block = {
    id: "image",
    type: "image",
    imageUrl: initialDescriptions[0].href,
    richText: [],
    caption: [],
    children: [],
  };
  const props = {
    blocks: [block],
    projectName: "Project",
    projectId: "project",
    locale: "en",
    initialDescriptions,
  };
  const html = renderToStaticMarkup(createElement(CaseStudyContent, props));
  assert.match(html, /alt="Map interface with route controls"/);
  assert.match(
    html,
    /A detailed observation of the map and the route controls\./,
  );
  const authored = renderToStaticMarkup(
    createElement(CaseStudyContent, {
      ...props,
      blocks: [
        {
          ...block,
          caption: [{ plain_text: "A documented route", annotations: {} }],
        },
      ],
    }),
  );
  assert.match(authored, /alt="A documented route"/);
  assert.match(authored, /<figcaption[^>]*>.*A documented route/);
});
test("German pages label the generated English description and missing captions render nothing", () => {
  assert.match(
    renderToStaticMarkup(
      GeneratedImageDescription({ description: "A map", locale: "de" }),
    ),
    /Automatisch erstellte Bildbeschreibung/,
  );
  assert.equal(
    renderToStaticMarkup(
      GeneratedImageDescription({ description: "", locale: "en" }),
    ),
    "",
  );
});

test("service galleries retain authored provenance and supplement it with only selected cached descriptions", () => {
  const { ServiceProjectVisuals } = loadTs(
    new URL(
      "../apps/web/src/components/Services/ServiceProjectVisuals.tsx",
      import.meta.url,
    ),
  );
  const html = renderToStaticMarkup(
    createElement(ServiceProjectVisuals, {
      visuals: [
        {
          src: initialDescriptions[0].href,
          alt: "Concept illustration: planned route",
          caption: "Concept only, not a product screenshot",
          kind: "illustration",
        },
      ],
      projectName: "Project",
      projectId: "project",
      locale: "de",
      initialDescriptions: [
        ...initialDescriptions,
        {
          href: "/unselected",
          description: "Must not be passed to this gallery",
          altText: "Unselected",
          language: "en",
        },
      ],
    }),
  );
  assert.match(html, /alt="Concept illustration: planned route"/);
  assert.match(html, /Konzeptillustration/);
  assert.match(html, /Concept only, not a product screenshot/);
  assert.match(
    html,
    /A detailed observation of the map and the route controls\./,
  );
  assert.doesNotMatch(html, /Must not be passed to this gallery/);
  assert.doesNotMatch(html, /<img[^>]*lang="en"/);
});
