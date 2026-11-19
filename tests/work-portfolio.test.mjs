import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const subject = () =>
  loadTs(new URL("../packages/content/src/workPortfolio.ts", import.meta.url));
const rich = (text) => ({ rich_text: [{ plain_text: text }] });
const project = (id, extra = {}) => ({
  id,
  name: id,
  startDate: "2026-01-15",
  endDate: "2026-02-01",
  status: "Completed",
  industries: ["Maritime & logistics"],
  capabilities: ["UX-Design"],
  methods: [],
  description: rich("A useful product."),
  kpis: rich("Owner estimate: 20% improvement."),
  matching: {
    buyerNeeds: ["Improve a complex interface", "Make data actionable"],
    ownership: "Team contributor",
    stages: ["Production"],
    summary: "A complex workflow.",
  },
  screenshots: ["/api/image/public/Screenshots?index=0"],
  clients: [],
  tools: [],
  featured: false,
  caseStudyIds: { en: null, de: null },
  ...extra,
});

test("monthly starts and overlapping engagements count distinct projects, with zero months retained", () => {
  const { portfolioTimeline } = subject();
  const rows = portfolioTimeline(
    [
      project("a"),
      project("a"),
      project("b", {
        startDate: "2026-03-01",
        endDate: null,
        status: "In Progress",
      }),
      project("invalid", { startDate: "2026-13-01" }),
      project("future", { startDate: "2027-01-01" }),
      project("backwards", { startDate: "2026-04-01", endDate: "2026-01-01" }),
    ],
    "2026-04-20",
  );
  assert.deepEqual(rows, [
    { month: "2026-01", starts: ["a"], engagements: ["a"] },
    { month: "2026-02", starts: [], engagements: ["a"] },
    { month: "2026-03", starts: ["b"], engagements: ["b"] },
    { month: "2026-04", starts: [], engagements: ["b"] },
  ]);
});
test("a completed project without an end is counted in its start month only", () => {
  const { portfolioTimeline } = subject();
  const rows = portfolioTimeline(
    [project("a", { endDate: null })],
    "2026-03-20",
  );
  assert.equal(rows[0].engagements.length, 1);
  assert.deepEqual(rows.at(-1).engagements, []);
});
test("challenge membership keeps cross-industry overlap and stable named groups", () => {
  const { workGroups, workMemberships, landscapePoints } = subject();
  const ps = [project("a"), project("b", { matching: { buyerNeeds: [] } })];
  assert.deepEqual(workMemberships(ps[0], "challenges"), [
    "interfaces",
    "data",
  ]);
  const groups = workGroups(ps, "challenges");
  assert.equal(groups.find((g) => g.id === "interfaces").ids.length, 1);
  assert.equal(groups.find((g) => g.id === "data").ids.length, 1);
  assert.equal(groups.find((g) => g.id === "other").ids.length, 1);
  assert.deepEqual(
    landscapePoints(ps, "challenges"),
    landscapePoints([...ps].reverse(), "challenges"),
  );
  assert.equal(landscapePoints(ps, "challenges").length, 2);
});
test("homepage projection preserves qualified outcomes and omits research and repository details", () => {
  const { workProject } = subject();
  const p = workProject(
    project("a", {
      githubUrl: "https://github.com/private/repo",
      scale: { codeSloc: 100, internalNotes: "secret" },
    }),
    "/en/projects/a",
    "en",
  );
  assert.equal(p.outcome, "Owner estimate: 20% improvement.");
  assert.equal(p.ownership, "Team contributor");
  assert.equal(p.caseHref, null);
  assert.doesNotMatch(JSON.stringify(p), /secret|codeSloc|github.com/);
});
test("selected work uses curated public cases and never substitutes an unrelated project", () => {
  const { selectedWork } = subject();
  const konfig = project("15b86514-f736-803e-b9b7-e47ebc2406d1");
  assert.deepEqual(
    selectedWork([project("other", { featured: true }), konfig]).map(
      (p) => p.id,
    ),
    [konfig.id],
  );
});
test("German projects use their translated description rather than English source context", () => {
  const { workProject } = subject();
  const p = workProject(
    project("a", {
      contentLocale: "de",
      description: rich("Ein komplexer Arbeitsablauf."),
    }),
    "/de/projects/a",
    "de",
  );
  assert.equal(p.summary, "Ein komplexer Arbeitsablauf.");
  assert.equal(p.contentLocale, "de");
});

test("each timeline month names its active projects, longest-running first", () => {
  const { portfolioTimeline, timelineProjects } = subject();
  const projects = [
    project("b", { startDate: "2026-02-10", endDate: "2026-03-05" }),
    project("a", { startDate: "2026-01-15", endDate: "2026-02-20" }),
  ];
  const labelled = projects.map((p) => ({
    id: p.id,
    label: `Project ${p.id.toUpperCase()}`,
    startDate: p.startDate,
  }));
  assert.deepEqual(
    timelineProjects(portfolioTimeline(projects, "2026-04-20"), labelled).map(
      (row) => [row.month, row.projects.map((p) => p.label)],
    ),
    [
      ["2026-01", ["Project A"]],
      ["2026-02", ["Project A", "Project B"]],
      ["2026-03", ["Project B"]],
      ["2026-04", []],
    ],
  );
});

test("only projects confirmed to have no connected repository count as work outside GitHub", () => {
  const { portfolioTimeline, timelineProjects, workProject } = subject();
  const projects = [
    project("gitlab-client", { hasConnectedRepo: false }),
    project("github-product", { hasConnectedRepo: true }),
    project("unchecked"),
  ];
  const [month] = timelineProjects(
    portfolioTimeline(projects, "2026-01-20"),
    projects.map((p) => workProject(p, `/en/projects/${p.id}`, "en")),
  );
  assert.deepEqual(month.projects, [
    { label: "github-product", outsideGitHub: false },
    { label: "gitlab-client", outsideGitHub: true },
    { label: "unchecked", outsideGitHub: false },
  ]);
});
