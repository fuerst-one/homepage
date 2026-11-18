"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Billboard, OrbitControls } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace, Vector3 } from "three";
import { ConvexGeometry } from "three/addons/geometries/ConvexGeometry.js";
import type { LandscapeProps } from "./WorkLandscapePlot";
import { paddedPoints3d } from "./clusterHulls";

// Reuses the lab's enclosing geometry and canvas-label approach. Named regions
// replace inferred axes; the caller's text list provides equivalent navigation.
function Label({
  text,
  position,
  color = "#e8e6dd",
}: {
  text: string;
  position: [number, number, number];
  color?: string;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas"),
      ctx = canvas.getContext("2d")!;
    ctx.font = "24px monospace";
    canvas.width = Math.ceil(ctx.measureText(text).width) + 24;
    canvas.height = 42;
    ctx.font = "24px monospace";
    ctx.fillStyle = "#141412";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    ctx.textBaseline = "middle";
    ctx.fillText(text, 12, 22);
    const value = new CanvasTexture(canvas);
    value.colorSpace = SRGBColorSpace;
    return value;
  }, [text, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <Billboard position={position}>
      <sprite scale={[(texture.image.width / 42) * 0.14, 0.14, 1]}>
        <spriteMaterial
          map={texture}
          transparent
          depthTest={false}
          depthWrite={false}
        />
      </sprite>
    </Billboard>
  );
}
function Envelope({ points, color }: { points: number[][]; color: string }) {
  const geometry = useMemo(
    () =>
      new ConvexGeometry(
        paddedPoints3d(points, 0.1).map((p) => new Vector3(...p)),
      ),
    [points],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} raycast={() => undefined}>
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.065}
        depthWrite={false}
      />
    </mesh>
  );
}
function CameraFit() {
  const { camera, size, invalidate } = useThree();
  useLayoutEffect(() => {
    camera.position.set(0, 0, Math.max(7.3, 5.1 / (size.width / size.height)));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, invalidate]);
  return null;
}
export default function WorkLandscape3D({
  projects,
  points,
  groups,
  selectedId,
  matchingIds,
  onSelect,
}: LandscapeProps) {
  const byId = new Map(projects.map((p) => [p.id, p]));
  const active = new Set(matchingIds);
  const selected = points.find((p) => p.id === selectedId);
  const clouds = useMemo(
    () =>
      groups.flatMap((g) => {
        const members = points.filter((p) => p.group === g.id);
        return members.length
          ? [
              {
                group: g,
                points: members.map((p) => p.position),
                center: members[0].center,
              },
            ]
          : [];
      }),
    [groups, points],
  );
  return (
    <Canvas
      aria-hidden="true"
      frameloop="demand"
      camera={{ position: [0, 0, 7.3], fov: 42 }}
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true }}
    >
      <CameraFit />
      <OrbitControls
        enablePan={false}
        enableDamping
        minDistance={4}
        maxDistance={18}
      />
      {clouds.map((c) => (
        <group key={c.group.id}>
          <Envelope points={c.points} color={c.group.color} />
          <Label
            text={c.group.label}
            color={c.group.color}
            position={[c.center[0], c.center[1] + 0.7, c.center[2]]}
          />
        </group>
      ))}
      {points.map((p) => (
        <group key={p.id} position={p.position}>
          <mesh
            onClick={(e) => {
              e.stopPropagation();
              onSelect(p.id);
            }}
          >
            <sphereGeometry args={[0.11, 12, 10]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
          <mesh raycast={() => undefined}>
            <sphereGeometry
              args={[p.id === selectedId ? 0.085 : 0.052, 16, 12]}
            />
            <meshBasicMaterial
              color={p.id === selectedId ? "#ffffff" : p.color}
              transparent
              opacity={active.has(p.id) ? 1 : 0.16}
            />
          </mesh>
        </group>
      ))}
      {selected && (
        <Label
          text={byId.get(selectedId)?.label ?? ""}
          position={[
            selected.position[0],
            selected.position[1] - 0.22,
            selected.position[2],
          ]}
        />
      )}
    </Canvas>
  );
}
