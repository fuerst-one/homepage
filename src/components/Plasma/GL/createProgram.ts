/** Poll compilation without blocking when parallel shader linking is supported. */
export const createProgram = async (
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
  signal: AbortSignal,
): Promise<WebGLProgram> => {
  signal.throwIfAborted();
  const shaders: WebGLShader[] = [];
  let program: WebGLProgram | null = null;
  try {
    for (const [type, source] of [
      [gl.VERTEX_SHADER, vertexSource],
      [gl.FRAGMENT_SHADER, fragmentSource],
    ] as const) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error("createShader failed");
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
    }
    program = gl.createProgram();
    if (!program) throw new Error("createProgram failed");
    for (const shader of shaders) gl.attachShader(program, shader);
    gl.linkProgram(program);
    const parallel = gl.getExtension("KHR_parallel_shader_compile");
    if (parallel) {
      const linkedProgram = program;
      await new Promise<void>((resolve, reject) => {
        let frame = 0;
        const abort = () => {
          cancelAnimationFrame(frame);
          reject(signal.reason);
        };
        const poll = () => {
          if (
            gl.getProgramParameter(
              linkedProgram,
              parallel.COMPLETION_STATUS_KHR,
            )
          ) {
            signal.removeEventListener("abort", abort);
            resolve();
          } else {
            frame = requestAnimationFrame(poll);
          }
        };
        signal.addEventListener("abort", abort, { once: true });
        poll();
      });
    }
    signal.throwIfAborted();
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error(`Program link failed: ${gl.getProgramInfoLog(program)}`);
    return program;
  } catch (error) {
    if (program) gl.deleteProgram(program);
    throw error;
  } finally {
    for (const shader of shaders) gl.deleteShader(shader);
  }
};
