import type { ProfileTerm } from "./visitorProfile";
import { markerColor } from "./profilePixelsLegacy";
import {
  decodeProfileInteractions,
  decodeProfilePixels,
  profilePixelCapacity,
  recoverProfilePixels,
} from "./profilePixels";

/** Decoded image pixels, row by row, as RGB or RGBA bytes. */
export type RasterImage = {
  width: number;
  height: number;
  channels: 3 | 4;
  data: ArrayLike<number>;
};
type Point = [number, number];
/** Top left, top right, bottom right and bottom left of the grid, in image pixels. */
export type SignatureCorners = [Point, Point, Point, Point];

// The share of a cell's width, around its centre, that is averaged. Blending
// and compression mix the outer part with the neighbouring cells; measured on
// compressed screenshots, the inner half misreads a third as many cells as
// the inner two thirds.
const SAMPLED_SHARE = 0.5;
// Runs of the finder pattern may differ this much from each other in length.
const RUN_TOLERANCE = 0.4;
const REFINED_CANDIDATES = 4;
// Cell sizes tried around the finder's estimate: this far up and down, in this many steps each way.
const CELL_SIZE_RANGE = 0.25,
  CELL_SIZE_STEPS = 50;

const toLinear = (value: number) =>
  (value /= 255) <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
const toSrgb = (linear: number) =>
  255 *
  (linear <= 0.0031308 ? linear * 12.92 : 1.055 * linear ** (1 / 2.4) - 0.055);

/** Colour between pixel centres, blended from the four pixels around the point. */
function colorAt(image: RasterImage, x: number, y: number) {
  const { width, height, channels, data } = image;
  x = Math.min(Math.max(x - 0.5, 0), width - 1.001);
  y = Math.min(Math.max(y - 0.5, 0), height - 1.001);
  const xi = Math.floor(x),
    yi = Math.floor(y),
    fx = x - xi,
    fy = y - yi,
    at = (yi * width + xi) * channels,
    below = at + width * channels;
  return [0, 1, 2].map(
    (k) =>
      data[at + k] * (1 - fx) * (1 - fy) +
      data[at + channels + k] * fx * (1 - fy) +
      data[below + k] * (1 - fx) * fy +
      data[below + channels + k] * fx * fy,
  );
}

function solve(rows: number[][], values: number[]) {
  const n = values.length,
    m = rows.map((row, i) => [...row, values[i]]);
  for (let column = 0; column < n; column++) {
    let pivot = column;
    for (let row = column + 1; row < n; row++)
      if (Math.abs(m[row][column]) > Math.abs(m[pivot][column])) pivot = row;
    [m[column], m[pivot]] = [m[pivot], m[column]];
    for (let row = 0; row < n; row++)
      if (row !== column) {
        const factor = m[row][column] / m[column][column];
        for (let k = column; k <= n; k++) m[row][k] -= factor * m[column][k];
      }
  }
  return m.map((row, i) => row[n] / row[i]);
}
/** Maps grid coordinates, in cells, to image pixels through the four corners. */
function projection(corners: SignatureCorners, size: number) {
  const grid = [
    [0, 0],
    [size, 0],
    [size, size],
    [0, size],
  ];
  const rows: number[][] = [],
    values: number[] = [];
  grid.forEach(([u, v], i) => {
    const [x, y] = corners[i];
    rows.push(
      [u, v, 1, 0, 0, 0, -u * x, -v * x],
      [0, 0, 0, u, v, 1, -u * y, -v * y],
    );
    values.push(x, y);
  });
  const h = solve(rows, values);
  return (u: number, v: number): Point => {
    const w = h[6] * u + h[7] * v + 1;
    return [(h[0] * u + h[1] * v + h[2]) / w, (h[3] * u + h[4] * v + h[5]) / w];
  };
}
/** Colours on a lattice of `count` by `count` points in the middle of every cell. */
function cellSamples(
  image: RasterImage,
  corners: SignatureCorners,
  size: number,
  share: number,
  count: number,
) {
  const toImage = projection(corners, size),
    inset = (1 - share) / 2;
  return Array.from({ length: size * size }, (_, cell) => {
    const samples: number[][] = [];
    for (let j = 0; j < count; j++)
      for (let i = 0; i < count; i++) {
        const [x, y] = toImage(
          (cell % size) + inset + (share * (i + 0.5)) / count,
          Math.floor(cell / size) + inset + (share * (j + 0.5)) / count,
        );
        samples.push(colorAt(image, x, y));
      }
    return samples;
  });
}
/** How much brighter the white marker cells are than the black ones. */
function markerContrast(
  image: RasterImage,
  corners: SignatureCorners,
  size: number,
) {
  const toImage = projection(corners, size);
  let white = 0,
    whites = 0,
    black = 0,
    blacks = 0;
  for (let cell = 0; cell < size * size; cell++) {
    const marker = markerColor(cell, size);
    if (marker === null) continue;
    const [x, y] = toImage((cell % size) + 0.5, Math.floor(cell / size) + 0.5);
    const level = colorAt(image, x, y).reduce((sum, v) => sum + v, 0) / 3;
    if (marker) {
      white += level;
      whites++;
    } else {
      black += level;
      blacks++;
    }
  }
  return white / whites - black / blacks;
}
/**
 * How badly a grid placed at these corners fits the picture: low when cells
 * are uniform inside and the marker cells are white and black.
 */
function misfit(image: RasterImage, corners: SignatureCorners, size: number) {
  const cells = cellSamples(image, corners, size, 0.6, 5);
  let unevenness = 0,
    white = 0,
    whites = 0,
    black = 0,
    blacks = 0;
  cells.forEach((samples, cell) => {
    let level = 0;
    for (let k = 0; k < 3; k++) {
      const mean = samples.reduce((sum, s) => sum + s[k], 0) / samples.length;
      unevenness +=
        samples.reduce((sum, s) => sum + (s[k] - mean) ** 2, 0) /
        samples.length;
      level += mean / 3;
    }
    const marker = markerColor(cell, size);
    if (marker === 0xffffff) {
      white += level;
      whites++;
    } else if (marker === 0) {
      black += level;
      blacks++;
    }
  });
  const contrast = white / whites - black / blacks;
  return { score: unevenness / (cells.length * 3) - 6 * contrast, contrast };
}
/** Moves each corner in ever smaller steps while the grid fits better. */
function refine(image: RasterImage, start: SignatureCorners, size: number) {
  let corners = start,
    best = misfit(image, corners, size);
  const side = Math.hypot(start[1][0] - start[0][0], start[1][1] - start[0][1]);
  for (let step = side / size / 3; step > 0.05;) {
    let improved = false;
    for (let corner = 0; corner < 4; corner++)
      for (let axis = 0; axis < 2; axis++)
        for (const direction of [step, -step]) {
          const trial = corners.map((p) => [...p]) as SignatureCorners;
          trial[corner][axis] += direction;
          const fit = misfit(image, trial, size);
          if (fit.score < best.score - 1e-9) {
            corners = trial;
            best = fit;
            improved = true;
          }
        }
    if (!improved) step /= 2;
  }
  return { corners, ...best };
}

/**
 * Finds the signature in an upright, undistorted image such as a screenshot,
 * at any size and position, by its finder pattern: the white square with a
 * black centre in the top left corner. Returns null when there is none.
 */
export function locateProfileSignature(
  image: RasterImage,
  size: number,
): SignatureCorners | null {
  const { width, height, channels, data } = image;
  // 2 = white, 0 = dark, 1 = anything else, judged against the brightest pixels.
  const kind = new Uint8Array(width * height);
  const levels = new Uint32Array(256);
  for (let at = 0; at < width * height; at++)
    levels[
      Math.max(
        data[at * channels],
        data[at * channels + 1],
        data[at * channels + 2],
      )
    ]++;
  let brightest = 255;
  for (let seen = 0; brightest > 0; brightest--)
    if ((seen += levels[brightest]) > width * height * 0.002) break;
  for (let at = 0; at < width * height; at++) {
    const r = data[at * channels],
      g = data[at * channels + 1],
      b = data[at * channels + 2];
    const high = Math.max(r, g, b),
      low = Math.min(r, g, b);
    kind[at] =
      low >= 0.78 * brightest && high - low <= 0.2 * brightest
        ? 2
        : high <= 0.5 * brightest
          ? 0
          : 1;
  }
  const alike = (a: number, b: number) =>
    Math.abs(a - b) <= RUN_TOLERANCE * Math.max(a, b);
  type Run = { kind: number; start: number; length: number };
  const runsAlong = (count: number, kindAt: (i: number) => number) => {
    const runs: Run[] = [];
    for (let i = 0; i < count; i++) {
      const last = runs[runs.length - 1];
      if (last && last.kind === kindAt(i)) last.length++;
      else runs.push({ kind: kindAt(i), start: i, length: 1 });
    }
    return runs;
  };
  /**
   * The dark run at `index` when white runs of about its length lie on both
   * sides. Blended edge pixels between the runs count half to each side.
   */
  const finderRun = (runs: Run[], index: number) => {
    const dark = runs[index];
    if (!dark || dark.kind !== 0) return null;
    const edge = (run: Run | undefined) =>
      run && run.kind === 1 && run.length <= Math.max(1, dark.length / 3)
        ? run.length
        : 0;
    const blendBefore = edge(runs[index - 1]),
      blendAfter = edge(runs[index + 1]);
    const before = runs[index - (blendBefore ? 2 : 1)],
      after = runs[index + (blendAfter ? 2 : 1)];
    if (before?.kind !== 2 || after?.kind !== 2) return null;
    const length = dark.length + (blendBefore + blendAfter) / 2;
    if (
      length < 2 ||
      !alike(before.length + blendBefore / 2, length) ||
      !alike(after.length + blendAfter / 2, length)
    )
      return null;
    return { centre: dark.start + dark.length / 2, length };
  };
  const candidates = new Map<string, { x: number; y: number; cell: number }>();
  const columns = new Map<number, Run[]>();
  for (let y = 0; y < height; y++) {
    const row = runsAlong(width, (x) => kind[y * width + x]);
    for (let i = 1; i + 1 < row.length; i++) {
      const across = finderRun(row, i);
      if (!across) continue;
      const x = Math.floor(across.centre);
      if (!columns.has(x))
        columns.set(
          x,
          runsAlong(height, (j) => kind[j * width + x]),
        );
      const column = columns.get(x)!;
      const down = finderRun(
        column,
        column.findIndex((run) => run.start <= y && y < run.start + run.length),
      );
      if (!down || !alike(down.length, across.length)) continue;
      const cell = (across.length + down.length) / 2;
      candidates.set(
        `${Math.round(across.centre / cell)},${Math.round(down.centre / cell)}`,
        { x: across.centre, y: down.centre, cell },
      );
    }
  }
  // The finder's centre is the middle of the cell in the second row and
  // column. Its run lengths give the cell size only roughly, so the size is
  // settled by where the markers in the other two corners turn up.
  const square = (x: number, y: number, cell: number): SignatureCorners => {
    const left = x - 1.5 * cell,
      top = y - 1.5 * cell,
      side = size * cell;
    return [
      [left, top],
      [left + side, top],
      [left + side, top + side],
      [left, top + side],
    ];
  };
  const placed = [...candidates.values()]
    .map(({ x, y, cell }) => {
      let best = { corners: square(x, y, cell), contrast: -Infinity };
      for (let step = -CELL_SIZE_STEPS; step <= CELL_SIZE_STEPS; step++) {
        const corners = square(
          x,
          y,
          cell * (1 + (CELL_SIZE_RANGE * step) / CELL_SIZE_STEPS),
        );
        const contrast = markerContrast(image, corners, size);
        if (contrast > best.contrast) best = { corners, contrast };
      }
      return best;
    })
    .filter((candidate) => candidate.contrast > 0.35 * brightest)
    .sort((a, b) => b.contrast - a.contrast)
    .slice(0, REFINED_CANDIDATES)
    .map((candidate) => refine(image, candidate.corners, size))
    .sort((a, b) => a.score - b.score);
  return placed.length ? placed[0].corners : null;
}

/** One colour per cell, averaged in linear light over the middle of the cell. */
export function sampleProfileSignature(
  image: RasterImage,
  corners: SignatureCorners,
  size: number,
): number[] {
  const cellPixels =
    Math.hypot(corners[1][0] - corners[0][0], corners[1][1] - corners[0][1]) /
    size;
  const count = Math.min(
    24,
    Math.max(2, Math.round(cellPixels * SAMPLED_SHARE)),
  );
  return cellSamples(image, corners, size, SAMPLED_SHARE, count).map(
    (samples) =>
      [0, 1, 2].reduce(
        (color, k) =>
          (color << 8) |
          Math.round(
            toSrgb(
              samples.reduce((sum, s) => sum + toLinear(s[k]), 0) /
                samples.length,
            ),
          ),
        0,
      ),
  );
}

/**
 * Reads a profile signature from an image: finds it, samples its cells and
 * recovers the exact picture, which has passed error correction, the checksum
 * and the catalog fingerprint. Photos of a screen are located but usually not
 * recovered: a camera does not hold colours precisely enough to tell the
 * shades apart.
 */
export function readProfileSignatureImage(
  image: RasterImage,
  terms: readonly Pick<ProfileTerm, "id">[],
) {
  const { size } = profilePixelCapacity(terms.length);
  const corners = locateProfileSignature(image, size);
  if (!corners) throw Error("Profile signature not found");
  const pixels = recoverProfilePixels(
    sampleProfileSignature(image, corners, size),
    terms,
  );
  return {
    corners,
    pixels,
    scores: decodeProfilePixels(pixels, terms),
    interactions: decodeProfileInteractions(pixels, terms),
  };
}
