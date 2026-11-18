"use client";

import type { ComponentProps } from "react";
import LandingShape from "../PlasmaLanding/LandingShape";
import { createHandCursorGeometry } from "./handCursorGeometry";

/** Keep the service geometry in the deferred renderer chunk. */
export default function ServiceHeroShape(
  props: Omit<ComponentProps<typeof LandingShape>, "geometryFactory">,
) {
  return (
    <LandingShape
      {...props}
      geometryFactory={
        props.shapeIndex === 0 ? createHandCursorGeometry : undefined
      }
    />
  );
}
