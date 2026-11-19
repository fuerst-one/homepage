import {
  RADII,
  CENTER_XS,
  CENTER_YS,
  ANGLE_INCREMENTS,
  SINE_TABLE,
} from "./plasmaField";

const START_ANGLES = [0.45, -0.13, 0.65, -0.33];
// Folding two plasma periods into one rise and fall reverses the band order
// at each turn instead of jumping from the last colour back to the first.
const PERIODS_PER_WAVE = 2;

/** Wave height in [0, 1]; phase turns the field the way the site plasma animates. */
export function driftField(x: number, y: number, phase = 0) {
  const fx = 54 + x * 8,
    fy = -12 + y * 7.4;
  let value = 0;
  for (let i = 0; i < 4; i++) {
    const angle = START_ANGLES[i] + phase * ANGLE_INCREMENTS[i];
    const xi = Math.cos(angle) * RADII[i] + CENTER_XS[i] - fx;
    const yi = Math.sin(angle) * RADII[i] + CENTER_YS[i] - fy;
    const index = Math.round((xi * xi + yi * yi) / 25);
    value += SINE_TABLE[(index >> 5) & 255];
  }
  const position = (((value / 210 / PERIODS_PER_WAVE) % 1) + 1) % 1;
  return 1 - Math.abs(2 * position - 1);
}
