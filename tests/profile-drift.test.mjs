import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { loadTs } from "./helpers/load-ts.mjs";
const m = loadTs(
  new URL("../packages/content/src/profilePixels.ts", import.meta.url),
);
const terms = Array.from({ length: 168 }, (_, i) => ({ id: `tools:${i}` }));
const interests = terms.map((t, i) => ({
  ...t,
  score: ((i % 128) * 12) / 127,
}));
test("the approved compact format recovers every score at all eight orientations", () => {
  for (let orientation = 0; orientation < 360; orientation += 45) {
    const image = m.encodeProfilePixels(terms, interests, orientation);
    assert.equal(image.size, 16);
    assert.equal(m.profilePixelPalette().length, 256);
    assert.deepEqual(
      m.decodeProfilePixels(image.pixels, terms),
      Object.fromEntries(terms.map((t, i) => [t.id, i % 128])),
    );
  }
});
test("all approved fixture images decode with the same public catalog", () => {
  // Public catalog and integer scores are copied into the test fixture below.
  const { catalog, scores, interactions, pixels } = JSON.parse(
    readFileSync(new URL("./fixtures/profile-drift.json", import.meta.url)),
  );
  for (let angle = 0; angle < 360; angle += 45) {
    assert.deepEqual(m.decodeProfilePixels(pixels[angle], catalog), scores);
    assert.equal(
      m.decodeProfileInteractions(pixels[angle], catalog),
      interactions[angle],
    );
  }
});

test("quantization still clamps invalid scores and preserves priority and exclusion", () => {
  const image = m.encodeProfilePixels(terms, [
    { id: terms[0].id, score: -1 },
    { id: terms[1].id, score: 12 },
    { id: terms[2].id, score: 6 },
    { id: terms[3].id, score: NaN },
  ]);
  const decoded = m.decodeProfilePixels(image.pixels, terms);
  assert.deepEqual(
    Object.values(decoded)
      .sort((a, b) => b - a)
      .slice(0, 4),
    [127, 64, 0, 0],
  );
});
test("larger catalogs retain every field across error-correction block boundaries", () => {
  for (const count of [0, 1, 167, 169, 240, 271, 272, 600]) {
    const catalog = Array.from({ length: count }, (_, i) => ({
      id: `tools:${i}`,
    }));
    const input = catalog.map((t, i) => ({
      ...t,
      score: ((i % 128) * 12) / 127,
    }));
    const image = m.encodeProfilePixels(catalog, input, 225);
    assert.deepEqual(
      m.decodeProfilePixels(image.pixels, catalog),
      Object.fromEntries(catalog.map((t, i) => [t.id, i % 128])),
    );
    assert.ok(m.profilePixelCapacity(count).maxTerms >= count);
  }
});
test("correction recovers damaged data cells while marker and catalog mismatches fail", () => {
  const image = m.encodeProfilePixels(terms, interests);
  const colors = m.profilePixelPalette();
  const pixels = [...image.pixels];
  // One changed six-bit symbol affects at most two bytes, within the eight-byte budget.
  pixels[120] = colors[(colors.indexOf(pixels[120]) + 1) % 64];
  assert.deepEqual(
    m.decodeProfilePixels(pixels, terms),
    m.decodeProfilePixels(image.pixels, terms),
  );
  const wrongMarker = [...image.pixels];
  wrongMarker[0] = 0;
  assert.throws(
    () => m.decodeProfilePixels(wrongMarker, terms),
    /orientation/i,
  );
  assert.throws(
    () =>
      m.decodeProfilePixels(
        image.pixels,
        terms.map((t, i) => (i ? t : { id: "tools:Other" })),
      ),
    /catalog/i,
  );
});
test("legacy images remain readable through the public decoder", () => {
  const legacy = loadTs(
    new URL("../packages/content/src/profilePixelsLegacy.ts", import.meta.url),
  );
  assert.deepEqual(
    m.decodeProfilePixels(
      legacy.encodeProfilePixels(terms, interests).pixels,
      terms,
    ),
    Object.fromEntries(terms.map((t, i) => [t.id, i % 128])),
  );
});
test("pointer directions select eight clockwise sectors and invalid geometry has a stable fallback", () => {
  for (const [x, y, expected] of [
    [1000, 500, 0],
    [1000, 1000, 45],
    [500, 1000, 90],
    [0, 1000, 135],
    [0, 500, 180],
    [0, 0, 225],
    [500, 0, 270],
    [1000, 0, 315],
  ])
    assert.equal(m.profileOrientationAt(x, y, 1000, 1000), expected);
  assert.equal(m.profileOrientationAt(NaN, 0, 1000, 1000), 0);
  assert.equal(m.profileOrientationAt(1, 1, 0, 0), 0);
});

const drift = loadTs(
  new URL("../packages/content/src/profilePixelDrift.ts", import.meta.url),
);
const MAGENTA = 3,
  CORAL = 0,
  LIME = 1,
  AZURE = 2;
const BAND_ORDER = [MAGENTA, CORAL, LIME, AZURE];
const ORIENTATIONS = [0, 45, 90, 135, 180, 225, 270, 315];
const PHASES = [0, 0.5, 1.3, 3.7, 9.1, 40];
const FREE_CELLS = 231;
const familyTerms = [
  { id: "capabilities:Business Development" },
  { id: "capabilities:Frontend Development" },
  { id: "buyerNeeds:Add AI capabilities" },
  { id: "methods:User Research" },
  ...terms.slice(4),
];
const familyTerm = (hue) => familyTerms[hue].id;
function hueAt(pixels) {
  const index = new Map(m.profilePixelPalette().map((c, i) => [c, i >> 6]));
  return pixels.map((color) => index.get(color) ?? -1);
}
function hueHistogram(pixels) {
  const counts = [0, 0, 0, 0];
  for (const hue of hueAt(pixels)) if (hue >= 0) counts[hue]++;
  return counts;
}

test("the drift field folds into a wave without a seam", () => {
  let largestStep = 0;
  for (const phase of [0, 2.5])
    for (let y = 0; y <= 15; y += 0.5)
      for (let x = 0; x < 15; x += 0.01)
        largestStep = Math.max(
          largestStep,
          Math.abs(
            drift.driftField(x + 0.01, y, phase) -
              drift.driftField(x, y, phase),
          ),
        );
  assert.ok(largestStep < 0.1, `largest step ${largestStep}`);
});

test("with equal colour areas the two end colours of the wave never touch", () => {
  for (const orientation of ORIENTATIONS)
    for (const phase of PHASES) {
      const payload = m.encodeProfilePayload(terms, []);
      const { size, shades } = payload;
      const hues = hueAt(m.paintProfilePixels(payload, orientation, phase));
      const inWave = (at) => shades[at] >= 0;
      let touching = 0;
      hues.forEach((hue, at) => {
        if (!inWave(at)) return;
        const right = (at + 1) % size ? at + 1 : -1,
          below = at + size;
        for (const next of [right, below]) {
          if (next < 0 || next >= hues.length || !inWave(next)) continue;
          const pair = [hue, hues[next]];
          if (pair.includes(MAGENTA) && pair.includes(AZURE)) touching++;
        }
      });
      assert.equal(touching, 0, `orientation ${orientation}, phase ${phase}`);
    }
});

test("bands rise from magenta through coral and lime to azure", () => {
  const { size, pixels } = m.encodeProfilePixels(terms, []);
  const { shades } = m.encodeProfilePayload(terms, []);
  const heights = [[], [], [], []];
  hueAt(pixels).forEach((hue, at) => {
    if (shades[at] >= 0)
      heights[hue].push(drift.driftField(at % size, Math.floor(at / size)));
  });
  const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;
  const ordered = BAND_ORDER.map((hue) => mean(heights[hue]));
  assert.deepEqual(
    [...ordered].sort((a, b) => a - b),
    ordered,
  );
});

test("every colour keeps at least five percent of the free cells", () => {
  const minimum = Math.round(FREE_CELLS * m.PROFILE_PIXEL_MIN_SHARE);
  assert.equal(minimum, 12);
  for (const active of BAND_ORDER) {
    const interests = [{ id: familyTerm(active), score: 12 }];
    const { hueCounts } = m.encodeProfilePayload(familyTerms, interests);
    assert.deepEqual(
      hueCounts,
      [0, 1, 2, 3].map((hue) =>
        hue === active ? FREE_CELLS - 3 * minimum : minimum,
      ),
    );
    const image = m.encodeProfilePixels(familyTerms, interests);
    // Two calibration cells per colour sit outside the wave.
    assert.deepEqual(
      hueHistogram(image.pixels),
      hueCounts.map((count) => count + 2),
    );
    assert.equal(
      m.decodeProfilePixels(image.pixels, familyTerms)[familyTerm(active)],
      127,
    );
  }
});

test("colour areas beyond the minimum follow family interest and start equal", () => {
  const { hueCounts } = m.encodeProfilePayload(familyTerms, [
    { id: familyTerm(LIME), score: 3 },
    { id: familyTerm(AZURE), score: 9 },
  ]);
  assert.deepEqual(hueCounts, [12, 58, 149, 12]);
  assert.deepEqual(
    m.encodeProfilePayload(familyTerms, []).hueCounts,
    [58, 58, 58, 57],
  );
});

test("flow and rotation move colours without changing their counts or the decoded scores", () => {
  const expected = Object.fromEntries(terms.map((t, i) => [t.id, i % 128]));
  const payload = m.encodeProfilePayload(terms, interests);
  const still = m.paintProfilePixels(payload, 0, 0);
  const layouts = new Set();
  for (const orientation of ORIENTATIONS)
    for (const phase of PHASES) {
      const pixels = m.paintProfilePixels(payload, orientation, phase);
      assert.deepEqual(hueHistogram(pixels), hueHistogram(still));
      assert.deepEqual(m.decodeProfilePixels(pixels, terms), expected);
      layouts.add(hueAt(pixels).join());
    }
  assert.ok(layouts.size > ORIENTATIONS.length, "flow changes the layout");
});

test("each interaction moves the resting wave by one fixed step, the same every time", () => {
  assert.equal(m.PROFILE_PIXEL_PHASE_PER_INTERACTION, 0.25);
  const resting = (interactions) =>
    m.encodeProfilePixels(terms, interests, 135, interactions).pixels;
  let moved = 0;
  for (let interactions = 0; interactions < 50; interactions++) {
    const payload = m.encodeProfilePayload(terms, interests, interactions);
    assert.deepEqual(
      resting(interactions),
      m.paintProfilePixels(
        payload,
        135,
        interactions * m.PROFILE_PIXEL_PHASE_PER_INTERACTION,
      ),
    );
    if (
      hueAt(resting(interactions)).join() !==
      hueAt(resting(interactions + 1)).join()
    )
      moved++;
  }
  assert.ok(moved >= 45, `${moved} of 50 steps moved the wave`);
  const payload = m.encodeProfilePayload(terms, interests);
  assert.throws(() => m.paintProfilePixels(payload, 30, 0), /orientation/i);
  assert.throws(() => m.paintProfilePixels(payload, 0, NaN), /phase/i);
});

test("the image carries the exact interaction count next to every score", () => {
  const expected = Object.fromEntries(terms.map((t, i) => [t.id, i % 128]));
  assert.equal(m.PROFILE_PIXEL_MAX_INTERACTIONS, 65535);
  for (const interactions of [0, 1, 255, 4096, 65535]) {
    const image = m.encodeProfilePixels(terms, interests, 90, interactions);
    assert.equal(image.size, 16);
    assert.equal(
      m.decodeProfileInteractions(image.pixels, terms),
      interactions,
    );
    assert.deepEqual(m.decodeProfilePixels(image.pixels, terms), expected);
  }
});

test("interaction counts beyond sixteen bits saturate and invalid ones count as none", () => {
  for (const [given, stored] of [
    [65536, 65535],
    [1e9, 65535],
    [-1, 0],
    [1.5, 0],
    [NaN, 0],
    ["7", 0],
    [undefined, 0],
  ]) {
    assert.equal(m.clampProfileInteractions(given), stored);
    const image = m.encodeProfilePixels(terms, interests, 0, given);
    assert.equal(m.decodeProfileInteractions(image.pixels, terms), stored);
  }
});

test("a catalog of another length is rejected although the header no longer stores the length", () => {
  const image = m.encodeProfilePixels(terms, interests, 0, 167);
  assert.equal(m.profilePixelCapacity(167).size, image.size);
  assert.throws(
    () => m.decodeProfilePixels(image.pixels, terms.slice(0, 167)),
    /catalog/i,
  );
  assert.throws(
    () => m.decodeProfileInteractions(image.pixels, terms.slice(0, 167)),
    /catalog/i,
  );
});

test("legacy images decode with no interaction count", () => {
  const legacy = loadTs(
    new URL("../packages/content/src/profilePixelsLegacy.ts", import.meta.url),
  );
  assert.equal(
    m.decodeProfileInteractions(
      legacy.encodeProfilePixels(terms, interests).pixels,
      terms,
    ),
    0,
  );
});

test("the palette pairs the site's primary lime with coral, azure and magenta", () => {
  assert.deepEqual([...m.PROFILE_PIXEL_HUES], [18, 81.21, 198, 300]);
  const css = readFileSync(
    new URL("../apps/web/src/app/globals.css", import.meta.url),
    "utf8",
  );
  const primaryHue = Number(css.match(/--primary:\s*([\d.]+)/)[1]);
  assert.equal(m.PROFILE_PIXEL_HUES[LIME], primaryHue);
  const hueOf = (color) => {
    const [r, g, b] = [color >> 16, (color >> 8) & 255, color & 255];
    const max = Math.max(r, g, b),
      delta = max - Math.min(r, g, b);
    const sector =
      max === r
        ? ((g - b) / delta + 6) % 6
        : max === g
          ? (b - r) / delta + 2
          : (r - g) / delta + 4;
    return sector * 60;
  };
  m.profilePixelPalette().forEach((color, i) => {
    const expected = m.PROFILE_PIXEL_HUES[i >> 6];
    assert.ok(Math.abs(hueOf(color) - expected) < 2, `shade ${i}`);
  });
  const legacy = loadTs(
    new URL("../packages/content/src/profilePixelsLegacy.ts", import.meta.url),
  );
  assert.deepEqual([...legacy.PROFILE_PIXEL_HUES], [27, 81.21, 213, 333]);
});

test("the text code carries exactly what the picture carries", () => {
  const expected = Object.fromEntries(terms.map((t, i) => [t.id, i % 128]));
  for (const interactions of [0, 6, 65535]) {
    const payload = m.encodeProfilePayload(terms, interests, interactions);
    const text = m.encodeProfileText(payload);
    assert.match(text, /^[A-Za-z0-9_-]+$/);
    assert.equal(text.length, 208);
    assert.deepEqual(m.decodeProfileText(text, terms), {
      scores: expected,
      interactions,
    });
    const pixels = m.paintProfilePixels(payload, 225, 3);
    assert.deepEqual(m.decodeProfileText(text, terms).scores, {
      ...m.decodeProfilePixels(pixels, terms),
    });
  }
});

test("a text code is rejected when damaged, truncated or read with another catalog", () => {
  const text = m.encodeProfileText(m.encodeProfilePayload(terms, interests, 6));
  const swapped =
    text.slice(0, 100) + (text[100] === "A" ? "B" : "A") + text.slice(101);
  assert.throws(() => m.decodeProfileText(swapped, terms), /checksum/i);
  assert.throws(() => m.decodeProfileText(text.slice(0, -4), terms), /length/i);
  assert.throws(() => m.decodeProfileText(text + "!", terms), /format/i);
  assert.throws(() => m.decodeProfileText("", terms), /length/i);
  assert.throws(
    () =>
      m.decodeProfileText(
        text,
        terms.map((t, i) => (i ? t : { id: "tools:Other" })),
      ),
    /catalog/i,
  );
});

const channelsOf = (color) => [color >> 16, (color >> 8) & 255, color & 255];
const colorOf = (rgb) =>
  (Math.round(rgb[0]) << 16) | (Math.round(rgb[1]) << 8) | Math.round(rgb[2]);
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
function nearestPaletteColors(colors) {
  const palette = m.profilePixelPalette();
  return colors.map((color) => {
    if (color === 0 || color === 0xffffff) return color;
    const rgb = channelsOf(color);
    return palette.reduce((best, candidate) =>
      distance(channelsOf(candidate), rgb) < distance(channelsOf(best), rgb)
        ? candidate
        : best,
    );
  });
}

test("recovery restores the exact picture from colours a compressed copy has shifted", () => {
  const image = m.encodeProfilePixels(terms, interests, 135, 6);
  let seed = 7;
  const noise = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return (seed % 7) - 3;
  };
  const shifted = image.pixels.map((color) =>
    colorOf(
      channelsOf(color).map((v) => Math.max(0, Math.min(255, v + noise()))),
    ),
  );
  assert.throws(() => m.decodeProfilePixels(shifted, terms));
  const recovered = m.recoverProfilePixels(shifted, terms);
  assert.deepEqual(recovered, image.pixels);
  assert.equal(m.decodeProfileInteractions(recovered, terms), 6);
});

test("recovery retries its least certain cells when too many are wrong for error correction", () => {
  const image = m.encodeProfilePixels(terms, interests, 0, 6);
  const palette = m.profilePixelPalette();
  const { shades } = m.encodeProfilePayload(terms, interests, 6);
  const waveCells = shades.flatMap((shade, at) => (shade >= 0 ? [at] : []));
  const misleading = [...image.pixels];
  // Twelve cells drift most of the way to the neighbouring shade of their hue.
  for (let i = 0; i < 12; i++) {
    const at = waveCells[5 + i * 19];
    const index = palette.indexOf(image.pixels[at]);
    const own = channelsOf(image.pixels[at]);
    const neighbour = palette
      .filter((_, k) => k >> 6 === index >> 6 && k !== index)
      .map(channelsOf)
      .reduce((a, b) => (distance(b, own) < distance(a, own) ? b : a));
    misleading[at] = colorOf(own.map((v, k) => v + (neighbour[k] - v) * 0.6));
  }
  assert.throws(
    () => m.decodeProfilePixels(nearestPaletteColors(misleading), terms),
    "matching every cell to its nearest shade is not enough here",
  );
  assert.deepEqual(m.recoverProfilePixels(misleading, terms), image.pixels);
});

test("recovery refuses pictures it cannot repair, misplaced markers and wrong sizes", () => {
  const image = m.encodeProfilePixels(terms, interests, 0, 6);
  let seed = 3;
  const scrambled = image.pixels.map((color) => {
    if (color === 0 || color === 0xffffff) return color;
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return m.profilePixelPalette()[seed % 256];
  });
  assert.throws(() => m.recoverProfilePixels(scrambled, terms), /recover/i);
  const quarterTurn = image.pixels.map(
    (_, at) => image.pixels[(15 - (at % 16)) * 16 + Math.floor(at / 16)],
  );
  assert.throws(
    () => m.recoverProfilePixels(quarterTurn, terms),
    /orientation/i,
  );
  assert.throws(
    () => m.recoverProfilePixels(image.pixels.slice(1), terms),
    /dimensions/i,
  );
});
