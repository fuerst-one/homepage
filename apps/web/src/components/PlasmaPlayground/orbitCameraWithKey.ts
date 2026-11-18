import { Spherical, type PerspectiveCamera } from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/** Rotate through public camera APIs, leaving ordinary arrow keys to the page. */
export function orbitCameraWithKey(
  camera: PerspectiveCamera,
  controls: OrbitControls,
  event: Pick<KeyboardEvent, "key" | "shiftKey">,
  viewportHeight: number,
) {
  if (
    !event.shiftKey ||
    !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
  )
    return false;
  const offset = camera.position.clone().sub(controls.target);
  const orbit = new Spherical().setFromVector3(offset);
  const angle =
    (Math.PI * 2 * controls.keyRotateSpeed) / Math.max(1, viewportHeight);
  if (event.key === "ArrowUp") orbit.phi -= angle;
  if (event.key === "ArrowDown") orbit.phi += angle;
  if (event.key === "ArrowLeft") orbit.theta -= angle;
  if (event.key === "ArrowRight") orbit.theta += angle;
  orbit.phi = Math.max(
    controls.minPolarAngle,
    Math.min(controls.maxPolarAngle, orbit.phi),
  );
  orbit.theta = Math.max(
    controls.minAzimuthAngle,
    Math.min(controls.maxAzimuthAngle, orbit.theta),
  );
  orbit.makeSafe();
  camera.position.copy(controls.target).add(offset.setFromSpherical(orbit));
  controls.update();
  return true;
}
