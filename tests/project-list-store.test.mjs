import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { useProjectListStore, selectProjectResults, mutedProjectIds } = loadTs(
  new URL(
    "../apps/web/src/components/Cv/Projects/projectListStore.ts",
    import.meta.url,
  ),
);
const { buildProjectSearchIndex } = loadTs(
  new URL(
    "../apps/web/src/components/PlasmaLanding/projectSearch.ts",
    import.meta.url,
  ),
);

const project = (id, overrides = {}) => ({
  id,
  name: id,
  oneLineSummary: "A public project",
  webUrl: `/en/projects/${id}`,
  tools: [],
  capabilities: [],
  methods: [],
  industries: [],
  languages: [],
  clientNames: [],
  featured: false,
  ...overrides,
});
const projects = [
  project("atlas", { tools: ["React"], featured: true }),
  project("studio", { tools: ["React"] }),
  project("harbor", {
    tools: ["Vue"],
    oneLineSummary: "A photovoltaic monitoring interface",
  }),
  project("meadow", {
    tools: ["React"],
    oneLineSummary: "Photovoltaic yield reports",
  }),
];
const index = buildProjectSearchIndex(projects, "en");
const ids = (input) =>
  selectProjectResults({ projects, index, ...input }).map((p) => p.id);
const state = () => useProjectListStore.getState();
const webApps = { index: 2, ids: ["atlas", "harbor"], label: "Web app" };

beforeEach(() => {
  useProjectListStore.setState(useProjectListStore.getInitialState(), true);
});

test("selecting a cluster drops the default featured filter, like any other filter change", () => {
  assert.deepEqual(state().filters, { featured: ["true"] });
  state().toggleCluster(webApps);
  assert.deepEqual(state().cluster, webApps);
  assert.deepEqual(state().filters, {});
});

test("selecting a cluster keeps the facet filters a visitor chose", () => {
  state().setFilters({ tools: ["React"] });
  state().toggleCluster(webApps);
  assert.deepEqual(state().filters, { tools: ["React"] });
});

test("selecting the active cluster again clears it", () => {
  state().toggleCluster(webApps);
  state().toggleCluster({ ...webApps });
  assert.equal(state().cluster, null);
});

test("selecting another cluster replaces the active one", () => {
  const other = { index: 5, ids: ["studio"], label: "Dashboard" };
  state().toggleCluster(webApps);
  state().toggleCluster(other);
  assert.deepEqual(state().cluster, other);
});

test("a new query discards the semantic matches of the previous one", () => {
  state().setQuery("solar");
  state().setSemantic({ query: "solar", ids: ["harbor"] });
  assert.equal(state().searchStatus, "complete");
  state().setQuery("solar roofs");
  assert.equal(state().semantic, null);
  assert.equal(state().searchStatus, "idle");
});

test("a handled reveal is forgotten, so it cannot reopen the list later", () => {
  state().revealProject("atlas");
  assert.equal(state().revealId, "atlas");
  state().clearReveal();
  assert.equal(state().revealId, null);
});

test("the same project can be revealed again after it was handled", () => {
  state().revealProject("atlas");
  state().clearReveal();
  state().revealProject("atlas");
  assert.equal(state().revealId, "atlas");
});

test("leaving the list forgets search, cluster and results but keeps the facet filters", () => {
  state().setFilters({ tools: ["React"] });
  state().setQuery("solar");
  state().setSemantic({ query: "solar", ids: ["harbor"] });
  state().toggleCluster(webApps);
  state().setResultIds(["atlas"]);
  state().revealProject("atlas");
  state().resetListView();
  assert.deepEqual(state().filters, { tools: ["React"] });
  assert.equal(state().query, "");
  assert.equal(state().semantic, null);
  assert.equal(state().searchStatus, "idle");
  assert.equal(state().cluster, null);
  assert.equal(state().resultIds, null);
  assert.equal(state().revealId, null);
});

test("without a query the results are the filtered projects in list order", () => {
  assert.deepEqual(ids({ filters: { tools: ["React"] }, query: "" }), [
    "atlas",
    "studio",
    "meadow",
  ]);
});

test("a selected cluster intersects with the facet filters", () => {
  assert.deepEqual(
    ids({
      filters: { tools: ["React"] },
      clusterIds: ["atlas", "harbor"],
      query: "",
    }),
    ["atlas"],
  );
});

test("search only returns matches that pass the filters and the cluster", () => {
  assert.deepEqual(ids({ filters: {}, query: "photovoltaic" }).sort(), [
    "harbor",
    "meadow",
  ]);
  assert.deepEqual(
    ids({ filters: { tools: ["React"] }, query: "photovoltaic" }),
    ["meadow"],
  );
  assert.deepEqual(
    ids({
      filters: {},
      clusterIds: ["atlas", "harbor"],
      query: "photovoltaic",
    }),
    ["harbor"],
  );
});

test("semantic matches extend the search within the active filters", () => {
  assert.deepEqual(
    ids({
      filters: { tools: ["React"] },
      query: "help buyers make confident choices",
      semanticIds: ["harbor", "studio"],
    }),
    ["studio"],
  );
});

test("the explorer mutes nothing until a list publishes its results", () => {
  assert.deepEqual(mutedProjectIds(["atlas", "studio"], null), []);
});

test("the explorer mutes every project that is not a current result", () => {
  assert.deepEqual(
    mutedProjectIds(["atlas", "studio", "harbor"], ["studio", "elsewhere"]),
    ["atlas", "harbor"],
  );
  assert.deepEqual(mutedProjectIds(["atlas", "studio"], []), [
    "atlas",
    "studio",
  ]);
});
