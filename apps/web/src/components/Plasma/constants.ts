import Color from "color";
import { Glyph } from "./types";

export const BASE_CHARACTERS = "@0#O&$§%eouns1ft*=+r/;:~-,'.`´` ".split("");

const TINT_HUE = 30;
const TINT_SATURATION = 7.5;

const buildGlyphPalette = (lightnessBase: number, lightnessRange: number) => {
  const colors = BASE_CHARACTERS.reduce(
    (acc, character, idx, arr) => {
      const color = Color.hsl(
        TINT_HUE,
        TINT_SATURATION,
        lightnessBase + ((arr.length - idx) / arr.length) * lightnessRange,
      );
      return { ...acc, [character]: color.hex() };
    },
    {} as Record<string, string>,
  );
  return [...BASE_CHARACTERS, ...[...BASE_CHARACTERS].reverse()].map(
    (character): Glyph => ({
      character,
      style: { color: colors[character] },
    }),
  );
};

export const CHARACTERS: Glyph[] = buildGlyphPalette(12, 30);
export const LANDING_CHARACTERS: Glyph[] = buildGlyphPalette(20, 40);
export const PLAYGROUND_CHARACTERS: Glyph[] = buildGlyphPalette(30, 60);
export const PLAYGROUND_CHARACTERS_LOW: Glyph[] = buildGlyphPalette(20, 50);
export const PLAYGROUND_CHARACTERS_HIGH: Glyph[] = buildGlyphPalette(45, 75);

export const PLASMA_COMPLEXITY = 4;
export const PLASMA_ZOOM = 25;
export const PLASMA_SPEED = 0.03;
export const PLASMA_FPS = 60;
export const WEBCAM_FPS = 60;
export const PLASMA_REDUCED_FPS = 4;

export const PLASMA_LENS_BASE_STRENGTH = 0.5;
export const PLASMA_LENS_BASE_RADIUS_FRAC = 0.25;
export const PLASMA_LENS_RADIUS_FRAC_MAX = 2;
export const PLASMA_LENS_SCALE_DEFAULT = 1.0;
export const PLASMA_LENS_SCALE_MIN = 0;
export const PLASMA_LENS_SCALE_MAX = 12;
export const PLASMA_LENS_WHEEL_SENSITIVITY = 0.01;
export const PLASMA_LANDING_LENS_SCALE = 3;
export const PLASMA_LANDING_LENS_X_FRAC = 0.5;
export const PLASMA_LANDING_LENS_Y_FRAC = 0.48;

// Post-process pass: radial blur (none in the center, more towards the
// edges) plus a short glitch burst every few seconds.
export const PLASMA_BLUR_MAX_PX = 5.0;
export const PLASMA_BLUR_INNER_FRAC = 0.35;
export const PLASMA_BLUR_OUTER_FRAC = 1.15;
export const PLASMA_GLITCH_INTERVAL = 5.0;
export const PLASMA_GLITCH_DURATION = 0.3;
export const PLASMA_GLITCH_BANDS = 12.0;
export const PLASMA_GLITCH_TEAR_PX = 12.0;

export const PLASMA_RIPPLE_MAX = 6;
export const PLASMA_RIPPLE_RADIUS_FRAC = 0.4;
export const PLASMA_RIPPLE_STRENGTH = 4.0;
export const PLASMA_RIPPLE_LIFETIME = 0.6;

export {
  RADII,
  CENTER_XS,
  CENTER_YS,
  ANGLE_INCREMENTS,
  SINE_TABLE,
} from "@homepage/content/plasmaField";
