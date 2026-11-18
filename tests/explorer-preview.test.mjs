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
