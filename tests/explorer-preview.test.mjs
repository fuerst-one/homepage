import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { loadTs } from "./helpers/load-ts.mjs";

const require = createRequire(
  new URL("../apps/web/package.json", import.meta.url),
);
const { createElement } = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { LocaleProvider } = loadTs(
  new URL(
    "../apps/web/src/components/i18n/LocaleProvider.tsx",
    import.meta.url,
  ),
);
const { SpaceProjectTooltip } = loadTs(
  new URL(
    "../apps/web/src/components/ExperienceAtlas/SpaceProjectTooltip.tsx",
    import.meta.url,
  ),
);
const { SpaceClusterTooltip } = loadTs(
  new URL(
    "../apps/web/src/components/ExperienceAtlas/SpaceClusterTooltip.tsx",
    import.meta.url,
  ),
);
const render = (component, props, locale = "en") =>
  renderToStaticMarkup(
    createElement(LocaleProvider, { locale }, createElement(component, props)),
  );
const details = {
  title: "Konfig <editor>",
  description: "A product design configurator.",
  contentLocale: "en",
  rows: [{ label: "Contribution", value: "Solo delivery" }],
};
const group = {
  index: 0,
  ids: ["a", "b"],
  label: "Web app",
  terms: [{ term: "Product configuration", count: 2, total: 2 }],
};

test("preview project hover explains the project without full facts or click instructions", () => {
  const html = render(SpaceProjectTooltip, { details, compact: true });
  assert.match(html, /Konfig &lt;editor&gt;/);
  assert.match(html, /A product design configurator\./);
  assert.doesNotMatch(html, /Contribution|Solo delivery|Click to explore/);
});

test("preview cluster hover keeps its localized name and count without the full trait table", () => {
  const html = render(SpaceClusterTooltip, { group, compact: true }, "de");
  assert.match(html, /Webanwendung/);
  assert.match(html, /2 Projekte/);
  assert.doesNotMatch(
    html,
    /Produktkonfiguration|2\/2|Anklicken|Click to explore/,
  );
});

test("full Explorer tooltips retain their facts and selection instructions", () => {
  const project = render(SpaceProjectTooltip, { details });
  assert.match(project, /Contribution/);
  assert.match(project, /Solo delivery/);
  assert.match(project, /Click to explore this project/);
  const cluster = render(SpaceClusterTooltip, { group });
  assert.match(cluster, /Product configuration/);
  assert.match(cluster, /2\/2/);
  assert.match(cluster, /Click to explore this cluster/);
});

const snapshot = require("./src/content/lab-preview.json");
const { previewLenses } = loadTs(
  new URL(
    "../apps/web/src/components/ExperienceAtlas/spaceNodes.ts",
    import.meta.url,
  ),
);
const lensIds = (lens) => lens.nodes.map((node) => node.id).sort();

test("the sidebar Explorer offers the Explorer page's four lenses in the same order", () => {
  assert.deepEqual(
    previewLenses(snapshot.semantic, snapshot.atlas, "en").map((lens) => [
      lens.id,
      lens.label,
      lens.question,
    ]),
    [
      ["product", "Product purpose", "What does it help people do?"],
      ["engineering", "Engineering", "How is it built?"],
      ["practice", "Contribution model", "How did I contribute?"],
      ["scale", "Scale & delivery", "What scale have I worked at?"],
    ],
  );
});

test("a fitted lens places exactly the projects it has positions for, with its own clusters", () => {
  const lenses = previewLenses(snapshot.semantic, snapshot.atlas, "en");
  for (const lens of lenses.slice(0, 3)) {
    const space = snapshot.semantic.spaces[lens.id];
    assert.deepEqual(lensIds(lens), [...space.ids].sort());
    assert.deepEqual(
      lens.groups.map((group) => group.ids),
      space.groups.map((group) => group.ids),
    );
  }
});

test("the scale lens is fitted once per set of measurements, not on every render", () => {
  const scaleClusters = (projects) =>
    previewLenses(snapshot.semantic, projects, "en").find(
      (lens) => lens.id === "scale",
    ).groups[0].ids;
  const first = scaleClusters(snapshot.atlas);
  assert.equal(scaleClusters([...snapshot.atlas]), first);
  const [changed, ...others] = snapshot.atlas;
  assert.notEqual(
    scaleClusters([{ ...changed, scale: undefined }, ...others]),
    first,
  );
});

test("the scale lens is fitted from recorded measurements and leaves out projects without them", () => {
  const [unmeasured, ...measured] = snapshot.atlas;
  const lenses = previewLenses(
    snapshot.semantic,
    [{ ...unmeasured, scale: undefined }, ...measured],
    "en",
  );
  const scale = lenses.find((lens) => lens.id === "scale");
  assert.ok(scale.nodes.length >= 2);
  assert.ok(!lensIds(scale).includes(unmeasured.id));
  assert.ok(lensIds(lenses[0]).includes(unmeasured.id));
  assert.ok(scale.groups.length >= 1);
  for (const group of scale.groups)
    for (const id of group.ids) assert.ok(lensIds(scale).includes(id));
});
