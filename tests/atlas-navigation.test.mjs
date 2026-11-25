import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { readAtlasNavigation, updateAtlasUrl } = loadTs(
  new URL(
    "../apps/web/src/components/ExperienceAtlas/atlasNavigation.ts",
    import.meta.url,
  ),
);
const projects = [{ id: "konfig" }, { id: "seabo" }];

test("plain entries select nothing; invalid links fall back to the overview", () => {
  for (const query of ["", "project=missing&lens=unknown&view=unknown"])
    assert.deepEqual(
      readAtlasNavigation(new URLSearchParams(query), projects),
      {
        project: "",
        lens: "product",
        view: "3d",
      },
    );
});

test("deep links restore project, lens and representation independently", () => {
  for (const lens of ["product", "engineering", "practice", "scale"])
    for (const view of ["3d", "2d", "network"])
      assert.deepEqual(
        readAtlasNavigation(
          new URLSearchParams(`project=seabo&lens=${lens}&view=${view}`),
          projects,
        ),
        {
          project: "seabo",
          lens,
          view,
        },
      );
  assert.deepEqual(
    readAtlasNavigation(new URLSearchParams("lens=scale&view=2d"), projects),
    {
      project: "",
      lens: "scale",
      view: "2d",
    },
  );
});

test("changing one control preserves the project, other controls and page anchor", () => {
  const url = updateAtlasUrl(
    new URL(
      "https://example.com/en/explorer?project=konfig&lens=engineering&ref=home#atlas-explore-title",
    ),
    { view: "network" },
  );
  assert.equal(
    url,
    "/en/explorer?project=konfig&lens=engineering&ref=home&view=network#atlas-explore-title",
  );
});

test("clearing a project removes its URL parameter without losing the active tab", () => {
  const url = updateAtlasUrl(
    new URL(
      "https://example.com/en/explorer?project=konfig&lens=scale&view=2d",
    ),
    { project: "" },
  );
  assert.equal(url, "/en/explorer?lens=scale&view=2d");
  const cleared = updateAtlasUrl(new URL(url, "https://example.com"), {
    lens: "product",
    view: "3d",
  });
  assert.equal(cleared, "/en/explorer");
});
