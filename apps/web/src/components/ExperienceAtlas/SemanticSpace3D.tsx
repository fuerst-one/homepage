"use client";

import { Canvas, events, useFrame, useThree } from "@react-three/fiber";
import { Billboard, Line, OrbitControls } from "@react-three/drei";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ComponentRef,
  type RefObject,
} from "react";
import {
  CanvasTexture,
  EdgesGeometry,
  SRGBColorSpace,
  Vector3,
  Group,
  Mesh,
  LineSegments,
  MeshBasicMaterial,
  type InterleavedBufferAttribute,
} from "three";
import { ConvexGeometry } from "three/addons/geometries/ConvexGeometry.js";
import type { SpaceNode } from "./SemanticSpaceCharts";
import { paddedPoints3d } from "./clusterHulls";
import { axisEndLabel, type AxisDescription } from "./spaceAxes";
import { interpolateSpaceNodes, SPACE_TRANSITION_MS } from "./spaceMotion";
import { useReducedMotion } from "./useReducedMotion";
import type { SpaceViewport } from "./spaceViewport";
import type { SpaceConnections } from "./spaceConnections";
import { SpaceClusterTooltip } from "./SpaceClusterTooltip";
import { SpaceProjectTooltip } from "./SpaceProjectTooltip";
import { prioritizeSpaceHits } from "./spacePicking";
import { tooltipCorner } from "./spaceTooltip";

type Point = [number, number, number];
type MovingNode = SpaceNode & { point: Point; opacity: number };
type Positions = RefObject<Map<string, MovingNode>>;

/** Canvas labels avoid nested React DOM roots during WebGL view teardown. */
function SpaceLabel({
  text,
  position,
  selected = false,
  height = 0.23,
  onSelect,
  onHover,
}: {
  text: string;
  position: Point;
  selected?: boolean;
  height?: number;
  onSelect?: () => void;
  onHover?: (hovered: boolean) => void;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    ctx.font = "24px monospace";
    canvas.width = Math.ceil(ctx.measureText(text).width) + 24;
    canvas.height = 42;
    ctx.font = "24px monospace";
    ctx.fillStyle = selected ? "#262626" : "#0a0a0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = selected ? "#e5e5e5" : "#404040";
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
    ctx.fillStyle = selected ? "#ffffff" : "#d4d4d4";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 12, 22);
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    return result;
  }, [text, selected]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite
      position={position}
      scale={[(texture.image.width / 42) * height, height, 1]}
      center={[0.5, 0]}
      renderOrder={selected ? 4 : 3}
      userData={{ pickPriority: selected ? 4 : 3 }}
      onPointerOver={
        onHover
          ? (event) => {
              event.stopPropagation();
              onHover(true);
            }
          : undefined
      }
      onPointerOut={onHover ? () => onHover(false) : undefined}
      onPointerMove={
        onHover
          ? (event) => {
              event.stopPropagation();
              if (!event.buttons && event.pointerType !== "touch")
                onHover(true);
            }
          : undefined
      }
      onClick={
        onSelect
          ? (e) => {
              e.stopPropagation();
              if (e.delta > 4) return;
              onSelect();
            }
          : undefined
      }
    >
      <spriteMaterial
        map={texture}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </sprite>
  );
}

function ClusterEnvelope({
  nodes,
  positions,
  active,
  dimmed,
  onHover,
  onSelect,
}: {
  nodes: MovingNode[];
  positions: Positions;
  active: boolean;
  dimmed: boolean;
  onHover: (hovered: boolean) => void;
  onSelect: () => void;
}) {
  const mesh = useRef<Mesh>(null);
  const outline = useRef<LineSegments>(null);
  const last = useRef("");
  const generated = useRef<
    { surface: ConvexGeometry; edges: EdgesGeometry } | undefined
  >(undefined);
  useEffect(() => {
    return () => {
      generated.current?.surface.dispose();
      generated.current?.edges.dispose();
      last.current = "";
    };
  }, []);
  // Update hulls from the displayed positions, so points never outrun their envelopes.
  // Geometry changes only while points move; dispose every replaced GPU buffer.
  useFrame(() => {
    if (!mesh.current || !outline.current) return;
    const moving = nodes
      .map((n) => positions.current.get(n.id) ?? n)
      .filter((n) => n.opacity > 0.05);
    if (!moving.length) {
      mesh.current.visible = outline.current.visible = false;
      return;
    }
    mesh.current.visible = outline.current.visible = true;
    const signature = moving
      .map((n) => `${n.id}:${n.point.join(",")}`)
      .join(";");
    if (signature !== last.current) {
      const geometry = new ConvexGeometry(
        paddedPoints3d(
          moving.map((n) => n.point),
          Math.max(...moving.map((n) => n.diameter)) / 200 + 0.05,
        ).map((p) => new Vector3(...p)),
      );
      mesh.current.geometry.dispose();
      outline.current.geometry.dispose();
      mesh.current.geometry = geometry;
      const edges = new EdgesGeometry(geometry, 20);
      outline.current.geometry = edges;
      generated.current = { surface: geometry, edges };
      last.current = signature;
    }
    for (const object of [mesh.current, outline.current]) {
      const material = object.material as MeshBasicMaterial;
      material.color.set(moving[0].color);
      material.opacity =
        (object === mesh.current
          ? active
            ? 0.085
            : dimmed
              ? 0.009
              : 0.035
          : active
            ? 0.36
            : dimmed
              ? 0.04
              : 0.13) * Math.max(...moving.map((n) => n.opacity));
    }
  });
  return (
    <group>
      <mesh
        ref={mesh}
        renderOrder={-2}
        userData={{ pickPriority: -1 }}
        onClick={(event) => {
          event.stopPropagation();
          if (event.delta <= 4) onSelect();
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          if (event.pointerType !== "touch" && !event.buttons) onHover(true);
        }}
        onPointerMove={(event) => {
          event.stopPropagation();
          if (event.pointerType !== "touch" && !event.buttons) onHover(true);
        }}
        onPointerOut={() => onHover(false)}
      >
        <bufferGeometry />
        <meshBasicMaterial
          color={nodes[0].color}
          transparent
          opacity={0.055}
          depthWrite={false}
        />
      </mesh>
      <lineSegments ref={outline} renderOrder={-1} raycast={() => undefined}>
        <bufferGeometry />
        <lineBasicMaterial
          color={nodes[0].color}
          transparent
          opacity={0.13}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}

function MovingConnection({
  a,
  b,
  positions,
}: {
  a: MovingNode;
  b: MovingNode;
  positions: Positions;
}) {
  const line = useRef<ComponentRef<typeof Line>>(null);
  useFrame(() => {
    const from = positions.current.get(a.id),
      to = positions.current.get(b.id);
    if (!line.current || !from || !to) return;
    const geometry = line.current.geometry;
    const buffer = (
      geometry.getAttribute("instanceStart") as InterleavedBufferAttribute
    ).data;
    let changed = false;
    // LineGeometry.setPositions allocates GPU attributes. Reuse its two-endpoint buffer.
    for (let i = 0; i < 6; i++) {
      const value = Math.fround(i < 3 ? from.point[i] : to.point[i - 3]);
      if (buffer.array[i] !== value) {
        buffer.array[i] = value;
        changed = true;
      }
    }
    if (changed) {
      buffer.needsUpdate = true;
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
    }
    line.current.material.color.set(to.color);
    line.current.material.opacity = 0.4 * Math.min(from.opacity, to.opacity);
  });
  return (
    <Line
      ref={line}
      points={[a.point, b.point]}
      color={b.color}
      transparent
      opacity={0.4}
      lineWidth={1}
    />
  );
}

function SpaceScene({
  nodes,
  viewport,
  selectedId,
  neighbours,
  highlightedIds,
  activeGroup,
  clusterSelected,
  labels,
  hulls,
  axes,
  onSelect,
  onClusterHover,
  onProjectHover,
  onClusterSelect,
  onInteraction,
}: {
  nodes: SpaceNode[];
  viewport: RefObject<SpaceViewport>;
  selectedId: string;
  neighbours: string[];
  highlightedIds: string[];
  activeGroup: number;
  clusterSelected: boolean;
  labels: boolean;
  hulls: boolean;
  axes: AxisDescription[];
  onSelect: (id: string) => void;
  onClusterHover: (group: number | null) => void;
  onProjectHover: (id: string | null) => void;
  onClusterSelect: (index: number) => void;
  onInteraction: (active: boolean) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const hoverProject = (id: string | null) => {
    setHovered(id);
    onProjectHover(id);
    if (id) onClusterHover(null);
  };
  const reducedMotion = useReducedMotion();
  const invalidate = useThree((state) => state.invalidate);
  const camera = useThree((state) => state.camera);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const [initialTarget] = useState(() => viewport.current.orbit.target);
  const targets = useMemo<MovingNode[]>(() => {
    // A uniform scale preserves the geometry, including relative axis variance.
    const extent = Math.max(0.01, ...nodes.flatMap((n) => n.xyz.map(Math.abs)));
    return nodes.map((node) => ({
      ...node,
      point: node.xyz.map((n) => (n / extent) * 3.4) as Point,
      opacity: 1,
    }));
  }, [nodes]);
  const [points, setPoints] = useState(targets);
  const positions = useRef(new Map(targets.map((n) => [n.id, n])));
  const objects = useRef(new Map<string, Group>());
  const motion = useRef({ from: targets, to: targets, started: 0, done: true });
  useLayoutEffect(() => {
    if (motion.current.to === targets && !reducedMotion) return;
    const from = [...positions.current.values()];
    const initial = interpolateSpaceNodes(from, targets, reducedMotion ? 1 : 0);
    positions.current = new Map(initial.map((n) => [n.id, n]));
    motion.current = {
      from,
      to: targets,
      started: performance.now(),
      done: reducedMotion,
    };
    setPoints(initial);
    invalidate();
  }, [targets, reducedMotion, invalidate]);
  useFrame(() => {
    const animation = motion.current;
    if (!animation.done) {
      const t = Math.min(
        1,
        (performance.now() - animation.started) / SPACE_TRANSITION_MS,
      );
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const frame = interpolateSpaceNodes(animation.from, animation.to, eased);
      positions.current = new Map(frame.map((n) => [n.id, n]));
      if (t < 1) invalidate();
      else {
        animation.done = true;
        setPoints(animation.to);
      }
    }
    for (const [id, group] of objects.current) {
      const node = positions.current.get(id);
      if (!node) {
        group.visible = false;
        continue;
      }
      group.visible = node.opacity > 0.01;
      group.position.set(...node.point);
      group.traverse((object) => {
        const material = (object as Mesh).material as
          MeshBasicMaterial | undefined;
        if (!material || Array.isArray(material)) return;
        const isPoint = object.userData.projectPoint;
        material.opacity =
          node.opacity *
          (!highlightedIds.length ||
          highlightedIds.includes(id) ||
          hovered === id
            ? 1
            : clusterSelected
              ? 0.16
              : isPoint
                ? 0.38
                : 0.6);
        if (isPoint) material.color.set(node.color);
      });
    }
  }, -1);
  const clusters = useMemo(
    () =>
      [...new Set(points.map((node) => node.group))]
        .filter((group) => group >= 0)
        .map((group) => ({
          group,
          nodes: points.filter((node) => node.group === group),
        })),
    [points],
  );
  const origin = points.find((n) => n.id === selectedId);
  const near = new Set(neighbours);
  return (
    <>
      <gridHelper
        args={[8, 16, "#333333", "#202020"]}
        position={[0, -3.6, 0]}
      />
      {hulls &&
        clusters.map((cluster) => (
          <ClusterEnvelope
            key={cluster.group}
            nodes={cluster.nodes}
            positions={positions}
            active={cluster.group === activeGroup}
            dimmed={clusterSelected && cluster.group !== activeGroup}
            onHover={(hovered) =>
              onClusterHover(hovered ? cluster.group : null)
            }
            onSelect={() => onClusterSelect(cluster.group)}
          />
        ))}
      <mesh>
        <boxGeometry args={[7.2, 7.2, 7.2]} />
        <meshBasicMaterial
          color="#333333"
          wireframe
          transparent
          opacity={0.28}
        />
      </mesh>
      {([0, 1, 2] as const).map((axis) => {
        const from: Point = [0, 0, 0],
          to: Point = [0, 0, 0];
        from[axis] = -3.6;
        to[axis] = 3.6;
        return (
          <group key={axis}>
            <Line
              points={[from, to]}
              color="#525252"
              transparent
              opacity={0.45}
              lineWidth={0.8}
              dashed
              dashSize={0.06}
              gapSize={0.09}
            />
            <SpaceLabel
              text={
                axes[axis]?.label ??
                `${axisEndLabel(axes[axis]?.positive ?? null)} (+${"XYZ"[axis]})`
              }
              position={to}
              height={0.17}
            />
            <SpaceLabel
              text={
                axes[axis]?.label
                  ? `−${"XYZ"[axis]}`
                  : `${axisEndLabel(axes[axis]?.negative ?? null)} (−${"XYZ"[axis]})`
              }
              position={from}
              height={0.17}
            />
          </group>
        );
      })}
      {origin &&
        points
          .filter((n) => near.has(n.id))
          .map((node) => (
            <MovingConnection
              key={node.id}
              a={origin}
              b={node}
              positions={positions}
            />
          ))}
      {points.map((node) => {
        const selected = node.id === selectedId;
        const active =
          !highlightedIds.length ||
          highlightedIds.includes(node.id) ||
          hovered === node.id;
        const radius = node.diameter / 200;
        return (
          <group
            key={node.id}
            position={node.point}
            ref={(group) => {
              if (group) objects.current.set(node.id, group);
              else objects.current.delete(node.id);
            }}
          >
            <mesh
              userData={{ projectPoint: true, pickPriority: 2 }}
              onPointerOut={() => hoverProject(null)}
              onClick={(e) => {
                e.stopPropagation();
                if (e.delta > 4) return;
                onSelect(node.id);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                hoverProject(node.id);
              }}
              onPointerMove={(event) => {
                event.stopPropagation();
                if (!event.buttons && event.pointerType !== "touch")
                  hoverProject(node.id);
              }}
            >
              <sphereGeometry args={[radius, 16, 12]} />
              <meshBasicMaterial
                color={node.color}
                transparent
                opacity={active ? 1 : clusterSelected ? 0.16 : 0.38}
              />
            </mesh>
            {selected && (
              <Billboard>
                <mesh position={[0, 0, radius + 0.005]}>
                  <circleGeometry args={[radius * 0.3, 24]} />
                  <meshBasicMaterial color="#ffffff" transparent />
                </mesh>
                <mesh>
                  <ringGeometry args={[radius + 0.04, radius + 0.055, 48]} />
                  <meshBasicMaterial
                    color="#ffffff"
                    transparent
                    opacity={0.95}
                  />
                </mesh>
              </Billboard>
            )}
            {(labels ||
              selected ||
              near.has(node.id) ||
              hovered === node.id) && (
              <SpaceLabel
                text={node.name}
                position={[0, radius + 0.07, 0]}
                selected={selected}
                onSelect={() => onSelect(node.id)}
                onHover={(active) => {
                  hoverProject(active ? node.id : null);
                }}
              />
            )}
          </group>
        );
      })}
      <OrbitControls
        ref={controls}
        target={initialTarget}
        onStart={() => {
          onInteraction(true);
        }}
        onEnd={() => onInteraction(false)}
        onChange={() => {
          if (controls.current)
            viewport.current.orbit = {
              position: camera.position.toArray() as Point,
              target: controls.current.target.toArray() as Point,
            };
        }}
        makeDefault
        enableDamping
        dampingFactor={0.12}
        minDistance={4}
        maxDistance={22}
        zoomSpeed={0.65}
      />
    </>
  );
}

export default function SemanticSpace3D(
  props: Omit<
    ComponentProps<typeof SpaceScene>,
    "onClusterHover" | "onProjectHover" | "onInteraction"
  > & {
    groups: SpaceConnections["groups"];
  },
) {
  const interacting = useRef(false);
  const pointerStart = useRef<[number, number] | null>(null);
  const dragged = useRef(false);
  const [hideTooltip, setHideTooltip] = useState(false);
  const [corner, setCorner] =
    useState<ReturnType<typeof tooltipCorner>>("top-right");
  const [hoveredCluster, setHoveredCluster] = useState<{
    index: number;
    nodes: SpaceNode[];
  } | null>(null);
  const [hoveredProject, setHoveredProject] = useState<{
    id: string;
    nodes: SpaceNode[];
  } | null>(null);
  const dismissedProject = useRef<string | null>(null);
  const dismissedCluster = useRef<number | null>(null);
  useEffect(() => {
    dismissedCluster.current = null;
    dismissedProject.current = null;
  }, [props.nodes, props.hulls]);
  const projectPreview =
    hoveredProject?.nodes === props.nodes
      ? props.nodes.find((node) => node.id === hoveredProject.id)?.hover
      : undefined;
  const preview =
    !projectPreview && props.hulls && hoveredCluster?.nodes === props.nodes
      ? props.groups.find((group) => group.index === hoveredCluster.index)
      : undefined;
  useEffect(() => {
    if (!preview && !projectPreview) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismissedCluster.current = preview?.index ?? null;
        dismissedProject.current = hoveredProject?.id ?? null;
        setHoveredCluster(null);
        setHoveredProject(null);
      }
    };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [preview, projectPreview, hoveredProject]);
  const [camera] = useState(() => ({
    position: props.viewport.current.orbit.position,
    fov: 44,
  }));
  return (
    <div
      className="vs-space-3d"
      data-tooltip-corner={corner}
      onPointerDownCapture={(event) => {
        pointerStart.current = [event.clientX, event.clientY];
        dragged.current = false;
      }}
      onPointerMoveCapture={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        setCorner(
          tooltipCorner(
            [event.clientX - bounds.left, event.clientY - bounds.top],
            [bounds.width, bounds.height],
          ),
        );
        if (
          event.buttons &&
          pointerStart.current &&
          Math.hypot(
            event.clientX - pointerStart.current[0],
            event.clientY - pointerStart.current[1],
          ) > 4
        )
          dragged.current = true;
      }}
      onPointerCancel={() => {
        interacting.current = false;
        setHideTooltip(false);
        setHoveredCluster(null);
        setHoveredProject(null);
      }}
      onPointerLeave={() => {
        setHoveredCluster(null);
        setHoveredProject(null);
      }}
    >
      <Canvas
        camera={camera}
        dpr={[1, 1.5]}
        frameloop="demand"
        gl={{ antialias: true, alpha: true }}
        events={(state) => ({
          ...events(state),
          filter: prioritizeSpaceHits,
        })}
      >
        <SpaceScene
          {...props}
          activeGroup={preview?.index ?? props.activeGroup}
          highlightedIds={preview?.ids ?? props.highlightedIds}
          onInteraction={(active) => {
            // OrbitControls starts on mouse-down, before a click can commit.
            // Hide cards without reverting the new hover to the old selection.
            interacting.current = active;
            if (!active && dragged.current) {
              setHoveredCluster(null);
              setHoveredProject(null);
            }
            setHideTooltip(active);
          }}
          onProjectHover={(id) => {
            if (interacting.current) return;
            if (id === null) {
              dismissedProject.current = null;
              setHoveredProject(null);
            } else if (id !== dismissedProject.current) {
              setHoveredProject((current) =>
                current?.id === id && current.nodes === props.nodes
                  ? current
                  : { id, nodes: props.nodes },
              );
            }
          }}
          onClusterHover={(index) => {
            if (interacting.current) return;
            setHoveredCluster((current) => {
              if (index === null) {
                dismissedCluster.current = null;
                return null;
              }
              if (index === dismissedCluster.current) return null;
              return current?.index === index && current.nodes === props.nodes
                ? current
                : { index, nodes: props.nodes };
            });
          }}
        />
      </Canvas>
      {!hideTooltip &&
        (projectPreview ? (
          <SpaceProjectTooltip details={projectPreview} />
        ) : (
          preview && (
            <SpaceClusterTooltip
              group={preview}
              className="vs-spatial-tooltip"
            />
          )
        ))}
    </div>
  );
}
