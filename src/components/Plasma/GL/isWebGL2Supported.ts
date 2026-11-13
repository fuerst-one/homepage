let supported: boolean | undefined;

export const isWebGL2Supported = (): boolean => {
  if (typeof document === "undefined") return false;
  if (supported !== undefined) return supported;
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2");
  supported = Boolean(gl);
  // The probe is never rendered; don't retain another GPU context per canvas.
  gl?.getExtension("WEBGL_lose_context")?.loseContext();
  return supported;
};
