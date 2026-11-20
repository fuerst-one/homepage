import { RippleEngine, RippleEngineOptions } from "./types";

const PULSE_AMPLITUDE = 3;
const PULSE_RADIUS = 1.5;
// Below 1/sqrt(2) the explicit scheme is stable; the margin keeps it calm.
const COURANT = 0.5;
const MAX_SUBSTEP_SECONDS = 1 / 120;

export type Oscillator = {
  x: number;
  y: number;
  /** Height the driven spot follows, given the engine's time in seconds. */
  signal: (seconds: number) => number;
};

export type WaveFieldEngine = RippleEngine & {
  /** Simulated seconds so far, the clock oscillator signals run on. */
  readonly time: number;
  /** Cells driven into oscillation; an empty list releases them all. */
  setOscillators: (oscillators: ReadonlyArray<Oscillator>) => void;
};

/** Damped 2D wave equation on the cell grid; edges reflect like a tray rim. */
export const createWaveFieldEngine = ({
  width,
  height,
  cellAspect,
  speed,
  damping: initialDamping,
}: RippleEngineOptions): WaveFieldEngine => {
  let damping = initialDamping;
  const size = width * height;
  let current = new Float32Array(size);
  let previous = new Float32Array(size);
  let next = new Float32Array(size);
  const dx2 = cellAspect * cellAspect;
  // The leapfrog scheme gains energy whenever its step length changes, so every
  // substep has the same length and leftover frame time carries over.
  const substepSeconds = Math.min(
    MAX_SUBSTEP_SECONDS,
    (COURANT * Math.min(cellAspect, 1)) / speed,
  );
  let pendingSeconds = 0;
  let oscillators: ReadonlyArray<Oscillator> = [];
  let elapsed = 0;

  const forEachPulseCell = (
    cx: number,
    cy: number,
    visit: (index: number, weight: number) => void,
  ) => {
    const reach = Math.ceil(PULSE_RADIUS * 3);
    const span = Math.ceil(reach / cellAspect);
    for (
      let y = Math.max(0, cy - reach);
      y <= Math.min(height - 1, cy + reach);
      y++
    ) {
      for (
        let x = Math.max(0, cx - span);
        x <= Math.min(width - 1, cx + span);
        x++
      ) {
        const distance2 = ((x - cx) * cellAspect) ** 2 + (y - cy) ** 2;
        visit(
          y * width + x,
          Math.exp(-distance2 / (2 * PULSE_RADIUS * PULSE_RADIUS)),
        );
      }
    }
  };

  const substep = (dt: number) => {
    const c2 = speed * speed * dt * dt;
    const keep = Math.max(0, 1 - damping * dt);
    for (let y = 0; y < height; y++) {
      const row = y * width;
      const up = (y > 0 ? y - 1 : y) * width;
      const down = (y < height - 1 ? y + 1 : y) * width;
      for (let x = 0; x < width; x++) {
        const i = row + x;
        const u = current[i];
        const left = current[row + (x > 0 ? x - 1 : x)];
        const right = current[row + (x < width - 1 ? x + 1 : x)];
        const laplacian =
          (left + right - 2 * u) / dx2 +
          (current[up + x] + current[down + x] - 2 * u);
        next[i] = (2 * u - previous[i] + c2 * laplacian) * keep;
      }
    }
    elapsed += dt;
    for (const { x, y, signal } of oscillators) {
      const target = signal(elapsed);
      forEachPulseCell(x, y, (i, weight) => {
        next[i] += (target - next[i]) * weight;
      });
    }
    const recycled = previous;
    previous = current;
    current = next;
    next = recycled;
  };

  return {
    get height() {
      return current;
    },
    get time() {
      return elapsed;
    },
    emit: (cx, cy) => {
      forEachPulseCell(cx, cy, (i, weight) => {
        current[i] += PULSE_AMPLITUDE * weight;
        previous[i] += PULSE_AMPLITUDE * weight;
      });
    },
    setDamping: (value) => {
      damping = value;
    },
    reset: () => {
      current.fill(0);
      previous.fill(0);
      next.fill(0);
    },
    setOscillators: (list) => {
      oscillators = list;
    },
    step: (dtSeconds) => {
      pendingSeconds += dtSeconds;
      while (pendingSeconds >= substepSeconds) {
        substep(substepSeconds);
        pendingSeconds -= substepSeconds;
      }
    },
  };
};
