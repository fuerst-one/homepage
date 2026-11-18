import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const { readNotionProjectScale, publicProjectScale, effortClass } = loadTs(
  new URL("../packages/content/src/projectScale.ts", import.meta.url),
);
const number = (n) => ({ type: "number", number: n });
const text = (s) => ({ type: "rich_text", rich_text: [{ plain_text: s }] });
test("scale preserves zero measurements, ranges and provenance without private source notes", () => {
  const scale = readNotionProjectScale({
    properties: {
      "Complexity 1-5": number(4),
      "Effort Days Low": number(3),
      "Effort Days High": number(10),
      "Team Size Low": number(1),
      "Team Size High": number(3),
      "Code SLOC": number(1000),
      "Test SLOC": number(0),
      "Effort Estimate Basis": text(
        "UNCONFIRMED ANALYST ESTIMATE: recreate scope /Users/private",
      ),
      "Complexity Basis": text("UNCONFIRMED ANALYST ASSESSMENT"),
      "Code Size Scope": text("/Users/private"),
      "Effort Class (upper)": { select: { name: "XL" } },
    },
  });
  assert.equal(scale.testSloc, 0);
  assert.equal(scale.teamHigh, 3);
  assert.equal(scale.effortBasis, "rebuild-estimate");
  assert.equal(scale.effortClassSource, "XL");
  assert.equal(scale.effortClassComputed, "S");
  assert.equal(scale.complexityBasis, "assessment");
  assert.ok(!JSON.stringify(scale).includes("/Users"));
});
test("missing, nonfinite, invalid scores and reversed ranges stay unknown", () => {
  const p = publicProjectScale({
    complexity: 6,
    codeSloc: NaN,
    testSloc: -1,
    teamLow: 8,
    teamHigh: 2,
    effortLow: null,
    effortHigh: 10,
    effortBasis: "measured",
    codeMeasuredAt: "not-a-date",
    private: "secret",
  });
  assert.equal(p.complexity, null);
  assert.equal(p.codeSloc, null);
  assert.equal(p.testSloc, null);
  assert.equal(p.teamLow, null);
  assert.equal(p.teamHigh, null);
  assert.equal(p.effortLow, null);
  assert.equal(p.effortHigh, 10);
  assert.equal(p.effortBasis, "unspecified");
  assert.equal(p.codeMeasuredAt, null);
  assert.ok(!("private" in p));
  assert.equal(effortClass(null), null);
  assert.equal(effortClass(5), "XS");
  assert.equal(effortClass(20), "S");
  assert.equal(effortClass(601), "XXL");
});

test("owner-reported historical personal effort stays distinct from rebuild estimates", () => {
  const { effortBasisLabel } = loadTs(
    new URL("../packages/content/src/projectScale.ts", import.meta.url),
  );
  const p = readNotionProjectScale({
    properties: {
      "Effort Days Low": number(3),
      "Effort Days High": number(3),
      "Effort Estimate Basis": text(
        "OWNER-REPORTED HISTORICAL PERSONAL EFFORT — owner clarification. Not a rebuild estimate or measured timesheet.",
      ),
    },
  });
  assert.equal(p.effortBasis, "historical-personal-effort");
  assert.equal(publicProjectScale(p).effortBasis, "historical-personal-effort");
  assert.match(
    effortBasisLabel(p.effortBasis, "en"),
    /historical personal effort/i,
  );
  assert.match(
    effortBasisLabel(p.effortBasis, "de"),
    /historischer persönlicher Aufwand/i,
  );
  assert.notEqual(
    effortBasisLabel(p.effortBasis, "en"),
    effortBasisLabel("rebuild-estimate", "en"),
  );
});
