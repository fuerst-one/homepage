import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { loadTs } from "./helpers/load-ts.mjs";

const images = loadTs(
  new URL("../src/server/notion/notionImageProxy.ts", import.meta.url),
);

test("retired portfolio logos resolve to bundled originals", async () => {
  for (const name of [
    "bagsnboxes-logo.svg",
    "bwi-logo.jpeg",
    "faaren-logo.png",
    "kleineralsraute.png",
    "mobilede-logo.svg",
    "numobility-logo.jpg",
    "piercheck-logo.svg",
    "playlist-canvas.png",
    "public-searoutes.svg",
    "seabo.svg",
    "sophisticates.png",
    "staehler.png",
  ]) {
    const path = `/img/logos/${name}`;
    assert.equal(
      images.getLegacyLogoPath(`https://portfolio.fuerst.one${path}`),
      path,
    );
    const bytes = await readFile(new URL(`../public${path}`, import.meta.url));
    assert.ok(bytes.length > 0, `${name} must ship with the site`);
  }
});

test("unrelated and unknown image URLs keep their existing proxy behavior", () => {
  for (const url of [
    "https://prod-files-secure.s3.us-west-2.amazonaws.com/logo.svg",
    "https://example.com/img/logos/seabo.svg",
    "https://portfolio.fuerst.one/img/logos/missing.svg",
    "https://portfolio.fuerst.one/private/seabo.svg",
    "invalid URL",
  ]) {
    assert.equal(images.getLegacyLogoPath(url), null);
  }
});

test("legacy logo proxy responses lead to usable images on the same site", async () => {
  const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";
  for (const [id, name] of [
    ["23b40e8e-626f-4fcf-9c04-83684b404adb", "mobilede-logo.svg"],
    ["153f6668-f4d6-490a-8345-0b999b35305a", "seabo.svg"],
  ]) {
    const response = await fetch(`${base}/api/image/${id}/Logo`, {
      redirect: "manual",
      signal: AbortSignal.timeout(60000),
    });
    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), `/img/logos/${name}`);
    const image = await fetch(new URL(response.headers.get("location"), base));
    assert.equal(image.status, 200);
    assert.match(image.headers.get("content-type"), /^image\//);
    assert.ok((await image.arrayBuffer()).byteLength > 0);
  }
});
