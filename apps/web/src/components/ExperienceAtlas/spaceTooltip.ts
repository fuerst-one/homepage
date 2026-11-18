/** Park cards away from the active corner instead of covering point labels. */
export function tooltipCorner(point: number[], viewSize: number[]) {
  const [x, y] = point;
  const [width, height] = viewSize;
  // Two full-width cards would overlap here, so switch vertically instead.
  if (width < 660 && y < height / 2) return "bottom-right";
  if (x > width / 2 && y < height / 2) return "top-left";
  return "top-right";
}

export function chartTooltipPosition(
  point: number[],
  { viewSize, contentSize }: { viewSize: number[]; contentSize: number[] },
): [number, number] {
  const corner = tooltipCorner(point, viewSize);
  const maxX = Math.max(0, viewSize[0] - contentSize[0] - 16);
  const maxY = Math.max(0, viewSize[1] - contentSize[1] - 16);
  return [
    corner === "top-left" ? Math.min(16, maxX) : maxX,
    corner === "bottom-right" ? maxY : Math.min(44, maxY),
  ];
}

/** Escape applies to a hover target until the pointer leaves it. */
export function createTooltipDismissal() {
  let active: string | null = null;
  let dismissed: string | null = null;
  return {
    show(key: string) {
      if (active !== key) dismissed = null;
      active = key;
      return dismissed !== key;
    },
    dismiss() {
      dismissed = active;
    },
    leave() {
      active = null;
      dismissed = null;
    },
  };
}
