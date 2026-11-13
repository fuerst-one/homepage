"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  ANGLE_INCREMENTS,
  CENTER_XS,
  CENTER_YS,
  PLASMA_COMPLEXITY,
  PLASMA_SPEED,
  PLASMA_ZOOM,
  RADII,
  SINE_TABLE,
} from "../Plasma/constants";
import { getIsReducedMotion } from "../Plasma/getIsReducedMotion";
import { buildMirroredPlasmaRamp } from "../Plasma/buildMirroredPlasmaRamp";
import { createGeometryCache } from "./createGeometryCache";
import { CONTRAST_LUT_GAINS } from "./constants";
import {
  buildContrastLutCache,
  createSamplerContext,
  LuminanceSample,
  SamplerArgs,
  sampleDrawableToLuminance,
} from "./sampleDrawableToLuminance";

type UseShapesLuminanceResult = {
  sample: (args: SamplerArgs) => LuminanceSample | null;
  ready: boolean;
};

type ShapeOptions = {
  createGeometries: () => THREE.BufferGeometry[];
  createGeometry?: (index: number) => THREE.BufferGeometry;
  shapeIndex: number;
  paused: boolean;
  reducedMotion: boolean;
};

const RENDER_WIDTH = 768;
const RENDER_HEIGHT = 432;
const ROTATION_AXIS = new THREE.Vector3(0.4, 1, 0.2).normalize();
const ROTATION_RATE = 0.45;
const CAMERA_FRAME_FACTOR = 3.6;
const IDLE_RESUME_MS = 3000;
const ORBIT_DAMPING = 0.08;
const ORBIT_MIN_DISTANCE = 1.2;
const ORBIT_MAX_DISTANCE = 12;
const CLICK_DISTANCE_PX = 8;
const CLICK_DURATION_MS = 500;
const PLASMA_PIXELS_PER_CELL = 8.0;
const PLASMA_RAMP_LENGTH = 128.0;
const PLASMA_DEPTH_SHIFT = 0.18;

const PLASMA_VERTEX_SHADER = /* glsl */ `
  varying vec3 vViewNormal;
  varying float vSurfaceTone;
  void main() {
    vViewNormal = normalize(normalMatrix * normal);
    #ifdef USE_COLOR
      vSurfaceTone = color.r;
    #else
      vSurfaceTone = 1.0;
    #endif
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const PLASMA_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;
  precision highp int;

  uniform vec4 u_angles;
  uniform vec4 u_radii;
  uniform vec4 u_centerXs;
  uniform vec4 u_centerYs;
  uniform float u_sineTable[256];
  uniform float u_hueShift;
  uniform float u_zoomFactor;
  uniform int u_complexity;
  uniform float u_pixelsPerCell;
  uniform float u_rampLength;
  uniform float u_depthShift;
  uniform float u_visibility;
  uniform float u_plasmaWave[128];
  uniform float u_sculptural;

  varying vec3 vViewNormal;
  varying float vSurfaceTone;

  float computePlasmaValue(vec2 cellCoord) {
    float fx = floor(cellCoord.x);
    float fy = floor(cellCoord.y);
    float value = u_hueShift;
    for (int i = 0; i < 4; i++) {
      if (i >= u_complexity) break;
      float ai = u_angles[i];
      float ri = u_radii[i];
      float cxi = u_centerXs[i];
      float cyi = u_centerYs[i];
      float xi = cos(ai) * ri + cxi - fx;
      float yi = sin(ai) * ri + cyi - fy;
      float fIdx = (xi * xi + yi * yi) * u_zoomFactor;
      int rounded = int(floor(fIdx + 0.5));
      int shifted = rounded / 32;
      int masked = shifted - (shifted / 256) * 256;
      if (masked < 0) masked += 256;
      value += u_sineTable[masked];
    }
    return value;
  }

  void main() {
    vec2 cellCoord = gl_FragCoord.xy / u_pixelsPerCell;
    float plasmaValue = computePlasmaValue(cellCoord);
    float rampIdx = mod(floor(plasmaValue), u_rampLength);
    if (rampIdx < 0.0) rampIdx += u_rampLength;

    float v = u_plasmaWave[int(rampIdx)];

    vec3 n = normalize(vViewNormal);
    float depth = (1.0 - clamp(n.z, 0.0, 1.0)) * u_depthShift;
    v -= depth;
    v = clamp(v, 0.0, 1.0);
    // A broad key light and a quiet fill make the layered icons read as volumes.
    float key = max(dot(n, normalize(vec3(-0.6, 0.8, 1.0))), 0.0);
    float fill = max(dot(n, normalize(vec3(0.8, -0.2, 0.5))), 0.0);
    float sculpted = (0.28 + 0.72 * v) * (0.28 + 0.58 * key + 0.14 * fill) * vSurfaceTone;
    v = mix(v, sculpted, u_sculptural);

    gl_FragColor = vec4(vec3(v * u_visibility), 1.0);
  }
`;

type PlasmaUniforms = {
  u_angles: { value: THREE.Vector4 };
  u_radii: { value: THREE.Vector4 };
  u_centerXs: { value: THREE.Vector4 };
  u_centerYs: { value: THREE.Vector4 };
  u_sineTable: { value: Float32Array };
  u_hueShift: { value: number };
  u_zoomFactor: { value: number };
  u_complexity: { value: number };
  u_pixelsPerCell: { value: number };
  u_rampLength: { value: number };
  u_depthShift: { value: number };
  u_visibility: { value: number };
  u_plasmaWave: { value: Float32Array };
  u_sculptural: { value: number };
};

const createPlasmaMaterial = (): {
  material: THREE.ShaderMaterial;
  uniforms: PlasmaUniforms;
} => {
  const uniforms: PlasmaUniforms = {
    u_angles: { value: new THREE.Vector4(0, 0, 0, 0) },
    u_radii: {
      value: new THREE.Vector4(RADII[0], RADII[1], RADII[2], RADII[3]),
    },
    u_centerXs: {
      value: new THREE.Vector4(
        CENTER_XS[0],
        CENTER_XS[1],
        CENTER_XS[2],
        CENTER_XS[3],
      ),
    },
    u_centerYs: {
      value: new THREE.Vector4(
        CENTER_YS[0],
        CENTER_YS[1],
        CENTER_YS[2],
        CENTER_YS[3],
      ),
    },
    u_sineTable: { value: new Float32Array(SINE_TABLE) },
    u_hueShift: { value: 0 },
    u_zoomFactor: { value: 1 / PLASMA_ZOOM },
    u_complexity: { value: PLASMA_COMPLEXITY },
    u_pixelsPerCell: { value: PLASMA_PIXELS_PER_CELL },
    u_rampLength: { value: PLASMA_RAMP_LENGTH },
    u_depthShift: { value: PLASMA_DEPTH_SHIFT },
    u_visibility: { value: 1 },
    u_plasmaWave: { value: buildMirroredPlasmaRamp(64) },
    u_sculptural: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: PLASMA_VERTEX_SHADER,
    fragmentShader: PLASMA_FRAGMENT_SHADER,
    uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
  });
  return { material, uniforms };
};

const buildTwistedBox = (): THREE.BufferGeometry => {
  const geometry = new THREE.BoxGeometry(1.4, 1.4, 1.4, 12, 12, 12);
  const positions = geometry.attributes.position;
  const v = new THREE.Vector3();
  const twist = 1.6;
  for (let i = 0; i < positions.count; i++) {
    v.fromBufferAttribute(positions, i);
    const angle = v.y * twist;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const x = v.x * c - v.z * s;
    const z = v.x * s + v.z * c;
    positions.setXYZ(i, x, v.y, z);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
};

const buildGeometryPool = (): THREE.BufferGeometry[] => {
  const torusKnot = new THREE.TorusKnotGeometry(0.8, 0.28, 160, 24);
  torusKnot.computeBoundingSphere();
  const icosahedron = new THREE.IcosahedronGeometry(1.0, 0);
  icosahedron.computeBoundingSphere();
  const dodecahedron = new THREE.DodecahedronGeometry(1.0, 0);
  dodecahedron.computeBoundingSphere();
  const twistedBox = buildTwistedBox();
  return [torusKnot, icosahedron, dodecahedron, twistedBox];
};

const frameCameraToGeometry = (
  camera: THREE.PerspectiveCamera,
  geometry: THREE.BufferGeometry,
) => {
  const radius = geometry.boundingSphere?.radius ?? 1;
  camera.position.set(0, 0, radius * CAMERA_FRAME_FACTOR);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
};

type SceneRefs = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  uniforms: PlasmaUniforms;
  geometries: THREE.BufferGeometry[];
  geometryCache: ReturnType<typeof createGeometryCache>;
  poolIndex: number;
  rotation: number;
  plasmaAngles: [number, number, number, number];
  hueShift: number;
  lastTickAt: number;
  rafId: number | null;
  controls: OrbitControls | null;
  reducedMotion: boolean;
  paused: boolean;
  lastInteractionAt: number;
  userHasInteracted: boolean;
  interacting: boolean;
  transition: { index: number; startedAt: number } | null;
};

const swapToNextShape = (refs: SceneRefs) => {
  refs.poolIndex = (refs.poolIndex + 1) % refs.geometries.length;
  refs.mesh.geometry = refs.geometries[refs.poolIndex];
  if (!refs.userHasInteracted) {
    frameCameraToGeometry(refs.camera, refs.mesh.geometry);
    refs.controls?.target.set(0, 0, 0);
  }
};

export const useShapesLuminance = (
  active: boolean,
  interactionTarget: HTMLElement | null,
  options?: ShapeOptions,
): UseShapesLuminanceResult => {
  const samplerCtxRef = useRef(createSamplerContext());
  const sceneRef = useRef<SceneRefs | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const createGeometries = options?.createGeometries ?? buildGeometryPool;

  const lutCache = useMemo(() => buildContrastLutCache(CONTRAST_LUT_GAINS), []);

  useEffect(() => {
    if (!active) {
      return;
    }

    // The landing samples just 100 x 56 ASCII cells; avoid a full-size 3D buffer.
    const renderWidth = optionsRef.current
      ? window.matchMedia("(max-width: 767px)").matches
        ? 400
        : 600
      : RENDER_WIDTH;
    const renderHeight = optionsRef.current
      ? Math.round(renderWidth * 0.56)
      : RENDER_HEIGHT;
    const canvas = document.createElement("canvas");
    canvas.width = renderWidth;
    canvas.height = renderHeight;
    canvasRef.current = canvas;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: Boolean(optionsRef.current),
      });
    } catch {
      // Navigation remains usable on devices without WebGL.
      canvasRef.current = null;
      return;
    }
    renderer.setPixelRatio(1);
    renderer.setSize(renderWidth, renderHeight, false);
    renderer.setClearColor(0x000000, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      40,
      renderWidth / renderHeight,
      0.1,
      100,
    );

    const geometries = createGeometries();
    const geometryCache = createGeometryCache(
      geometries,
      optionsRef.current?.createGeometry,
    );
    const { material, uniforms } = createPlasmaMaterial();
    uniforms.u_pixelsPerCell.value =
      (PLASMA_PIXELS_PER_CELL * renderWidth) / RENDER_WIDTH;
    material.vertexColors = Boolean(optionsRef.current);
    uniforms.u_sculptural.value = optionsRef.current ? 1 : 0;
    const initialIndex = optionsRef.current?.shapeIndex ?? 0;
    const initialGeometry = geometryCache.get(initialIndex);
    const mesh = new THREE.Mesh(initialGeometry, material);
    scene.add(mesh);

    frameCameraToGeometry(camera, initialGeometry);

    const startedAt = performance.now();
    const reducedMotion = getIsReducedMotion();
    const refs: SceneRefs = {
      renderer,
      scene,
      camera,
      mesh,
      material,
      uniforms,
      geometries,
      geometryCache,
      poolIndex: initialIndex,
      rotation: 0,
      plasmaAngles: [0, 0, 0, 0],
      hueShift: 0,
      lastTickAt: startedAt,
      rafId: null,
      controls: null,
      reducedMotion,
      paused: reducedMotion,
      lastInteractionAt: startedAt,
      userHasInteracted: false,
      interacting: false,
      transition: null,
    };
    sceneRef.current = refs;

    let firstFrameRendered = false;

    const tick = (now: number) => {
      if (optionsRef.current && now - refs.lastTickAt < 1000 / 30) {
        refs.rafId = requestAnimationFrame(tick);
        return;
      }
      const dt = Math.min(0.05, (now - refs.lastTickAt) / 1000);
      refs.lastTickAt = now;

      const controlled = optionsRef.current;
      if (controlled && refs.controls)
        refs.controls.enableDamping =
          !controlled.paused && !controlled.reducedMotion;
      const recentlyInteracted =
        refs.interacting ||
        (refs.userHasInteracted &&
          now - refs.lastInteractionAt < IDLE_RESUME_MS);
      refs.controls?.update();
      if (controlled) {
        refs.paused =
          controlled.paused || controlled.reducedMotion || recentlyInteracted;
        if (
          controlled.shapeIndex !== (refs.transition?.index ?? refs.poolIndex)
        ) {
          refs.transition = { index: controlled.shapeIndex, startedAt: now };
        }
        if (refs.transition) {
          const progress =
            controlled.reducedMotion || controlled.paused
              ? 1
              : Math.min(1, (now - refs.transition.startedAt) / 680);
          if (progress >= 0.5 && refs.poolIndex !== refs.transition.index) {
            refs.poolIndex = refs.transition.index;
            refs.mesh.geometry = refs.geometryCache.get(refs.poolIndex);
            if (!refs.userHasInteracted)
              frameCameraToGeometry(refs.camera, refs.mesh.geometry);
          }
          // Shrink into the texture, swap at the midpoint, then drift back in.
          const visibility = Math.abs(progress * 2 - 1);
          const eased = visibility * visibility * (3 - 2 * visibility);
          refs.mesh.scale.setScalar(0.08 + 0.92 * eased);
          refs.uniforms.u_visibility.value = eased;
          refs.mesh.position.y = (progress < 0.5 ? 1 : -1) * (1 - eased) * 0.3;
          if (progress === 1) refs.transition = null;
        } else if (refs.paused && firstFrameRendered && !recentlyInteracted) {
          refs.rafId = requestAnimationFrame(tick);
          return;
        }
      }

      if (
        refs.paused &&
        !controlled &&
        !refs.reducedMotion &&
        now - refs.lastInteractionAt > IDLE_RESUME_MS
      ) {
        refs.paused = false;
      }

      const randomFactor =
        controlled?.paused || controlled?.reducedMotion
          ? 0
          : controlled
            ? dt * 60
            : 0.5 + Math.random();
      for (let i = 0; i < 4; i++) {
        refs.plasmaAngles[i] +=
          ANGLE_INCREMENTS[i] * PLASMA_SPEED * randomFactor;
      }
      refs.hueShift += PLASMA_SPEED * randomFactor;
      refs.uniforms.u_angles.value.set(
        refs.plasmaAngles[0],
        refs.plasmaAngles[1],
        refs.plasmaAngles[2],
        refs.plasmaAngles[3],
      );
      refs.uniforms.u_hueShift.value = refs.hueShift;

      if (!refs.paused) {
        refs.rotation += ROTATION_RATE * dt;
        if (controlled) {
          // Keep navigation symbols readable while showing their depth.
          refs.mesh.rotation.set(
            -0.17 + Math.sin(refs.rotation * 0.7) * 0.14,
            -0.38 + Math.sin(refs.rotation) * 0.25,
            -0.06 + Math.sin(refs.rotation * 0.5) * 0.06,
          );
        } else {
          refs.mesh.setRotationFromAxisAngle(ROTATION_AXIS, refs.rotation);
        }
      }

      refs.renderer.render(refs.scene, refs.camera);
      if (!firstFrameRendered) {
        firstFrameRendered = true;
        setReady(true);
      }
      refs.rafId = requestAnimationFrame(tick);
    };

    let disposed = false;
    let compiled = false;
    const disposeResources = () => {
      refs.geometryCache.dispose();
      refs.material.dispose();
      refs.renderer.dispose();
    };
    // Keep first-use shader compilation out of the first animation frame.
    void renderer
      .compileAsync(scene, camera)
      .then(() => {
        if (!disposed) refs.rafId = requestAnimationFrame(tick);
      })
      .catch((error) => {
        if (!disposed) console.error("Shape initialization failed", error);
      })
      .finally(() => {
        compiled = true;
        if (disposed) disposeResources();
      });

    return () => {
      disposed = true;
      if (refs.rafId !== null) {
        cancelAnimationFrame(refs.rafId);
      }
      refs.controls?.dispose();
      refs.controls = null;
      // Three's compileAsync polls material state; release it after polling finishes.
      if (compiled) disposeResources();
      sceneRef.current = null;
      canvasRef.current = null;
      setReady(false);
    };
  }, [active, createGeometries]);

  useEffect(() => {
    const refs = sceneRef.current;
    if (!active || !interactionTarget || !refs) {
      return;
    }

    const controls = new OrbitControls(refs.camera, interactionTarget);
    controls.enableDamping = true;
    controls.dampingFactor = ORBIT_DAMPING;
    controls.enableZoom = true;
    controls.enablePan = true;
    if (optionsRef.current) {
      controls.enableZoom = false;
      controls.enablePan = false;
    }
    controls.screenSpacePanning = true;
    controls.minDistance = ORBIT_MIN_DISTANCE;
    controls.maxDistance = ORBIT_MAX_DISTANCE;
    controls.target.set(0, 0, 0);

    const onStart = () => {
      refs.interacting = true;
      refs.paused = true;
      refs.lastInteractionAt = performance.now();
    };
    const onChange = () => {
      refs.lastInteractionAt = performance.now();
    };
    const onEnd = () => {
      refs.interacting = false;
      refs.lastInteractionAt = performance.now();
    };
    controls.addEventListener("start", onStart);
    controls.addEventListener("change", onChange);
    controls.addEventListener("end", onEnd);

    let pointerDownX = 0;
    let pointerDownY = 0;
    let pointerDownAt = 0;
    let pointerActive = false;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) {
        pointerActive = false;
        return;
      }
      pointerActive = true;
      pointerDownX = e.clientX;
      pointerDownY = e.clientY;
      pointerDownAt = performance.now();
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!pointerActive) return;
      pointerActive = false;
      const dx = e.clientX - pointerDownX;
      const dy = e.clientY - pointerDownY;
      const dist = Math.hypot(dx, dy);
      const dt = performance.now() - pointerDownAt;
      if (dist < CLICK_DISTANCE_PX && dt < CLICK_DURATION_MS) {
        if (!optionsRef.current) swapToNextShape(refs);
      } else {
        refs.userHasInteracted = true;
      }
    };
    interactionTarget.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);

    refs.controls = controls;

    return () => {
      controls.removeEventListener("start", onStart);
      controls.removeEventListener("change", onChange);
      controls.removeEventListener("end", onEnd);
      interactionTarget.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      controls.dispose();
      if (sceneRef.current === refs) {
        refs.controls = null;
        refs.interacting = false;
      }
    };
  }, [active, interactionTarget]);

  const sample = useCallback(
    (args: SamplerArgs): LuminanceSample | null => {
      const canvas = canvasRef.current;
      if (!canvas || !ready) {
        return null;
      }
      return sampleDrawableToLuminance(
        samplerCtxRef.current,
        canvas,
        { width: canvas.width, height: canvas.height },
        { ...args, imageSmoothing: false },
        lutCache,
      );
    },
    [ready, lutCache],
  );

  return { sample, ready };
};
