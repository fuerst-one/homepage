import GenericGFModule from "@zxing/library/cjs/core/common/reedsolomon/GenericGF";
import ReedSolomonEncoderModule from "@zxing/library/cjs/core/common/reedsolomon/ReedSolomonEncoder";
import ReedSolomonDecoderModule from "@zxing/library/cjs/core/common/reedsolomon/ReedSolomonDecoder";
import type { ProfileTerm, ProfileInterest } from "./visitorProfile";
import {
  rgb,
  termIds,
  catalogFingerprint,
  checksum,
  pushBits,
  readBits,
  markerColor,
  familyWeights,
  payloadOrder as legacyOrder,
  decodeProfilePixels as decodeLegacy,
} from "./profilePixelsLegacy";
import { driftField } from "./profilePixelDrift";
// Bundlers hand over the class these CommonJS files export; Node's own module
// loader, which scripts run under, hands over { default: Class }.
const fromCommonJs = <T>(loaded: T): T =>
  (loaded as { default?: T }).default ?? loaded;
const GenericGF = fromCommonJs(GenericGFModule),
  ReedSolomonEncoder = fromCommonJs(ReedSolomonEncoderModule),
  ReedSolomonDecoder = fromCommonJs(ReedSolomonDecoderModule);
/**
 * Coral, lime, azure, magenta, indexed by interest family. Lime is the site's
 * primary colour; the other three were chosen to stay apart from it and from
 * each other across the whole shade range.
 */
export const PROFILE_PIXEL_HUES = [18, 81.21, 198, 300] as const;
export const PROFILE_PIXEL_LEVELS = 128;
/** Share of the wave reserved for each colour so none disappears with its family. */
export const PROFILE_PIXEL_MIN_SHARE = 0.05;
// Magenta, coral, lime, azure from the trough of the wave to its crest.
const BAND_ORDER = [3, 0, 1, 2];
export const PROFILE_PIXEL_MAX_INTERACTIONS = 0xffff;
/** How far one interaction moves the wave along the plasma's phase. */
export const PROFILE_PIXEL_PHASE_PER_INTERACTION = 0.25;
/** Saved or foreign values that are not a whole, non-negative count read as zero. */
export function clampProfileInteractions(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? Math.min(value, PROFILE_PIXEL_MAX_INTERACTIONS)
    : 0;
}
const SHADES = 64,
  CELL_BITS = 6,
  PARITY = 17,
  BLOCK_DATA = 238,
  VERSION = 0xa7;
type Term = Pick<ProfileTerm, "id">;
type Interest = Pick<ProfileInterest, "id" | "score">;
export type ProfilePixels = {
  size: number;
  pixels: number[];
  termCount: number;
  levels: 128;
};
/** Everything about a signature that stays fixed while its colours rotate and flow. */
export type ProfilePayload = {
  size: number;
  termCount: number;
  levels: 128;
  /** Six-bit shade per wave cell; -1 for marker and calibration cells. */
  shades: number[];
  /** Wave cells per hue. */
  hueCounts: number[];
  /** Interactions since the profile started; sets where the wave rests. */
  interactions: number;
  /** Payload bytes before error correction; the text code is these bytes. */
  data: number[];
};
export type ProfileOrientation = 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315;
export function isProfileOrientation(
  value: unknown,
): value is ProfileOrientation {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < 360 &&
    value % 45 === 0
  );
}
/** Direction in screen coordinates, clockwise from right. Only the resulting angle is retained. */
export function profileOrientationAt(
  x: number,
  y: number,
  width: number,
  height: number,
): ProfileOrientation {
  if (
    ![x, y, width, height].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0
  )
    return 0;
  return ((Math.round(
    Math.atan2(y - height / 2, x - width / 2) / (Math.PI / 4),
  ) *
    45 +
    360) %
    360) as ProfileOrientation;
}
function calibration(size: number) {
  return [
    { at: size * size - 1, hue: 0, code: 0 },
    { at: (size - 2) * size + size - 2, hue: 0, code: 1 },
    { at: 3, hue: 1, code: 0 },
    { at: 3 * size, hue: 1, code: 1 },
    { at: size - 3, hue: 2, code: 0 },
    { at: 3 * size - 1, hue: 2, code: 1 },
    { at: (size - 3) * size, hue: 3, code: 0 },
    { at: (size - 1) * size + 2, hue: 3, code: 1 },
  ];
}
function payloadOrder(size: number) {
  const fixed = new Set(calibration(size).map((c) => c.at));
  return legacyOrder(size).filter((at) => !fixed.has(at));
}
const channels = (color: number) => [
  color >>> 16,
  (color >>> 8) & 255,
  color & 255,
];
let palette: number[] | undefined;
/** The same separated 64-shade palette as the screenshot-tested study. */
export function profilePixelPalette(): readonly number[] {
  if (palette) return palette;
  palette = PROFILE_PIXEL_HUES.flatMap((hue) => {
    const candidates: number[] = [];
    for (let s = 50; s <= 82; s += 4)
      for (let l = 32; l <= 76; l++) candidates.push(rgb(hue, s, l));
    const colors = [...new Set(candidates)],
      vectors = colors.map(channels);
    const selected = [0, colors.length - 1],
      distance = vectors.map(() => Infinity);
    while (selected.length < SHADES) {
      for (const at of selected.slice(-2))
        for (let i = 0; i < vectors.length; i++)
          distance[i] = Math.min(
            distance[i],
            vectors[i].reduce(
              (sum, v, k) => sum + (v - vectors[at][k]) ** 2,
              0,
            ),
          );
      for (const at of selected) distance[at] = -1;
      let best = 0;
      for (let i = 1; i < distance.length; i++)
        if (distance[i] > distance[best]) best = i;
      selected.push(best);
    }
    return selected.map((i) => colors[i]);
  });
  return palette;
}
function blockLengths(termCount: number) {
  const dataBytes = Math.ceil((72 + 7 * termCount) / 8);
  return {
    dataBytes,
    blockBytes: dataBytes + PARITY * Math.ceil(dataBytes / BLOCK_DATA),
  };
}
export function profilePixelCapacity(termCount: number) {
  if (!Number.isInteger(termCount) || termCount < 0 || termCount > 65535)
    throw Error("Invalid profile catalog size");
  const { blockBytes } = blockLengths(termCount);
  const size = Math.max(
    16,
    Math.ceil(Math.sqrt(25 + Math.ceil((blockBytes * 8) / CELL_BITS))),
  );
  const availableBits = (size * size - 25) * CELL_BITS;
  const bytes = Math.floor(availableBits / 8),
    fullBlocks = Math.floor(bytes / 255),
    remainder = bytes % 255;
  const maxData = fullBlocks * BLOCK_DATA + Math.max(0, remainder - PARITY);
  const maxTerms = Math.min(65535, Math.floor((maxData * 8 - 72) / 7));
  return {
    size,
    spareBits: availableBits - blockBytes * 8,
    maxTerms,
    extraTerms: maxTerms - termCount,
  };
}
/** Each hue first gets its reserved share; family interest divides the rest. */
function waveHueCounts(
  waveCells: number,
  ids: readonly string[],
  values: readonly number[],
) {
  const weights = familyWeights(ids, values),
    total = weights.reduce((a, b) => a + b, 0);
  const reserved = Math.round(waveCells * PROFILE_PIXEL_MIN_SHARE),
    shared = waveCells - weights.length * reserved;
  const exact = weights.map(
    (weight) =>
      reserved + shared * (total ? weight / total : 1 / weights.length),
  );
  const counts = exact.map(Math.floor);
  const unassigned = waveCells - counts.reduce((a, b) => a + b, 0);
  const byRemainder = counts
    .map((_, hue) => hue)
    .sort((a, b) => exact[b] - counts[b] - (exact[a] - counts[a]) || a - b);
  for (let i = 0; i < unassigned; i++) counts[byRemainder[i]]++;
  return counts;
}
function waveHues(
  { size, shades, hueCounts }: ProfilePayload,
  orientation: ProfileOrientation,
  phase: number,
) {
  const radians = (orientation * Math.PI) / 180,
    c = Math.cos(radians),
    s = Math.sin(radians),
    center = (size - 1) / 2;
  const ranked: { at: number; height: number }[] = [];
  shades.forEach((shade, at) => {
    if (shade < 0) return;
    const x = (at % size) - center,
      y = Math.floor(at / size) - center;
    ranked.push({
      at,
      height: driftField(
        ((center + c * x + s * y) * 15) / (size - 1),
        ((center - s * x + c * y) * 15) / (size - 1),
        phase,
      ),
    });
  });
  ranked.sort((a, b) => a.height - b.height || a.at - b.at);
  const hues = Array<number>(size * size).fill(-1);
  let cursor = 0;
  for (const hue of BAND_ORDER)
    for (let i = 0; i < hueCounts[hue]; i++) hues[ranked[cursor++].at] = hue;
  return hues;
}
/** Colours one frame of the signature; only the hue layout depends on orientation and phase. */
export function paintProfilePixels(
  payload: ProfilePayload,
  orientation: ProfileOrientation = 0,
  phase = 0,
): number[] {
  if (!isProfileOrientation(orientation))
    throw Error("Invalid profile orientation");
  if (!Number.isFinite(phase)) throw Error("Invalid profile flow phase");
  const { size, shades } = payload,
    colors = profilePixelPalette(),
    hues = waveHues(payload, orientation, phase);
  const pixels = shades.map((shade, at) =>
    shade < 0
      ? (markerColor(at, size) ?? 0)
      : colors[hues[at] * SHADES + shade],
  );
  for (const cell of calibration(size))
    pixels[cell.at] = colors[cell.hue * SHADES + cell.code];
  return pixels;
}
/** Adds the parity bytes and splits the result into one six-bit shade per wave cell. */
function protectProfileData(data: readonly number[], waveCells: number) {
  const encoded: number[] = [];
  const encoder = new ReedSolomonEncoder(GenericGF.QR_CODE_FIELD_256);
  for (let offset = 0; offset < data.length; offset += BLOCK_DATA) {
    const count = Math.min(BLOCK_DATA, data.length - offset),
      block = new Int32Array(count + PARITY);
    for (let i = 0; i < count; i++) block[i] = data[offset + i];
    encoder.encode(block, PARITY);
    for (const byte of block) pushBits(encoded, byte, 8);
  }
  return Array.from({ length: waveCells }, (_, i) =>
    readBits(encoded, i * CELL_BITS, CELL_BITS),
  );
}
/** Quantize only at the image boundary; the scoring model keeps its current precision. */
export function encodeProfilePayload(
  terms: readonly Term[],
  interests: readonly Interest[],
  interactions = 0,
): ProfilePayload {
  const count = clampProfileInteractions(interactions),
    ids = termIds(terms),
    scores = new Map(interests.map((row) => [row.id, row.score]));
  const values = ids.map((id) => {
    const v = scores.get(id) ?? 0;
    return Math.round(
      ((Number.isFinite(v) ? Math.max(0, Math.min(12, v)) : 0) * 127) / 12,
    );
  });
  const bits: number[] = [];
  pushBits(bits, VERSION, 8);
  // The fingerprint already changes with the number of terms, which leaves
  // these sixteen bits free for the count without growing the grid.
  pushBits(bits, count, 16);
  pushBits(bits, catalogFingerprint(ids), 32);
  for (const value of values) pushBits(bits, value, 7);
  pushBits(bits, checksum(bits), 16);
  const data = Array.from(
    { length: blockLengths(ids.length).dataBytes },
    (_, i) => readBits(bits, i * 8, 8),
  );
  const { size } = profilePixelCapacity(ids.length),
    waveCells = payloadOrder(size),
    waveShades = protectProfileData(data, waveCells.length),
    shades = Array<number>(size * size).fill(-1);
  waveCells.forEach((at, i) => {
    shades[at] = waveShades[i];
  });
  return {
    size,
    termCount: ids.length,
    levels: PROFILE_PIXEL_LEVELS,
    shades,
    hueCounts: waveHueCounts(waveCells.length, ids, values),
    interactions: count,
    data,
  };
}
/** The signature at rest. Callers that animate keep the payload and paint it per frame. */
export function encodeProfilePixels(
  terms: readonly Term[],
  interests: readonly Interest[],
  orientation: ProfileOrientation = 0,
  interactions = 0,
): ProfilePixels {
  const payload = encodeProfilePayload(terms, interests, interactions);
  return {
    size: payload.size,
    pixels: paintProfilePixels(
      payload,
      orientation,
      payload.interactions * PROFILE_PIXEL_PHASE_PER_INTERACTION,
    ),
    termCount: payload.termCount,
    levels: payload.levels,
  };
}
/** Version, catalog and checksum checks shared by the picture and the text code. */
function verifyProfileData(data: readonly number[], ids: readonly string[]) {
  if (readBits(data, 0, 8) !== VERSION)
    throw Error("Pixel format version mismatch");
  if (readBits(data, 24, 32) !== catalogFingerprint(ids))
    throw Error("Profile catalog mismatch");
  const end = 56 + ids.length * 7;
  if (checksum(data.slice(0, end)) !== readBits(data, end, 16))
    throw Error("Pixel checksum mismatch");
  if (data.slice(end + 16).some(Boolean)) throw Error("Pixel padding mismatch");
}
const scoresIn = (data: readonly number[], ids: readonly string[]) =>
  Object.fromEntries(ids.map((id, i) => [id, readBits(data, 56 + i * 7, 7)]));
const interactionsIn = (data: readonly number[]) => readBits(data, 8, 16);
/** Corrects and verifies the shades of the wave cells, given in payload order. */
function correctProfileShades(
  shades: readonly number[],
  ids: readonly string[],
) {
  const bits: number[] = [];
  for (const shade of shades) pushBits(bits, shade, CELL_BITS);
  const { dataBytes } = blockLengths(ids.length),
    data: number[] = [];
  const decoder = new ReedSolomonDecoder(GenericGF.QR_CODE_FIELD_256);
  let cursor = 0;
  for (let offset = 0; offset < dataBytes; offset += BLOCK_DATA) {
    const count = Math.min(BLOCK_DATA, dataBytes - offset);
    const block = Int32Array.from({ length: count + PARITY }, () => {
      const value = readBits(bits, cursor, 8);
      cursor += 8;
      return value;
    });
    decoder.decode(block, PARITY);
    for (const byte of block.slice(0, count)) pushBits(data, byte, 8);
  }
  verifyProfileData(data, ids);
  return data;
}
/** Corrected, verified payload bits; null when the image has the legacy dimensions. */
function readProfileData(pixels: readonly number[], terms: readonly Term[]) {
  const ids = termIds(terms),
    { size } = profilePixelCapacity(ids.length);
  if (pixels.length !== size * size) return null;
  for (let at = 0; at < pixels.length; at++) {
    const fixed = markerColor(at, size);
    if (fixed !== null && pixels[at] !== fixed)
      throw Error("Pixel format orientation mismatch");
  }
  const lookup = new Map(
    profilePixelPalette().map((color, i) => [color, i % SHADES]),
  );
  const shades = payloadOrder(size).map((at) => {
    const shade = lookup.get(pixels[at]);
    if (shade === undefined) throw Error("Pixel format colour mismatch");
    return shade;
  });
  return { ids, data: correctProfileShades(shades, ids) };
}
export function decodeProfilePixels(
  pixels: readonly number[],
  terms: readonly Term[],
) {
  const read = readProfileData(pixels, terms);
  if (!read) return decodeLegacy(pixels, terms);
  return scoresIn(read.data, read.ids);
}
/** Interactions recorded when the image was made; legacy images predate the count. */
export function decodeProfileInteractions(
  pixels: readonly number[],
  terms: readonly Term[],
) {
  const read = readProfileData(pixels, terms);
  if (read) return interactionsIn(read.data);
  decodeLegacy(pixels, terms);
  return 0;
}
/** The payload as base64url text: the same bytes the picture carries, without error correction. */
export function encodeProfileText(payload: ProfilePayload) {
  return btoa(String.fromCharCode(...payload.data))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
export function decodeProfileText(text: string, terms: readonly Term[]) {
  const ids = termIds(terms);
  if (!/^[A-Za-z0-9_-]*$/.test(text))
    throw Error("Profile text format mismatch");
  if (text.length !== Math.ceil((blockLengths(ids.length).dataBytes * 4) / 3))
    throw Error("Profile text length mismatch");
  const data: number[] = [];
  for (const char of atob(text.replace(/-/g, "+").replace(/_/g, "/")))
    pushBits(data, char.charCodeAt(0), 8);
  verifyProfileData(data, ids);
  return { scores: scoresIn(data, ids), interactions: interactionsIn(data) };
}
// Image compression stores colour as brightness plus two colour differences
// and is coarsest in the latter, so shades are compared in that space.
const lumaChroma = ([r, g, b]: readonly number[]) => [
  0.299 * r + 0.587 * g + 0.114 * b,
  -0.169 * r - 0.331 * g + 0.5 * b,
  0.5 * r - 0.419 * g - 0.081 * b,
];
const shadeDistance = (a: readonly number[], b: readonly number[]) =>
  (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
let paletteLumaChroma: number[][] | undefined;
/** The nearest palette colour and the nearest one with another shade number. */
function nearestShades(rgb: readonly number[]) {
  paletteLumaChroma ??= profilePixelPalette().map((color) =>
    lumaChroma(channels(color)),
  );
  const seen = lumaChroma(rgb);
  let first = 0,
    firstDistance = Infinity;
  paletteLumaChroma.forEach((candidate, index) => {
    const distance = shadeDistance(candidate, seen);
    if (distance < firstDistance) {
      first = index;
      firstDistance = distance;
    }
  });
  let second = first,
    secondDistance = Infinity;
  paletteLumaChroma.forEach((candidate, index) => {
    if (index % SHADES === first % SHADES) return;
    const distance = shadeDistance(candidate, seen);
    if (distance < secondDistance) {
      second = index;
      secondDistance = distance;
    }
  });
  return {
    first,
    second,
    distance: firstDistance,
    margin: Math.sqrt(secondDistance) - Math.sqrt(firstDistance),
  };
}
// The colour fit repeats this often and learns only from cells this close to
// a shade, in units of the distance above.
const FAMILY_FIT_ROUNDS = 4,
  FAMILY_FIT_REACH = 5,
  CALIBRATION_WEIGHT = 6;
/**
 * Colour-space conversions and compression scale each colour family a little
 * differently, by more than the distance between two shades. This estimates a
 * gain and an offset per family and channel from the family's two calibration
 * cells and from the cells that already sit close to a shade, and returns the
 * colours with that undone.
 */
function fitColorFamilies(
  observed: readonly (readonly number[])[],
  size: number,
) {
  const palette = profilePixelPalette().map(channels);
  let corrected = observed;
  for (let round = 0; round < FAMILY_FIT_ROUNDS; round++) {
    const families = PROFILE_PIXEL_HUES.map(
      () =>
        [] as { seen: readonly number[]; truth: number[]; weight: number }[],
    );
    for (const cell of calibration(size))
      families[cell.hue].push({
        seen: observed[cell.at],
        truth: palette[cell.hue * SHADES + cell.code],
        weight: CALIBRATION_WEIGHT,
      });
    const hues = corrected.map((color, at) => {
      if (markerColor(at, size) !== null) return -1;
      const { first, distance } = nearestShades(color);
      const hue = Math.floor(first / SHADES);
      if (distance <= FAMILY_FIT_REACH ** 2)
        families[hue].push({
          seen: observed[at],
          truth: palette[first],
          weight: 1,
        });
      return hue;
    });
    const fits = families.map((pairs) =>
      [0, 1, 2].map((k) => {
        const total = pairs.reduce((sum, p) => sum + p.weight, 0);
        const meanTruth =
          pairs.reduce((sum, p) => sum + p.weight * p.truth[k], 0) / total;
        const meanSeen =
          pairs.reduce((sum, p) => sum + p.weight * p.seen[k], 0) / total;
        const gain =
          pairs.reduce(
            (sum, p) =>
              sum +
              p.weight * (p.truth[k] - meanTruth) * (p.seen[k] - meanSeen),
            0,
          ) /
          pairs.reduce(
            (sum, p) => sum + p.weight * (p.truth[k] - meanTruth) ** 2,
            0,
          );
        // A family without usable cells keeps its colours as they are.
        return Number.isFinite(gain) && gain > 0.5 && gain < 2
          ? { gain, offset: meanSeen - gain * meanTruth }
          : { gain: 1, offset: 0 };
      }),
    );
    corrected = observed.map((color, at) =>
      hues[at] < 0
        ? color
        : color.map(
            (v, k) => (v - fits[hues[at]][k].offset) / fits[hues[at]][k].gain,
          ),
    );
  }
  return corrected;
}
// Cells whose two nearest shades are closest together are the likeliest
// mismatches. Every combination of the twelve least certain is retried with
// the second shade, then up to four at a time of the 24 least certain.
const RETRY_ALL_CELLS = 12,
  RETRY_SOME_CELLS = 24,
  RETRY_SOME_AT_ONCE = 4;
let retryMasks: number[] | undefined;
/** Every choice of retried cells as a bit mask, fewest changes first in each part. */
function recoveryRetryMasks() {
  if (retryMasks) return retryMasks;
  const bitsSet = (mask: number) => {
    let count = 0;
    for (; mask; mask &= mask - 1) count++;
    return count;
  };
  const byCount = (a: number, b: number) => bitsSet(a) - bitsSet(b) || a - b;
  const all = Array.from({ length: 1 << RETRY_ALL_CELLS }, (_, mask) => mask);
  const some: number[] = [];
  const choose = (from: number, mask: number, left: number) => {
    // Choices within the first twelve cells are already part of `all`.
    if (mask >= 1 << RETRY_ALL_CELLS) some.push(mask);
    if (left)
      for (let bit = from; bit < RETRY_SOME_CELLS; bit++)
        choose(bit + 1, mask | (1 << bit), left - 1);
  };
  choose(0, 0, RETRY_SOME_AT_ONCE);
  retryMasks = [...all.sort(byCount), ...some.sort(byCount)];
  return retryMasks;
}
/**
 * Rebuilds a decodable picture from one averaged colour per cell, as sampled
 * from a compressed, converted or rescaled copy. The shades are the original
 * ones: they still have to pass error correction, the checksum and the catalog
 * fingerprint. Hues are not covered by those checks, so each cell keeps the
 * hue it was sampled with. A picture that cannot be repaired costs about
 * 16,000 retries, one to two seconds, so keep this off a browser's main thread.
 */
export function recoverProfilePixels(
  colors: readonly number[],
  terms: readonly Term[],
): number[] {
  const ids = termIds(terms),
    { size } = profilePixelCapacity(ids.length);
  if (colors.length !== size * size)
    throw Error("Pixel format dimensions mismatch");
  for (let at = 0; at < colors.length; at++) {
    const fixed = markerColor(at, size);
    if (fixed === null) continue;
    const brightness = channels(colors[at]).reduce((a, b) => a + b, 0) / 3;
    if (brightness > 127 !== (fixed === 0xffffff))
      throw Error("Pixel format orientation mismatch");
  }
  const palette = profilePixelPalette(),
    waveCells = payloadOrder(size),
    corrected = fitColorFamilies(colors.map(channels), size);
  const guesses = waveCells.map((at) => nearestShades(corrected[at]));
  const uncertain = guesses
    .map((guess, cell) => ({ cell, margin: guess.margin }))
    .sort((a, b) => a.margin - b.margin || a.cell - b.cell)
    .slice(0, RETRY_SOME_CELLS)
    .map((entry) => entry.cell);
  for (const mask of recoveryRetryMasks()) {
    const chosen = guesses.map((guess) => guess.first);
    uncertain.forEach((cell, bit) => {
      if (mask & (1 << bit)) chosen[cell] = guesses[cell].second;
    });
    let data: number[];
    try {
      data = correctProfileShades(
        chosen.map((index) => index % SHADES),
        ids,
      );
    } catch (error) {
      // Only a failed correction or check means that this choice was wrong.
      if (error instanceof TypeError) throw error;
      continue;
    }
    const bytes = Array.from(
      { length: blockLengths(ids.length).dataBytes },
      (_, i) => readBits(data, i * 8, 8),
    );
    const waveShades = protectProfileData(bytes, waveCells.length);
    const pixels = colors.map((_, at) => markerColor(at, size) ?? 0);
    for (const cell of calibration(size))
      pixels[cell.at] = palette[cell.hue * SHADES + cell.code];
    waveCells.forEach((at, i) => {
      pixels[at] =
        palette[Math.floor(guesses[i].first / SHADES) * SHADES + waveShades[i]];
    });
    return pixels;
  }
  throw Error("Pixel recovery failed");
}
