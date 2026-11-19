import type { ProfileTerm, ProfileInterest } from "./visitorProfile";

export const PROFILE_PIXEL_LEVELS = 128;
export const PROFILE_PIXEL_HUES = [27, 81.21, 213, 333] as const;
const PIXEL_BITS = 12;
const SCORE_BITS = 7;
const VERSION = 5;
const MARKER_PIXELS = 17;
const OVERHEAD_BITS = 72;
type Term = Pick<ProfileTerm, "id">;
type Interest = Pick<ProfileInterest, "id" | "score">;
export type ProfilePixels = {
  size: number;
  pixels: number[];
  termCount: number;
  levels: 128;
};
let palette: number[] | undefined;
let reversePalette: Map<number, number> | undefined;
let lastLayout: { key: string; hues: number[] } | undefined;

export function rgb(h: number, s: number, l: number) {
  h /= 360;
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + h * 12) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return (channel(0) << 16) | (channel(8) << 8) | channel(4);
}

/** Four fixed hue anchors; saturation 50-82%, lightness 36-72%. */
export function profilePixelPalette(): readonly number[] {
  if (palette) return palette;
  const result: number[] = [];
  for (const hue of PROFILE_PIXEL_HUES) {
    const unique = new Set<number>();
    for (let s = 0; s < 128; s++)
      for (let l = 0; l < 128; l++)
        unique.add(rgb(hue, 50 + (s * 32) / 127, 36 + (l * 36) / 127));
    const colors = [...unique];
    if (colors.length < 4096)
      throw new Error("Pixel palette has insufficient distinct colours");
    for (let i = 0; i < 4096; i++)
      result.push(colors[Math.round((i * (colors.length - 1)) / 4095)]);
  }
  if (new Set(result).size !== 16384)
    throw new Error("Pixel palette contains duplicate colours");
  palette = result;
  return palette;
}

export function termIds(terms: readonly Term[]) {
  const ids = terms.map((t) => t.id).sort();
  if (ids.length > 65535 || new Set(ids).size !== ids.length)
    throw new Error("Invalid profile catalog");
  return ids;
}
export function catalogFingerprint(ids: readonly string[]) {
  let hash = 0x811c9dc5;
  for (const id of ids) {
    for (let i = 0; i < id.length; i++)
      hash = Math.imul(hash ^ id.charCodeAt(i), 0x01000193);
    hash = Math.imul(hash ^ 0, 0x01000193);
  }
  return hash >>> 0;
}
export function checksum(bits: readonly number[]) {
  let crc = 0xffff;
  for (let offset = 0; offset < bits.length; offset += 8) {
    crc ^= readBits(bits, offset, 8) << 8;
    for (let n = 0; n < 8; n++)
      crc = ((crc << 1) ^ (crc & 0x8000 ? 0x1021 : 0)) & 0xffff;
  }
  return crc;
}
export function pushBits(bits: number[], value: number, width: number) {
  for (let n = width - 1; n >= 0; n--) bits.push((value >>> n) & 1);
}
export function readBits(
  bits: readonly number[],
  offset: number,
  width: number,
) {
  let value = 0;
  for (let n = 0; n < width; n++) value = value * 2 + (bits[offset + n] ?? 0);
  return value;
}
export function profilePixelCapacity(termCount: number) {
  if (!Number.isInteger(termCount) || termCount < 0 || termCount > 65535)
    throw new Error("Invalid profile catalog size");
  const usedBits = termCount * SCORE_BITS + OVERHEAD_BITS;
  const size = Math.max(
    12,
    Math.ceil(Math.sqrt(MARKER_PIXELS + Math.ceil(usedBits / PIXEL_BITS))),
  );
  const availableBits =
    (size * size - MARKER_PIXELS) * PIXEL_BITS - OVERHEAD_BITS;
  const maxTerms = Math.floor(availableBits / SCORE_BITS);
  return {
    size,
    spareBits: availableBits - termCount * SCORE_BITS,
    maxTerms,
    extraTerms: maxTerms - termCount,
  };
}

/** Three asymmetric black-and-white corner patterns identify orientation. */
export function markerColor(at: number, size: number): number | null {
  const x = at % size,
    y = Math.floor(at / size);
  if (x < 3 && y < 3) return x !== 1 || y !== 1 ? 0xffffff : 0;
  if (x >= size - 2 && y < 2) return x - (size - 2) === y ? 0xffffff : 0;
  if (x < 2 && y >= size - 2) return x !== 1 || y !== size - 2 ? 0xffffff : 0;
  return null;
}

/** This order is independent of the profile, so the decoder needs no layout metadata. */
export function payloadOrder(size: number) {
  const cornerDistance = (at: number) =>
    Math.min(at % size, size - 1 - (at % size)) +
    Math.min(Math.floor(at / size), size - 1 - Math.floor(at / size));
  return Array.from({ length: size * size }, (_, i) => i)
    .filter((at) => markerColor(at, size) === null)
    .sort((a, b) => cornerDistance(b) - cornerDistance(a) || a - b);
}

// These public interest families affect hue area only; every catalog score is in the shades.
export function interestFamily(id: string) {
  if (
    /AI |Artificial Intelligence|Agent Harnesses|Data |Geospatial|Web-Scraping|Reporting|AI capabilities|Automate repetitive|Integrate business|Make data actionable|Prompt Engineering/i.test(
      id,
    )
  )
    return 2;
  if (
    /UX-|UI-|Usability|User Research|Chat Bot Design|Prototyp|Validate|complex interface|interactive experience|User Testing|Personas|Jobs To Be Done|7-Level|Limbic|Behaviour|Expert Research|Site Audit|Workshop/i.test(
      id,
    )
  )
    return 3;
  if (
    /3D|Frontend|Backend|Fullstack|Native Development|GPU|Library Development|Open Source|Animation|Maintain|Connect software|internal tooling|CI\/CD|Automated Testing/i.test(
      id,
    )
  )
    return 1;
  return 0;
}

export function familyWeights(
  ids: readonly string[],
  values: readonly number[],
) {
  const weights = [0, 0, 0, 0];
  ids.forEach((id, i) => {
    if (/^(buyerNeeds|capabilities|methods):/.test(id))
      weights[interestFamily(id)] += values[i];
  });
  return weights;
}

export function regionHues(
  size: number,
  ids: readonly string[],
  values: readonly number[],
) {
  const weights = familyWeights(ids, values);
  const total = weights.reduce((a, b) => a + b, 0);
  const freeCount = size * size - MARKER_PIXELS;
  const raw = weights.map((n) => freeCount * (total ? n / total : 0.25));
  const counts = raw.map(Math.floor);
  const remainder = freeCount - counts.reduce((a, b) => a + b, 0);
  const ranked = [0, 1, 2, 3].sort(
    (a, b) => raw[b] - counts[b] - (raw[a] - counts[a]) || a - b,
  );
  for (let i = 0; i < remainder; i++) counts[ranked[i]]++;
  const key = `${size}:${counts.join(",")}`;
  if (lastLayout?.key === key) return lastLayout.hues;
  const hues = Array<number>(size * size).fill(-1);
  const cells = Array.from({ length: size * size }, (_, i) => i).filter(
    (at) => markerColor(at, size) === null,
  );
  const anchors = [
    [size - 3, size - 3],
    [2, 2],
    [size - 3, 2],
    [2, size - 3],
  ];
  const slots = counts.flatMap((n, hue) => Array<number>(n).fill(hue));
  const costs = cells.map((at) =>
    slots.map(
      (hue) =>
        ((at % size) - anchors[hue][0]) ** 2 +
        (Math.floor(at / size) - anchors[hue][1]) ** 2,
    ),
  );
  // Minimum-cost assignment preserves the exact regional areas and keeps each hue near its corner.
  const n = cells.length;
  const u = Array<number>(n + 1).fill(0),
    v = Array<number>(n + 1).fill(0);
  const assigned = Array<number>(n + 1).fill(0),
    way = Array<number>(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    assigned[0] = i;
    let column = 0;
    const minimum = Array<number>(n + 1).fill(Infinity),
      used = Array<boolean>(n + 1).fill(false);
    do {
      used[column] = true;
      const row = assigned[column];
      let delta = Infinity,
        next = 0;
      for (let j = 1; j <= n; j++)
        if (!used[j]) {
          const cost = costs[row - 1][j - 1] - u[row] - v[j];
          if (cost < minimum[j]) {
            minimum[j] = cost;
            way[j] = column;
          }
          if (minimum[j] < delta) {
            delta = minimum[j];
            next = j;
          }
        }
      for (let j = 0; j <= n; j++) {
        if (used[j]) {
          u[assigned[j]] += delta;
          v[j] -= delta;
        } else minimum[j] -= delta;
      }
      column = next;
    } while (assigned[column] !== 0);
    do {
      const previous = way[column];
      assigned[column] = assigned[previous];
      column = previous;
    } while (column !== 0);
  }
  for (let j = 1; j <= n; j++) hues[cells[assigned[j] - 1]] = slots[j - 1];
  lastLayout = { key, hues };
  return hues;
}

/** The original scores remain authoritative; only the picture uses 128 levels. */
export function encodeProfilePixels(
  terms: readonly Term[],
  interests: readonly Interest[],
): ProfilePixels {
  const ids = termIds(terms);
  const scores = new Map(
    interests.map((interest) => [interest.id, interest.score]),
  );
  const values = ids.map((id) => {
    const value = scores.get(id) ?? 0;
    return Math.round(
      ((Number.isFinite(value) ? Math.max(0, Math.min(12, value)) : 0) *
        (PROFILE_PIXEL_LEVELS - 1)) /
        12,
    );
  });
  const bits: number[] = [];
  pushBits(bits, (VERSION << 4) | SCORE_BITS, 8);
  pushBits(bits, ids.length, 16);
  pushBits(bits, catalogFingerprint(ids), 32);
  for (const value of values) pushBits(bits, value, SCORE_BITS);
  pushBits(bits, checksum(bits), 16);
  const { size } = profilePixelCapacity(ids.length);
  const colors = profilePixelPalette();
  const hues = regionHues(size, ids, values);
  const pixels = Array.from(
    { length: size * size },
    (_, at) => markerColor(at, size) ?? 0,
  );
  payloadOrder(size).forEach((at, index) => {
    pixels[at] =
      colors[hues[at] * 4096 + readBits(bits, index * PIXEL_BITS, PIXEL_BITS)];
  });
  return { size, pixels, termCount: ids.length, levels: PROFILE_PIXEL_LEVELS };
}

/** Exact RGB and the matching public catalog are required; this is not a camera scanner. */
export function decodeProfilePixels(
  pixels: readonly number[],
  terms: readonly Term[],
) {
  const ids = termIds(terms),
    { size } = profilePixelCapacity(ids.length);
  if (pixels.length !== size * size)
    throw new Error("Pixel format dimensions mismatch");
  for (let at = 0; at < pixels.length; at++) {
    const fixed = markerColor(at, size);
    if (fixed !== null && pixels[at] !== fixed)
      throw new Error("Pixel format orientation mismatch");
  }
  if (!reversePalette)
    reversePalette = new Map(
      profilePixelPalette().map((color, i) => [color, i]),
    );
  const bits: number[] = [];
  for (const at of payloadOrder(size)) {
    const code = reversePalette.get(pixels[at]);
    if (code === undefined) throw new Error("Pixel format colour mismatch");
    pushBits(bits, code % 4096, PIXEL_BITS);
  }
  if (readBits(bits, 0, 8) !== ((VERSION << 4) | SCORE_BITS))
    throw new Error("Pixel format version mismatch");
  if (
    readBits(bits, 8, 16) !== ids.length ||
    readBits(bits, 24, 32) !== catalogFingerprint(ids)
  )
    throw new Error("Profile catalog mismatch");
  const end = 56 + ids.length * SCORE_BITS;
  if (checksum(bits.slice(0, end)) !== readBits(bits, end, 16))
    throw new Error("Pixel checksum mismatch");
  if (bits.slice(end + 16).some(Boolean))
    throw new Error("Pixel padding mismatch");
  return Object.fromEntries(
    ids.map((id, i) => [id, readBits(bits, 56 + i * SCORE_BITS, SCORE_BITS)]),
  );
}
