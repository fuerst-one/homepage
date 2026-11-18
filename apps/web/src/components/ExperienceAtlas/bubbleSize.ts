/** Circle area, not diameter, scales with the recorded 1–10 rating. */
export function bubbleDiameter(wowFactor: number | null) {
  // Unscored projects stay selectable; the UI explicitly identifies them as unscored.
  return wowFactor === null ? 10 : 7.5 * Math.sqrt(wowFactor);
}

export const wowLabel = (wowFactor: number | null) =>
  wowFactor === null ? "Wow factor: unscored" : `Wow factor: ${wowFactor}/10`;
