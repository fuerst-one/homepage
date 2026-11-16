export const getRailScrollState = (
  scrollLeft: number,
  scrollWidth: number,
  clientWidth: number,
) => {
  const end = Math.max(0, scrollWidth - clientWidth);
  const position = Math.max(0, Math.min(scrollLeft, end));
  // Browsers report fractional positions even though scroll sizes are rounded.
  return { back: position > 1, forward: end - position > 1 };
};
