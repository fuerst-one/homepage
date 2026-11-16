/** A full forward-and-reverse cycle, with matching values at both joins. */
export const buildMirroredPlasmaRamp = (steps: number): Float32Array => {
  const forward = Array.from(
    { length: steps },
    (_, index) => (steps - index - 0.5) / steps,
  );
  return new Float32Array([...forward, ...[...forward].reverse()]);
};
