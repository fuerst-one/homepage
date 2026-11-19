import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync } from "node:fs";
import { loadTs } from "./helpers/load-ts.mjs";
const source = new URL(
  "../packages/content/src/profilePixelsLegacy.ts",
  import.meta.url,
);
const m = existsSync(source) ? loadTs(source) : {};
const terms = Array.from({ length: 168 }, (_, i) => ({
  id: `tools:Term ${String(i).padStart(3, "0")}`,
  facet: "tools",
  value: `Term ${i}`,
}));
const interests = terms.map((t, i) => ({
  ...t,
  score: ((i % 128) * 12) / 127,
}));

test("the 128-level region signature recovers every interest from its RGB pixels", () => {
  const signature = m.encodeProfilePixels(terms, interests);
  assert.equal(signature.size, 12);
  assert.equal(signature.levels, 128);
  const bytes = Uint8Array.from(
    signature.pixels.flatMap((rgb) => [
      rgb >>> 16,
      (rgb >>> 8) & 255,
      rgb & 255,
    ]),
  );
  const colors = Array.from(
    { length: bytes.length / 3 },
    (_, i) => (bytes[i * 3] << 16) | (bytes[i * 3 + 1] << 8) | bytes[i * 3 + 2],
  );
  assert.deepEqual(
    m.decodeProfilePixels(colors, terms),
    Object.fromEntries(terms.map((t, i) => [t.id, i % 128])),
  );
});

test("catalog order cannot change the signature", () => {
  assert.deepEqual(
    m.encodeProfilePixels([...terms].reverse(), interests),
    m.encodeProfilePixels(terms, [...interests].reverse()),
  );
});

test("quantization clamps scores and preserves explicit rejection and priority", () => {
  const input = [
    { id: terms[0].id, score: -1 },
    { id: terms[1].id, score: 12 },
    { id: terms[2].id, score: 6 },
    { id: terms[3].id, score: Infinity },
  ];
  const decoded = m.decodeProfilePixels(
    m.encodeProfilePixels(terms, input).pixels,
    terms,
  );
  assert.equal(decoded[terms[0].id], 0);
  assert.equal(decoded[terms[1].id], 127);
  assert.equal(decoded[terms[2].id], 64);
  assert.equal(decoded[terms[3].id], 0);
});

test("all-zero and maximum profiles are recovered exactly", () => {
  for (const score of [0, 12]) {
    const signature = m.encodeProfilePixels(
      terms,
      terms.map((t) => ({ ...t, score })),
    );
    assert.deepEqual(
      Object.values(m.decodeProfilePixels(signature.pixels, terms)),
      Array(168).fill(score ? 127 : 0),
    );
  }
});

test("a changed catalog is rejected rather than attaching scores to wrong interests", () => {
  const signature = m.encodeProfilePixels(terms, interests);
  const other = terms.map((t, i) =>
    i === 0 ? { ...t, id: "tools:Different" } : t,
  );
  assert.throws(
    () => m.decodeProfilePixels(signature.pixels, other),
    /catalog/i,
  );
});

test("changed data pixels fail integrity checks", () => {
  const signature = m.encodeProfilePixels(terms, interests);
  const palette = m.profilePixelPalette();
  const pixels = [...signature.pixels];
  pixels[90] = palette[(palette.indexOf(pixels[90]) + 1) % palette.length];
  assert.throws(() => m.decodeProfilePixels(pixels, terms), /checksum/i);
});

test("larger future catalogs grow the grid without silently losing interests", () => {
  const larger = Array.from({ length: 240 }, (_, i) => ({ id: `tools:${i}` }));
  const signature = m.encodeProfilePixels(
    larger,
    larger.map((t) => ({ ...t, score: 12 })),
  );
  assert.ok(signature.size > 12);
  assert.equal(
    Object.keys(m.decodeProfilePixels(signature.pixels, larger)).length,
    240,
  );
});

test("catalogs whose score bits do not fill a byte still round-trip", () => {
  for (const count of [0, 1, 3, 167, 169]) {
    const subset = terms.slice(0, count);
    const signature = m.encodeProfilePixels(subset, interests);
    assert.deepEqual(
      m.decodeProfilePixels(signature.pixels, subset),
      Object.fromEntries(subset.map((t, i) => [t.id, i % 128])),
    );
  }
});

test("the current grid leaves 23 spare pixels and space for 39 more fields with orientation markers", () => {
  assert.deepEqual(m.profilePixelCapacity(168), {
    size: 12,
    spareBits: 276,
    maxTerms: 207,
    extraTerms: 39,
  });
  const full = Array.from({ length: 207 }, (_, i) => ({
    id: `tools:Future ${i}`,
  }));
  const signature = m.encodeProfilePixels(
    full,
    full.map((t) => ({ ...t, score: 12 })),
  );
  assert.equal(signature.size, 12);
  assert.equal(
    Object.keys(m.decodeProfilePixels(signature.pixels, full)).length,
    207,
  );
  assert.equal(m.profilePixelCapacity(208).size, 13);
});

test("unused capacity fills corner pockets around the black-and-white orientation markers", () => {
  const semanticTerms = [
    { id: "capabilities:Frontend Development" },
    ...terms.slice(1),
  ];
  const signature = m.encodeProfilePixels(semanticTerms, [
    { id: semanticTerms[0].id, score: 12 },
  ]);
  const palette = m.profilePixelPalette();
  const black = [11, 13, 22, 121];
  const white = [0, 1, 2, 10, 12, 14, 23, 24, 25, 26, 120, 132, 133];
  for (const at of black) assert.equal(signature.pixels[at], 0);
  for (const at of white) assert.equal(signature.pixels[at], 0xffffff);
  assert.equal(
    signature.pixels.filter((rgb) => rgb === 0 || rgb === 0xffffff).length,
    17,
  );
  const spare = [
    8, 21, 34, 36, 47, 96, 107, 109, 118, 122, 129, 135, 140, 9, 35, 108, 119,
    130, 134, 141, 131, 142, 143,
  ];
  assert.equal(spare.length, 23);
  for (const at of spare)
    assert.equal(palette.indexOf(signature.pixels[at]) % 4096, 0);
  const corrupted = [...signature.pixels];
  corrupted[143] = palette[palette.indexOf(corrupted[143]) + 1];
  assert.throws(
    () => m.decodeProfilePixels(corrupted, semanticTerms),
    /padding/i,
  );
});

test("interest families change region areas while every score remains recoverable", () => {
  const semanticTerms = [
    { id: "buyerNeeds:Add AI capabilities" },
    { id: "capabilities:Frontend Development" },
    { id: "methods:User Research" },
    { id: "capabilities:Business Development" },
    { id: "capabilities:Native Development" },
    { id: "capabilities:Chat Bot Design" },
    ...terms.slice(6),
  ];
  const palette = m.profilePixelPalette();
  for (const [index, hue] of [
    [0, 2],
    [1, 1],
    [2, 3],
    [3, 0],
    [4, 1],
    [5, 3],
  ]) {
    const input = [{ id: semanticTerms[index].id, score: 12 }];
    const signature = m.encodeProfilePixels(semanticTerms, input);
    const hueCount = signature.pixels.filter(
      (rgb) => rgb !== 0 && Math.floor(palette.indexOf(rgb) / 4096) === hue,
    ).length;
    assert.equal(hueCount, 127);
    assert.equal(
      m.decodeProfilePixels(signature.pixels, semanticTerms)[input[0].id],
      127,
    );
  }
});

test("hues can identify interest regions without consuming the shade payload", () => {
  const signature = m.encodeProfilePixels(terms, interests);
  const palette = m.profilePixelPalette();
  const recolored = signature.pixels.map((rgb, at) =>
    rgb === 0 || rgb === 0xffffff
      ? rgb
      : palette[(palette.indexOf(rgb) % 4096) + (at % 4) * 4096],
  );
  assert.deepEqual(
    m.decodeProfilePixels(recolored, terms),
    m.decodeProfilePixels(signature.pixels, terms),
  );
});

test("unknown colours, orientation changes, and duplicate catalog IDs are rejected", () => {
  const signature = m.encodeProfilePixels(terms, interests);
  const wrongCorner = [...signature.pixels];
  wrongCorner[0] = 0;
  assert.throws(
    () => m.decodeProfilePixels(wrongCorner, terms),
    /orientation/i,
  );
  const wrongCentre = [...signature.pixels];
  wrongCentre[13] = 0xffffff;
  assert.throws(
    () => m.decodeProfilePixels(wrongCentre, terms),
    /orientation/i,
  );
  const unknown = [...signature.pixels];
  unknown[65] = 0xffffff;
  assert.throws(() => m.decodeProfilePixels(unknown, terms), /colou?r/i);
  assert.throws(
    () => m.encodeProfilePixels([terms[0], terms[0]], []),
    /catalog/i,
  );
});
