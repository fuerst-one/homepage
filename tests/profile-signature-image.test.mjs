import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import sharp from "sharp";
import { loadTs } from "./helpers/load-ts.mjs";
const codec = loadTs(
  new URL("../packages/content/src/profilePixels.ts", import.meta.url),
);
const path = new URL(
  "../packages/content/src/profileSignatureImage.ts",
  import.meta.url,
);
const m = existsSync(path) ? loadTs(path) : {};
const terms = Array.from({ length: 168 }, (_, i) => ({ id: `tools:${i}` }));
const interests = terms.map((t, i) => ({ id: t.id, score: (i * 5) % 13 }));
const SIZE = 16;
const channelsOf = (color) => [color >> 16, (color >> 8) & 255, color & 255];
let seed = 19;
const random = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};

/**
 * Draws the signature into a dark page the way a screenshot shows it: cells of
 * `scale` pixels with blended edges, at a fractional position, surrounded by
 * light text-like marks.
 */
function screenshot(
  pixels,
  { scale, left, top, width, height, alpha = false },
) {
  const channels = alpha ? 4 : 3,
    data = new Uint8Array(width * height * channels),
    SUB = 4;
  const marks = Array.from({ length: 60 }, () => ({
    x: random() * width,
    y: random() * height,
    w: 2 + random() * 9,
    h: 2 + random() * 12,
    level: 110 + random() * 145,
  })).filter(
    (mark) =>
      mark.x + mark.w < left - scale ||
      mark.x > left + SIZE * scale + scale ||
      mark.y + mark.h < top - scale ||
      mark.y > top + SIZE * scale + scale,
  );
  const colourAt = (x, y) => {
    const u = (x - left) / scale,
      v = (y - top) / scale;
    if (u >= 0 && v >= 0 && u < SIZE && v < SIZE)
      return channelsOf(pixels[Math.floor(v) * SIZE + Math.floor(u)]);
    const mark = marks.find(
      (k) => x >= k.x && x < k.x + k.w && y >= k.y && y < k.y + k.h,
    );
    return mark ? [mark.level, mark.level, mark.level] : [9, 11, 8];
  };
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const sum = [0, 0, 0];
      for (let j = 0; j < SUB; j++)
        for (let i = 0; i < SUB; i++)
          colourAt(x + (i + 0.5) / SUB, y + (j + 0.5) / SUB).forEach(
            (value, k) => (sum[k] += value),
          );
      const at = (y * width + x) * channels;
      sum.forEach((value, k) => (data[at + k] = Math.round(value / SUB ** 2)));
      if (alpha) data[at + 3] = 255;
    }
  return { width, height, channels, data };
}
const picture = (orientation = 135, interactions = 6) =>
  codec.encodeProfilePixels(terms, interests, orientation, interactions).pixels;
const expectedScores = () => codec.decodeProfilePixels(picture(), terms);

test("a signature is found among light page text and read exactly", () => {
  assert.equal(typeof m.readProfileSignatureImage, "function");
  const pixels = picture();
  const image = screenshot(pixels, {
    scale: 7.5,
    left: 61.3,
    top: 48.7,
    width: 320,
    height: 260,
  });
  const read = m.readProfileSignatureImage(image, terms);
  assert.deepEqual(read.pixels, pixels);
  assert.deepEqual(read.scores, expectedScores());
  assert.equal(read.interactions, 6);
  const [topLeft, , bottomRight] = read.corners;
  for (const [found, expected] of [
    [topLeft, [61.3, 48.7]],
    [bottomRight, [61.3 + 120, 48.7 + 120]],
  ])
    found.forEach((value, k) =>
      assert.ok(
        Math.abs(value - expected[k]) < 0.75,
        `corner ${found} is not at ${expected}`,
      ),
    );
});

test("launcher-sized and page-sized signatures are both read, with or without an alpha channel", () => {
  for (const [scale, alpha] of [
    [3.75, false],
    [12, true],
    [24, false],
  ]) {
    const pixels = picture(0, 300);
    const image = screenshot(pixels, {
      scale,
      left: 40.5,
      top: 33.25,
      width: Math.ceil(SIZE * scale + 110),
      height: Math.ceil(SIZE * scale + 90),
      alpha,
    });
    const read = m.readProfileSignatureImage(image, terms);
    assert.deepEqual(read.pixels, pixels, `at ${scale} pixels per cell`);
    assert.equal(read.interactions, 300);
  }
});

test("a noisy copy with compressed colours is still read", () => {
  const pixels = picture();
  const image = screenshot(pixels, {
    scale: 7.5,
    left: 30,
    top: 26,
    width: 190,
    height: 180,
  });
  for (let i = 0; i < image.data.length; i++)
    image.data[i] = Math.max(
      0,
      Math.min(
        255,
        Math.round(image.data[i] * 0.97 + 3 + (random() - 0.5) * 8),
      ),
    );
  const read = m.readProfileSignatureImage(image, terms);
  assert.deepEqual(read.scores, expectedScores());
  assert.equal(read.interactions, 6);
});

test("the corners and cell colours can be taken separately", () => {
  const pixels = picture();
  const image = screenshot(pixels, {
    scale: 10,
    left: 20,
    top: 20,
    width: 220,
    height: 210,
  });
  const corners = m.locateProfileSignature(image, SIZE);
  assert.ok(corners);
  assert.deepEqual(m.sampleProfileSignature(image, corners, SIZE), pixels);
});

test("an image without a signature says so", () => {
  const blank = screenshot(picture(), {
    scale: 7.5,
    left: 5000,
    top: 5000,
    width: 240,
    height: 200,
  });
  assert.equal(m.locateProfileSignature(blank, SIZE), null);
  assert.throws(() => m.readProfileSignatureImage(blank, terms), /not found/i);
});

test("the command-line script reads an image file and reports what it cannot read", async () => {
  const run = promisify(execFile);
  const root = fileURLToPath(new URL("..", import.meta.url));
  const folder = mkdtempSync(join(tmpdir(), "profile-signature-"));
  const script = (...args) =>
    run(
      process.execPath,
      ["--import", "tsx", "scripts/read-profile-signature.mjs", ...args],
      { cwd: root },
    );
  const save = (image, name) =>
    sharp(Buffer.from(image.data), {
      raw: { width: image.width, height: image.height, channels: 3 },
    })
      .png()
      .toFile(join(folder, name));
  try {
    const catalog = join(folder, "catalog.json");
    writeFileSync(
      catalog,
      JSON.stringify({
        terms: terms.map((t) => ({ ...t, facet: "tools", value: t.id })),
      }),
    );
    const pixels = picture(135, 42);
    const shot = { scale: 7.5, left: 30.5, top: 22, width: 200, height: 170 };
    await save(screenshot(pixels, shot), "signature.png");
    await save(screenshot(pixels, { ...shot, left: 5000 }), "empty.png");

    const { stdout } = await script(
      join(folder, "signature.png"),
      "--catalog",
      catalog,
      "--json",
    );
    const read = JSON.parse(stdout);
    assert.equal(read.interactions, 42);
    assert.deepEqual(read.scores, codec.decodeProfilePixels(pixels, terms));
    assert.deepEqual(codec.decodeProfileText(read.code, terms), {
      scores: read.scores,
      interactions: 42,
    });

    const summary = await script(
      join(folder, "signature.png"),
      "--catalog",
      catalog,
    );
    assert.match(summary.stdout, /Interactions: 42/);

    await assert.rejects(
      script(join(folder, "empty.png"), "--catalog", catalog),
      (error) => error.code === 1 && /no profile signature/i.test(error.stderr),
    );
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
