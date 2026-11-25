"use client";

import { Canvas, events, useFrame, useThree } from "@react-three/fiber";
import { Billboard, OrbitControls } from "@react-three/drei";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
  type ComponentRef,
} from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  EdgesGeometry,
  Mesh,
  Plane,
  Raycaster,
  Spherical,
  Vector2,
  Vector3,
  type LineSegments,
} from "three";
import { ConvexGeometry } from "three/addons/geometries/ConvexGeometry.js";
import { paddedPoints3d } from "./clusterHulls";
import { SPACE_COLORS } from "./spaceTypes";
import { SpaceLabel } from "./SemanticSpace3D";
import type { ConnectionGroup } from "./connectionAnalysis";
import type { ConnectionEdge } from "./connectionGraph";
import {
  blendConnectionLinks,
  createDepthTransition,
  applyDepthTransition,
  type DepthTransition,
} from "./connectionTransitions";
import type { AtlasProject } from "./model";
import { SpaceProjectTooltip } from "./SpaceProjectTooltip";
import { SpaceClusterTooltip } from "./SpaceClusterTooltip";
import { projectHoverDetails } from "./projectHover";
import { prioritizeSpaceHits } from "./spacePicking";
import { createTooltipDismissal, tooltipCorner } from "./spaceTooltip";
import {
  syncConnectionPoints,
  stepConnectionSimulation,
  type ConnectionPoint,
} from "./connectionSimulation";

type Node = { id: string; label: string; accentColor: string | null };
const CAMERA = { position: [0, 0, 145] as [number, number, number], fov: 55 };
type HoverTarget = { kind: "project" | "cluster"; id: string };
type HoverHandler = (target: HoverTarget, active: boolean) => void;

/** The Explorer's padded hull construction, following the live force positions. */
function ConnectionHull({
  ids,
  points,
  color,
  active,
  onHover,
  onSelect,
}: {
  ids: string[];
  points: RefObject<Map<string, ConnectionPoint>>;
  color: string;
  active: boolean;
  onHover: (active: boolean) => void;
  onSelect: () => void;
}) {
  const surface = useRef<Mesh>(null);
  const outline = useRef<LineSegments>(null);
  const signature = useRef("");
  const generated = useRef<
    { surface: ConvexGeometry; edges: EdgesGeometry } | undefined
  >(undefined);
  useEffect(
    () => () => {
      generated.current?.surface.dispose();
      generated.current?.edges.dispose();
      signature.current = "";
    },
    [],
  );
  // Separate from the simulation loop: a completed analysis can arrive after it settles.
  useFrame(() => {
    if (!surface.current || !outline.current) return;
    const positions = ids.flatMap((id) => {
      const point = points.current.get(id);
      return point ? [[point.x, point.y, point.z]] : [];
    });
    surface.current.visible = outline.current.visible = positions.length > 0;
    const next = positions.map((point) => point.join(",")).join(";");
    if (!positions.length || next === signature.current) return;
    const geometry = new ConvexGeometry(
      paddedPoints3d(positions, 3.5).map((point) => new Vector3(...point)),
    );
    const edges = new EdgesGeometry(geometry, 20);
    surface.current.geometry.dispose();
    outline.current.geometry.dispose();
    surface.current.geometry = geometry;
    outline.current.geometry = edges;
    generated.current = { surface: geometry, edges };
    signature.current = next;
  });
  return (
    <group>
      <mesh
        ref={surface}
        renderOrder={-2}
        userData={{ pickPriority: -1 }}
        onPointerMove={(event) => {
          event.stopPropagation();
          if (!event.buttons && event.pointerType !== "touch") onHover(true);
        }}
        onPointerOut={() => onHover(false)}
        onClick={(event) => {
          event.stopPropagation();
          if (event.delta <= 4) onSelect();
        }}
      >
        <bufferGeometry />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={active ? 0.11 : 0.045}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <lineSegments ref={outline} renderOrder={-1} raycast={() => undefined}>
        <bufferGeometry />
        <lineBasicMaterial
          color={color}
          transparent
          opacity={active ? 0.55 : 0.2}
          depthWrite={false}
          toneMapped={false}
        />
      </lineSegments>
    </group>
  );
}

type GraphProps = {
  compact?: boolean;
  mutedIds?: string[];
  ringedIds?: string[];
  activeGroup?: string;
  nodes: Node[];
  links: ConnectionEdge[];
  perspective: string;
  groups?: ConnectionGroup[];
  selectedId: string;
  showLinks: boolean;
  showHulls: boolean;
  contrast: number;
  onSelect: (id: string) => void;
  onClusterSelect: (index: number) => void;
  projects: AtlasProject[];
  locale: "en" | "de";
  labels: boolean;
  highlightedIds: string[];
  visibleLinkIds: string[] | null;
  resetView: number;
  reducedMotion: boolean;
  flat: boolean;
};
function GraphScene({
  nodes,
  links,
  perspective,
  selectedId,
  showLinks,
  groups,
  showHulls,
  contrast,
  onSelect,
  onClusterSelect,
  hovered,
  onHover,
  onInteraction,
  labels,
  highlightedIds,
  visibleLinkIds,
  resetView,
  reducedMotion,
  flat,
  mutedIds = [],
  ringedIds = [],
  activeGroup,
}: GraphProps & {
  hovered: HoverTarget | null;
  onHover: HoverHandler;
  onInteraction: (active: boolean) => void;
}) {
  const meshes = useRef(new Map<string, Mesh>());
  useEffect(
    () => () => {
      document.body.style.cursor = "";
    },
    [],
  );
  const points = useRef(new Map<string, ConnectionPoint>());
  const [displayLinks, setDisplayLinks] = useState(links);
  const currentLinks = useRef(links);
  const adaptiveLayout = perspective.endsWith(":similarity");
  const containment = useRef(Number(adaptiveLayout));
  const lastPerspective = useRef(perspective);
  const transition = useRef<{
    from: ConnectionEdge[];
    to: ConnectionEdge[];
    elapsed: number;
    fromContainment: number;
    toContainment: number;
  } | null>(null);
  const steps = useRef(0);
  const elapsed = useRef(0);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const pinned = useRef<ConnectionPoint | null>(null);
  const depths = useRef(new Map<string, number>());
  const wasFlat = useRef(false);
  const depthTransition = useRef<
    (DepthTransition & { elapsed: number }) | null
  >(null);
  const cameraTransition = useRef<{
    elapsed: number;
    from: Spherical;
    target: Vector3;
  } | null>(null);
  const cameraWasFlat = useRef(flat);
  const { camera, gl, invalidate, size } = useThree();
  useEffect(() => {
    cameraTransition.current = null;
    camera.position.set(...CAMERA.position);
    camera.position.multiplyScalar(
      Math.max(1, size.height / Math.max(1, size.width)),
    );
    controls.current?.target.set(0, 0, 0);
    controls.current?.update();
    invalidate();
  }, [resetView, camera, invalidate, size.width, size.height]);
  const callbacks = useRef({ onSelect, onInteraction });
  useLayoutEffect(() => {
    callbacks.current = { onSelect, onInteraction };
  });
  useEffect(() => {
    const canvas = gl.domElement;
    const raycaster = new Raycaster();
    const pointer = new Vector2();
    const plane = new Plane();
    const offset = new Vector3();
    const hit = new Vector3();
    let drag: {
      id: string;
      pointerId: number;
      x: number;
      y: number;
      moved: boolean;
    } | null = null;
    let suppressClick = false;
    const aim = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        (-(event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
    };
    const finish = () => {
      if (!drag) return;
      const pointerId = drag.pointerId;
      drag = null;
      pinned.current = null;
      steps.current = 0;
      if (controls.current) controls.current.enabled = true;
      if (canvas.hasPointerCapture(pointerId))
        canvas.releasePointerCapture(pointerId);
      document.body.style.cursor = "";
      callbacks.current.onInteraction(false);
      invalidate();
    };
    const down = (event: PointerEvent) => {
      if (drag || event.button !== 0 || !event.isPrimary) return;
      suppressClick = false;
      aim(event);
      const intersection = raycaster.intersectObjects(
        [...meshes.current.values()],
        false,
      )[0];
      if (!intersection) return;
      const id = [...meshes.current].find(
        ([, mesh]) => mesh === intersection.object,
      )?.[0];
      const point = id ? points.current.get(id) : undefined;
      if (!id || !point) return;
      // Capture before OrbitControls sees pointerdown, so grabbing never rotates the camera.
      event.stopImmediatePropagation();
      event.preventDefault();
      suppressClick = true;
      if (controls.current) controls.current.enabled = false;
      plane.setFromNormalAndCoplanarPoint(
        camera.getWorldDirection(new Vector3()),
        new Vector3(point.x, point.y, point.z),
      );
      raycaster.ray.intersectPlane(plane, hit);
      offset.set(point.x, point.y, point.z).sub(hit);
      point.vx = point.vy = point.vz = 0;
      pinned.current = point;
      steps.current = 0;
      drag = {
        id,
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        moved: false,
      };
      canvas.setPointerCapture(event.pointerId);
      document.body.style.cursor = "grabbing";
      callbacks.current.onInteraction(true);
      invalidate();
    };
    const move = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointerId || !pinned.current)
        return;
      event.stopImmediatePropagation();
      drag.moved ||=
        Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 4;
      if (!drag.moved) return;
      aim(event);
      if (raycaster.ray.intersectPlane(plane, hit)) {
        hit.add(offset);
        Object.assign(pinned.current, { x: hit.x, y: hit.y, z: hit.z });
        invalidate();
      }
    };
    const up = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      event.stopImmediatePropagation();
      const { id, moved } = drag;
      finish();
      if (!moved) callbacks.current.onSelect(id);
    };
    const cancel = (event: PointerEvent) => {
      if (event.pointerId === drag?.pointerId) finish();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
    };
    const click = (event: MouseEvent) => {
      if (suppressClick) event.stopImmediatePropagation();
    };
    canvas.addEventListener("pointerdown", down, true);
    canvas.addEventListener("click", click, true);
    canvas.addEventListener("lostpointercapture", cancel);
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", up, true);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("blur", finish);
    window.addEventListener("keydown", escape);
    return () => {
      finish();
      canvas.removeEventListener("pointerdown", down, true);
      canvas.removeEventListener("click", click, true);
      canvas.removeEventListener("lostpointercapture", cancel);
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", up, true);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("blur", finish);
      window.removeEventListener("keydown", escape);
    };
  }, [camera, gl, invalidate]);
  useLayoutEffect(() => {
    syncConnectionPoints(points.current, nodes);
    steps.current = 0;
    elapsed.current = 0;
    invalidate();
  }, [nodes, links, contrast, flat, reducedMotion, invalidate]);

  useLayoutEffect(() => {
    if (flat !== wasFlat.current) {
      // Preserve the original depths through rapid reversals of an unfinished squeeze.
      if (flat && !depthTransition.current) {
        depths.current = new Map(
          [...points.current].map(([id, point]) => [id, point.z]),
        );
      }
      depthTransition.current = {
        ...createDepthTransition(points.current, flat, depths.current),
        elapsed: 0,
      };
      wasFlat.current = flat;
    }
    if (reducedMotion && depthTransition.current) {
      applyDepthTransition(points.current, depthTransition.current, 1);
      depthTransition.current = null;
    }
    if (flat !== cameraWasFlat.current) {
      cameraTransition.current = flat
        ? {
            elapsed: 0,
            from: new Spherical().setFromVector3(
              camera.position
                .clone()
                .sub(controls.current?.target ?? new Vector3()),
            ),
            target: controls.current?.target.clone() ?? new Vector3(),
          }
        : null;
      cameraWasFlat.current = flat;
    }
    steps.current = 0;
    invalidate();
  }, [flat, reducedMotion, camera, invalidate]);

  useLayoutEffect(() => {
    if (
      !reducedMotion &&
      (lastPerspective.current !== perspective || perspective !== "manual")
    ) {
      transition.current = {
        from: currentLinks.current,
        to: links,
        elapsed: 0,
        fromContainment: containment.current,
        toContainment: Number(adaptiveLayout),
      };
      currentLinks.current = blendConnectionLinks(
        currentLinks.current,
        links,
        0,
      );
    } else {
      transition.current = null;
      currentLinks.current = links;
      containment.current = Number(adaptiveLayout);
    }
    lastPerspective.current = perspective;
    setDisplayLinks(currentLinks.current);
    invalidate();
  }, [links, perspective, adaptiveLayout, reducedMotion, invalidate]);
  const segments = useMemo(
    () => displayLinks.map((edge) => [edge.source, edge.target] as const),
    [displayLinks],
  );
  const geometry = useMemo(() => {
    const shape = new BufferGeometry();
    shape.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(segments.length * 6), 3),
    );
    shape.setAttribute(
      "color",
      new BufferAttribute(new Float32Array(segments.length * 8), 4),
    );
    return shape;
  }, [segments]);
  const palette = useMemo(
    () => ({
      weak: new Color("#555555"),
      strong: new Color("#eeeeee"),
      color: new Color(),
    }),
    [],
  );
  const visibleEdges = useMemo(
    () => (visibleLinkIds === null ? null : new Set(visibleLinkIds)),
    [visibleLinkIds],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  const line = useRef<LineSegments>(null);
  useFrame((_, delta) => {
    const fading = transition.current;
    if (fading) {
      fading.elapsed += delta;
      const progress = Math.min(1, fading.elapsed / 0.5);
      const eased = progress * progress * (3 - 2 * progress);
      containment.current =
        fading.fromContainment +
        (fading.toContainment - fading.fromContainment) * eased;
      currentLinks.current = blendConnectionLinks(
        fading.from,
        fading.to,
        progress,
      );
      steps.current = 0;
      if (progress === 1) {
        transition.current = null;
        setDisplayLinks(fading.to);
      }
    }
    const depth = depthTransition.current;
    if (depth) {
      depth.elapsed += Math.min(delta, 0.05);
      steps.current = 0;
    }
    const cameraMove = cameraTransition.current;
    if (cameraMove) {
      cameraMove.elapsed += Math.min(delta, 0.05);
      const t = reducedMotion ? 1 : Math.min(1, cameraMove.elapsed / 0.5);
      const eased = t * t * (3 - 2 * t);
      const target = cameraMove.target.clone().multiplyScalar(1 - eased);
      camera.position
        .setFromSphericalCoords(
          cameraMove.from.radius,
          cameraMove.from.phi + (Math.PI / 2 - cameraMove.from.phi) * eased,
          cameraMove.from.theta * (1 - eased),
        )
        .add(target);
      controls.current?.target.copy(target);
      camera.lookAt(target);
      controls.current?.update();
      if (t === 1) cameraTransition.current = null;
    }
    const constrainDepth = () => {
      if (depth)
        applyDepthTransition(
          points.current,
          depth,
          depth.elapsed / 0.5,
          pinned.current,
        );
      else if (flat)
        for (const point of points.current.values()) point.z = point.vz = 0;
    };
    const liveLinks = currentLinks.current;
    if (pinned.current) steps.current = 0;
    // Reduced motion settles a changed graph before painting, while direct dragging remains responsive.
    if (reducedMotion && !pinned.current && steps.current <= 420) {
      for (let i = steps.current; i <= 420; i++) {
        stepConnectionSimulation(
          points.current,
          liveLinks,
          contrast,
          null,
          containment.current,
          flat ? 2 : 3,
        );
        constrainDepth();
      }
      steps.current = 421;
    }
    elapsed.current += steps.current <= 420 ? Math.min(delta, 0.05) : 0;
    while (elapsed.current >= 1 / 60) {
      stepConnectionSimulation(
        points.current,
        liveLinks,
        contrast,
        pinned.current,
        containment.current,
        flat ? 2 : 3,
      );
      constrainDepth();
      elapsed.current -= 1 / 60;
      steps.current++;
    }
    constrainDepth();
    if (depth && depth.elapsed >= 0.5) depthTransition.current = null;
    for (const [id, point] of points.current) {
      meshes.current.get(id)?.position.set(point.x, point.y, point.z);
    }
    const attribute = geometry.getAttribute("position") as BufferAttribute;
    segments.forEach(([source, target], i) => {
      const a = points.current.get(source),
        b = points.current.get(target);
      if (!a || !b) return;
      attribute.setXYZ(i * 2, a.x, a.y, a.z);
      attribute.setXYZ(i * 2 + 1, b.x, b.y, b.z);
    });
    const colors = geometry.getAttribute("color") as BufferAttribute;
    const scores = new Map(liveLinks.map((edge) => [edge.id, edge.score]));
    displayLinks.forEach((edge, index) => {
      const strength = Math.max(0, Math.min(1, scores.get(edge.id) ?? 0));
      const brightness = strength * strength;
      palette.color.copy(palette.weak).lerp(palette.strong, brightness);
      const visible = visibleEdges === null || visibleEdges.has(edge.id);
      const alpha =
        strength === 0
          ? 0
          : (0.035 + 0.865 * brightness) * (visible ? 1 : 0.06);
      for (let endpoint = 0; endpoint < 2; endpoint++)
        colors.setXYZW(
          index * 2 + endpoint,
          palette.color.r,
          palette.color.g,
          palette.color.b,
          alpha,
        );
    });
    colors.needsUpdate = true;
    attribute.needsUpdate = true;
    geometry.computeBoundingSphere();
    if (line.current) line.current.frustumCulled = false;
    if (
      steps.current <= 420 ||
      depthTransition.current ||
      cameraTransition.current
    )
      invalidate();
  });
  const connected = new Set(
    links.flatMap((edge) => [edge.source, edge.target]),
  );
  return (
    <>
      <ambientLight intensity={1.6} />
      <pointLight position={[50, 60, 100]} intensity={1200} />
      {showHulls &&
        groups?.map((group, index) => (
          <ConnectionHull
            key={group.id}
            ids={group.ids}
            points={points}
            color={SPACE_COLORS[index % SPACE_COLORS.length]}
            active={
              activeGroup === group.id ||
              (hovered?.kind === "cluster" && hovered.id === group.id)
            }
            onHover={(active) =>
              onHover({ kind: "cluster", id: group.id }, active)
            }
            onSelect={() => onClusterSelect(index)}
          />
        ))}
      <lineSegments ref={line} geometry={geometry} visible={showLinks}>
        <lineBasicMaterial
          vertexColors
          transparent
          toneMapped={false}
          depthWrite={false}
        />
      </lineSegments>
      {nodes.map((node) => (
        <mesh
          key={node.id}
          userData={{ pickPriority: 2 }}
          ref={(mesh) => {
            if (mesh) meshes.current.set(node.id, mesh);
            else meshes.current.delete(node.id);
          }}
          onClick={(event) => {
            event.stopPropagation();
            if (event.delta <= 4) onSelect(node.id);
          }}
          onPointerMove={(event) => {
            event.stopPropagation();
            if (!event.buttons && event.pointerType !== "touch")
              onHover({ kind: "project", id: node.id }, true);
            document.body.style.cursor = "grab";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "";
            onHover({ kind: "project", id: node.id }, false);
          }}
        >
          <sphereGeometry args={[node.id === selectedId ? 2.8 : 1.8, 12, 9]} />
          <meshBasicMaterial
            color={
              node.accentColor ??
              (connected.has(node.id) ? "#cccccc" : "#777777")
            }
            toneMapped={false}
            transparent
            opacity={
              !mutedIds.includes(node.id) &&
              (!highlightedIds.length || highlightedIds.includes(node.id))
                ? 1
                : 0.15
            }
          />
          {ringedIds.includes(node.id) && !mutedIds.includes(node.id) && (
            <Billboard>
              <mesh raycast={() => {}}>
                <ringGeometry args={[3.1, 3.4, 32]} />
                <meshBasicMaterial
                  color="#ffffff"
                  transparent
                  opacity={0.75}
                  depthTest={false}
                />
              </mesh>
            </Billboard>
          )}
          {(labels || selectedId === node.id) && (
            <SpaceLabel
              text={node.label}
              position={[0, 3.2, 0]}
              selected={selectedId === node.id}
              height={2.4}
            />
          )}
        </mesh>
      ))}
      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping={!reducedMotion}
        enableRotate={!flat}
        dampingFactor={0.08}
        minDistance={35}
        maxDistance={350}
        onStart={() => {
          cameraTransition.current = null;
          onInteraction(true);
        }}
        onEnd={() => onInteraction(false)}
      />
    </>
  );
}

export default function ConnectionExplorerGraph3D(props: GraphProps) {
  const [hover, setHover] = useState<
    (HoverTarget & { links: ConnectionEdge[] }) | null
  >(null);
  const [corner, setCorner] =
    useState<ReturnType<typeof tooltipCorner>>("top-right");
  const dismissal = useRef(createTooltipDismissal());
  const activeKey = useRef<string | null>(null);
  const interacting = useRef(false);
  const [hideTooltip, setHideTooltip] = useState(false);
  const clearHover = () => {
    activeKey.current = null;
    dismissal.current.leave();
    setHover(null);
  };
  const hovered =
    hover?.links === props.links &&
    (hover.kind === "project" || props.showHulls)
      ? hover
      : null;
  const project =
    hovered?.kind === "project"
      ? props.projects.find((item) => item.id === hovered.id)
      : undefined;
  const groupIndex =
    props.groups?.findIndex((group) =>
      project ? group.ids.includes(project.id) : group.id === hovered?.id,
    ) ?? -1;
  const group = groupIndex >= 0 ? props.groups?.[groupIndex] : undefined;
  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismissal.current.dismiss();
        setHover(null);
      }
    };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, []);
  return (
    <div
      className="vs-space-3d"
      data-tooltip-corner={corner}
      onPointerLeave={clearHover}
      onPointerCancel={() => {
        interacting.current = false;
        setHideTooltip(false);
        clearHover();
      }}
      onPointerMoveCapture={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        setCorner(
          tooltipCorner(
            [event.clientX - bounds.left, event.clientY - bounds.top],
            [bounds.width, bounds.height],
          ),
        );
      }}
    >
      <Canvas
        frameloop="demand"
        camera={CAMERA}
        dpr={[1, 1.75]}
        gl={{ antialias: true }}
        events={(state) => ({ ...events(state), filter: prioritizeSpaceHits })}
      >
        <color attach="background" args={["#101010"]} />
        <GraphScene
          {...props}
          hovered={hovered}
          onInteraction={(active) => {
            interacting.current = active;
            setHideTooltip(active);
            if (!active) clearHover();
          }}
          onHover={(target, active) => {
            if (interacting.current) return;
            const key = `${target.kind}:${target.id}`;
            if (!active) {
              if (activeKey.current === key) clearHover();
            } else {
              activeKey.current = key;
              if (dismissal.current.show(key))
                setHover((current) =>
                  current?.kind === target.kind &&
                  current.id === target.id &&
                  current.links === props.links
                    ? current
                    : { ...target, links: props.links },
                );
            }
          }}
        />
      </Canvas>
      {!hideTooltip &&
        (project ? (
          <SpaceProjectTooltip
            compact={props.compact}
            details={projectHoverDetails(
              project,
              groupIndex,
              group?.ids.length ?? 0,
              props.locale,
            )}
          />
        ) : hovered?.kind === "cluster" && group ? (
          <SpaceClusterTooltip
            compact={props.compact}
            className="vs-spatial-tooltip"
            group={{
              index: groupIndex,
              ids: group.ids,
              label: `${props.locale === "de" ? "Gruppe" : "Group"} ${String(groupIndex + 1).padStart(2, "0")}`,
              terms: group.traits.map((trait) => ({
                term: trait.value,
                count: trait.count,
                total: group.ids.length,
              })),
            }}
          />
        ) : null)}
    </div>
  );
}
